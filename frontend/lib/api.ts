import type { AuthUser, ChatMessage, EmotionLog } from './types';
import { friendlyError } from './friendly-error';

declare global {
  interface Window {
    __PETPAL_API_BASE__?: string;
  }
}

function resolveApiBase() {
  if (typeof window !== 'undefined' && window.__PETPAL_API_BASE__) {
    return window.__PETPAL_API_BASE__.replace(/\/$/, '');
  }
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  if (fromEnv) {
    const s = fromEnv.trim();
    if (s.startsWith('http://') || s.startsWith('https://')) return s.replace(/\/$/, '');
    return `https://${s.replace(/\/$/, '')}`;
  }
  return 'http://localhost:4001';
}

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string } };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('petpal_token');
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('petpal_token', token);
  else localStorage.removeItem('petpal_token');
}

export function apiUrl(path: string) {
  if (path.startsWith('http')) return path;
  const base = resolveApiBase();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...options,
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
    });
  } catch (err) {
    throw new Error(friendlyError(err instanceof Error ? err.message : '网络错误'));
  }

  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !body.ok) {
    const message =
      !body.ok && body.error?.message ? body.error.message : `Request failed (${res.status})`;
    throw new Error(friendlyError(message));
  }
  return body.data;
}

export async function login(email: string, password: string) {
  const data = await api<{ accessToken: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    json: { email, password },
  });
  setToken(data.accessToken);
  return data;
}

export async function register(email: string, password: string, name?: string) {
  const data = await api<{ accessToken: string; user: AuthUser }>('/auth/register', {
    method: 'POST',
    json: { email, password, name },
  });
  setToken(data.accessToken);
  return data;
}

export async function uploadFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  const token = getToken();
  const res = await fetch(apiUrl('/upload'), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  let body: ApiResponse<{
    url: string;
    filename: string;
    mimeType?: string;
    kind?: 'image' | 'audio' | 'video';
  }>;
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new Error(friendlyError(`上传失败（HTTP ${res.status}）`));
  }
  if (!res.ok || !body.ok) {
    const message =
      !body.ok && body.error?.message ? body.error.message : `上传失败（HTTP ${res.status}）`;
    throw new Error(friendlyError(message));
  }
  return body.data;
}

export type StreamChatHandlers = {
  onMeta?: (data: { sessionId: string }) => void;
  onDelta?: (data: { content: string }) => void;
  onDone?: (data: {
    sessionId: string;
    message: ChatMessage;
    emotion: EmotionLog;
  }) => void;
  onError?: (message: string) => void;
};

/** POST /pets/:id/chat/stream — SSE（meta / delta / done / error） */
export async function streamChat(
  petId: string,
  body: {
    content?: string;
    sessionId?: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
  },
  handlers: StreamChatHandlers,
) {
  const token = getToken();
  const res = await fetch(apiUrl(`/pets/${petId}/chat/stream`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    let message = `对话失败（HTTP ${res.status}）`;
    try {
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!body.ok && body.error?.message) message = body.error.message;
    } catch {
      // ignore
    }
    if (res.status === 401) message = '登录已过期，请重新登录';
    throw new Error(friendlyError(message));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const lines = part.split('\n');
      let event = 'message';
      let dataLine = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        const data = JSON.parse(dataLine) as Record<string, unknown>;
        if (event === 'meta') handlers.onMeta?.(data as { sessionId: string });
        else if (event === 'delta') handlers.onDelta?.(data as { content: string });
        else if (event === 'done')
          handlers.onDone?.(
            data as {
              sessionId: string;
              message: ChatMessage;
              emotion: EmotionLog;
            },
          );
        else if (event === 'error')
          handlers.onError?.(
            friendlyError(String((data as { message?: string }).message ?? '稍后再试')),
          );
      } catch {
        // ignore partial JSON
      }
    }
  }
}
