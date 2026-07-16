import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatTurn, ChatOptions } from './deepseek.service';

type ArkContentPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string }
  | { type: 'input_video'; video_url?: string; file_id?: string; fps?: number }
  | {
      type: 'input_audio';
      audio_url?: string;
      file_id?: string;
    };

type ArkInputMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string | ArkContentPart[];
};

@Injectable()
export class SeedanceService {
  private readonly logger = new Logger(SeedanceService.name);
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly model: string;
  private readonly audioModel: string;
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('seedance.apiKey') ?? '';
    // 允许写成 .../api/v3 或带 /responses；统一成 .../api/v3
    const raw = (config.get<string>('seedance.baseUrl') ?? '').replace(/\/$/, '');
    this.baseURL = raw.replace(/\/responses$/i, '');
    this.model = config.get<string>('seedance.model') ?? 'doubao-seed-2-1-pro-260628';
    this.audioModel = (config.get<string>('seedance.audioModel') ?? '').trim();

    this.configured = Boolean(
      this.apiKey &&
        !this.apiKey.includes('please-replace') &&
        this.baseURL,
    );

    if (!this.configured) {
      this.logger.warn(
        'ARK/SEEDANCE key or base URL not set — multimodal chats will use mock responses',
      );
    } else {
      this.logger.log(`Ark Responses multimodal: ${this.model} @ ${this.baseURL}/responses`);
      if (this.audioModel) {
        this.logger.log(`Ark audio endpoint: ${this.audioModel}`);
      }
    }
  }

  isConfigured() {
    return this.configured;
  }

  /** 上传本地文件到方舟 Files API，供视频理解使用 file_id */
  async uploadFile(
    filePath: string,
    filename: string,
    mime: string,
    opts?: { fps?: number },
  ): Promise<string> {
    if (!this.configured) {
      throw new ServiceUnavailableException({
        error: 'LLM_ERROR',
        message: 'Ark API not configured',
      });
    }

    const { readFile } = await import('fs/promises');
    const buf = await readFile(filePath);
    const form = new FormData();
    form.append('purpose', 'user_data');
    const bytes = new Uint8Array(buf);
    form.append('file', new Blob([bytes], { type: mime }), filename);
    if (mime.startsWith('video/') && opts?.fps != null) {
      form.append('preprocess_configs[video][fps]', String(opts.fps));
    }

    const res = await fetch(`${this.baseURL}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    const text = await res.text();
    let data: {
      id?: string;
      status?: string;
      error?: { message?: string };
      message?: string;
    };
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Ark Files non-JSON (${res.status}): ${text.slice(0, 200)}`);
    }
    if (!res.ok || !data.id) {
      throw new Error(data.error?.message || data.message || `Ark Files HTTP ${res.status}`);
    }
    this.logger.log(`Ark file uploaded: ${data.id} status=${data.status ?? 'n/a'} (${filename})`);
    await this.waitUntilFileReady(data.id);
    return data.id;
  }

  /** 视频预处理会短暂处于 processing，就绪后再用于 Responses */
  private async waitUntilFileReady(fileId: string, timeoutMs = 120_000) {
    const started = Date.now();
    let delay = 1500;
    while (Date.now() - started < timeoutMs) {
      const info = await this.getFile(fileId);
      const status = (info.status || '').toLowerCase();
      this.logger.log(`Ark file ${fileId} status=${status || 'unknown'}`);

      if (status === 'failed' || status === 'error' || status === 'cancelled') {
        throw new Error(`Ark file ${fileId} failed: ${status}`);
      }

      // 无 status 字段时视为可立刻使用（部分接口如此）
      if (!status) return;

      if (
        status === 'active' ||
        status === 'processed' ||
        status === 'succeeded' ||
        status === 'success' ||
        status === 'ready'
      ) {
        return;
      }

      // processing / pending / running → 继续等
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay + 500, 4000);
    }
    throw new Error(`Ark file ${fileId} still processing after ${timeoutMs}ms`);
  }

  private async getFile(fileId: string): Promise<{ id?: string; status?: string }> {
    const res = await fetch(`${this.baseURL}/files/${encodeURIComponent(fileId)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const text = await res.text();
    let data: { id?: string; status?: string; error?: { message?: string }; message?: string };
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Ark get file non-JSON (${res.status}): ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || `Ark get file HTTP ${res.status}`);
    }
    return data;
  }

  async chat(messages: ChatTurn[], options?: ChatOptions) {
    if (!this.configured) {
      return this.mockReply(messages);
    }

    try {
      const body = this.buildRequestBody(messages, options, false);
      const data = await this.postResponses(body);
      const content = this.extractText(data);
      const tokensUsed =
        (data as { usage?: { total_tokens?: number } })?.usage?.total_tokens ?? null;
      return { content, tokensUsed };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`Ark Responses error: ${detail}`, err instanceof Error ? err.stack : undefined);
      if (detail.includes('content type is not supported') && this.messagesHaveAudio(messages)) {
        throw new ServiceUnavailableException({
          error: 'LLM_ERROR',
          message:
            '当前方舟接入点不支持音频理解（图文/视频正常）。请在火山方舟开通 Doubao-Seed-2.0-Lite，创建接入点后于 backend/.env 配置 ARK_AUDIO_MODEL=ep-xxx 并重启后端。',
        });
      }
      throw new ServiceUnavailableException({
        error: 'LLM_ERROR',
        message: this.friendlyLlmError(detail),
      });
    }
  }

  async *chatStream(
    messages: ChatTurn[],
    options?: ChatOptions,
  ): AsyncGenerator<{ delta: string; done?: boolean; tokensUsed?: number | null }> {
    if (!this.configured) {
      const { content } = this.mockReply(messages);
      for (const ch of content) {
        yield { delta: ch };
        await new Promise((r) => setTimeout(r, 8));
      }
      yield { delta: '', done: true, tokensUsed: 0 };
      return;
    }

    try {
      // Responses API 流式事件因厂商差异较大：先完整请求再模拟逐字，保证稳定
      const { content, tokensUsed } = await this.chat(messages, options);
      const step = Math.max(1, Math.floor(content.length / 40));
      for (let i = 0; i < content.length; i += step) {
        yield { delta: content.slice(i, i + step) };
        await new Promise((r) => setTimeout(r, 12));
      }
      yield { delta: '', done: true, tokensUsed };
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`Ark Responses stream error: ${detail}`, err instanceof Error ? err.stack : undefined);
      throw new ServiceUnavailableException({
        error: 'LLM_ERROR',
        message: this.friendlyLlmError(detail),
      });
    }
  }

  private friendlyLlmError(detail: string) {
    const d = detail.toLowerCase();
    if (d.includes('401') || d.includes('unauthorized') || d.includes('invalid api key') || d.includes('authentication')) {
      return '方舟 API Key 无效或未配置，请检查 backend/.env 中的 ARK_API_KEY';
    }
    if (d.includes('429') || d.includes('rate limit') || d.includes('too many')) {
      return '方舟请求过于频繁，请稍后再试';
    }
    if (d.includes('timeout') || d.includes('etimedout') || d.includes('timed out') || d.includes('abort')) {
      return '方舟响应超时，请换更短的视频/音频后重试';
    }
    if (d.includes('does not exist') || d.includes('not activated') || d.includes('not access')) {
      return '方舟模型/接入点不可用，请检查 ARK_MODEL / ARK_AUDIO_MODEL 是否已开通';
    }
    return detail || '方舟多模态调用失败';
  }

  private buildRequestBody(messages: ChatTurn[], options?: ChatOptions, stream = false) {
    let instructions = '';
    const input: ArkInputMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        const text =
          typeof msg.content === 'string'
            ? msg.content
            : msg.content
                .filter((p) => p.type === 'text')
                .map((p) => (p as { text: string }).text)
                .join('\n');
        instructions = instructions ? `${instructions}\n${text}` : text;
        continue;
      }

      input.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: this.toArkContent(msg.content),
      });
    }

    return {
      model: this.pickModel(messages),
      ...(instructions ? { instructions } : {}),
      input,
      temperature: options?.temperature ?? 0.7,
      max_output_tokens: options?.maxTokens ?? 600,
      // 聊天场景关掉深度思考，避免只有 reasoning、正文为空
      thinking: { type: 'disabled' },
      stream,
    };
  }

  private toArkContent(content: ChatTurn['content']): string | ArkContentPart[] {
    if (typeof content === 'string') return content;

    const parts: ArkContentPart[] = [];
    for (const part of content) {
      if (part.type === 'text') {
        parts.push({ type: 'input_text', text: part.text });
      } else if (part.type === 'image_url') {
        const url =
          typeof part.image_url === 'string'
            ? part.image_url
            : (part.image_url as { url?: string })?.url;
        if (url) parts.push({ type: 'input_image', image_url: url });
      } else if ((part as { type?: string }).type === 'video_url') {
        const v = part as unknown as {
          video_url?: { url?: string; file_id?: string; fps?: number } | string;
          file_id?: string;
          fps?: number;
        };
        if (typeof v.video_url === 'object' && v.video_url?.file_id) {
          parts.push({
            type: 'input_video',
            file_id: v.video_url.file_id,
            fps: v.video_url.fps ?? 1,
          });
        } else {
          const url = typeof v.video_url === 'string' ? v.video_url : v.video_url?.url;
          if (v.file_id) {
            parts.push({ type: 'input_video', file_id: v.file_id, fps: v.fps ?? 1 });
          } else if (url) {
            parts.push({ type: 'input_video', video_url: url, fps: v.fps ?? 1 });
          }
        }
      } else if ((part as { type?: string }).type === 'input_audio') {
        const a = part as unknown as {
          audio_url?: string;
          file_id?: string;
          input_audio?: { url?: string; file_id?: string };
        };
        // 官方格式：{ type: "input_audio", audio_url: "..." }
        if (a.audio_url) {
          parts.push({ type: 'input_audio', audio_url: a.audio_url });
        } else if (a.file_id) {
          parts.push({ type: 'input_audio', file_id: a.file_id });
        } else if (a.input_audio?.url) {
          parts.push({ type: 'input_audio', audio_url: a.input_audio.url });
        } else if (a.input_audio?.file_id) {
          parts.push({ type: 'input_audio', file_id: a.input_audio.file_id });
        }
      }
    }
    return parts.length ? parts : '';
  }

  private async postResponses(body: Record<string, unknown>) {
    const url = `${this.baseURL}/responses`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Ark Responses non-JSON (${res.status}): ${text.slice(0, 200)}`);
    }

    if (!res.ok) {
      const errObj = data as { error?: { message?: string }; message?: string };
      throw new Error(
        errObj.error?.message || errObj.message || `Ark Responses HTTP ${res.status}`,
      );
    }
    return data;
  }

  private extractText(data: unknown): string {
    const root = data as {
      status?: string;
      output_text?: string;
      output?: unknown[];
      error?: { message?: string };
    };

    if (root.error?.message) {
      throw new Error(root.error.message);
    }

    if (typeof root.output_text === 'string' && root.output_text.trim()) {
      return root.output_text.trim();
    }

    const messageTexts: string[] = [];
    const reasoningTexts: string[] = [];

    for (const item of root.output ?? []) {
      if (!item || typeof item !== 'object') continue;
      const node = item as {
        type?: string;
        content?: unknown;
        summary?: unknown;
        text?: string;
      };

      // 优先收集正式回复
      if (node.type === 'message' || !node.type) {
        messageTexts.push(...this.collectTextLeaves(node.content));
        if (typeof node.text === 'string') messageTexts.push(node.text);
      }

      // reasoning / summary 作兜底
      if (node.type === 'reasoning' || node.type === 'summary') {
        reasoningTexts.push(...this.collectTextLeaves(node.summary ?? node.content));
      }
    }

    const primary = messageTexts.join('').trim();
    if (primary) return primary;

    const fallback = reasoningTexts.join('').trim();
    if (fallback) return fallback;

    // 最后兜底：只扫 output 树
    const any = this.collectTextLeaves(root.output)
      .filter((t) => t.trim().length > 0)
      .join('\n')
      .trim();
    if (any) return any;

    const types = (root.output ?? [])
      .map((o) => (o && typeof o === 'object' ? (o as { type?: string }).type : typeof o))
      .join(',');
    this.logger.warn(
      `Ark empty text parse: status=${root.status ?? 'n/a'} outputTypes=[${types}] sample=${JSON.stringify(data).slice(0, 800)}`,
    );
    throw new Error('Ark Responses returned empty text');
  }

  /** 递归收集 content / summary 里的 text 字段 */
  private collectTextLeaves(node: unknown): string[] {
    const out: string[] = [];
    const walk = (v: unknown) => {
      if (v == null) return;
      if (typeof v === 'string') return;
      if (Array.isArray(v)) {
        for (const x of v) walk(x);
        return;
      }
      if (typeof v !== 'object') return;
      const obj = v as Record<string, unknown>;
      const typ = typeof obj.type === 'string' ? obj.type : '';
      // 跳过明显的非回答字段
      if (typ === 'refusal') return;
      if (typeof obj.text === 'string' && obj.text.trim()) {
        // output_text / text / summary_text 都收
        if (
          !typ ||
          typ === 'output_text' ||
          typ === 'text' ||
          typ === 'summary_text' ||
          typ === 'input_text'
        ) {
          out.push(obj.text);
        }
      }
      for (const [k, child] of Object.entries(obj)) {
        if (k === 'text') continue;
        if (typeof child === 'object') walk(child);
      }
    };
    walk(node);
    return out;
  }

  private pickModel(messages: ChatTurn[]) {
    if (this.audioModel && this.messagesHaveAudio(messages)) {
      return this.audioModel;
    }
    return this.model;
  }

  private messagesHaveAudio(messages: ChatTurn[]) {
    for (const msg of messages) {
      if (!Array.isArray(msg.content)) continue;
      for (const part of msg.content) {
        if ((part as { type?: string }).type === 'input_audio') return true;
      }
    }
    return false;
  }

  private mockReply(messages: ChatTurn[]) {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    let lastUser = '';
    let hasMedia = false;
    if (typeof last?.content === 'string') {
      lastUser = last.content;
    } else if (Array.isArray(last?.content)) {
      for (const part of last.content) {
        if (part.type === 'text') lastUser = part.text;
        if (part.type === 'image_url' || (part as { type?: string }).type === 'input_audio') {
          hasMedia = true;
        }
      }
    }
    const hint = hasMedia ? '我收到你发的多媒体啦，' : '';
    const content = `（演示模式：未配置方舟 Key）${hint}喵～我听到了：「${lastUser.slice(0, 80)}」。`;
    return { content, tokensUsed: 0 };
  }
}
