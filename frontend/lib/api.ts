import type { AuthUser } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

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

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !body.ok) {
    const message =
      !body.ok && body.error?.message ? body.error.message : `Request failed (${res.status})`;
    throw new Error(message);
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
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const body = (await res.json()) as ApiResponse<{ url: string; filename: string }>;
  if (!res.ok || !body.ok) throw new Error('Upload failed');
  return body.data;
}
