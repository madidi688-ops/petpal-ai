import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type ChatTurn = {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAI.Chat.ChatCompletionContentPart[];
};

export type ChatOptions = {
  temperature?: number;
  maxTokens?: number;
  /** 有图时走 VL 模型 */
  useVision?: boolean;
};

@Injectable()
export class DeepseekService {
  private readonly logger = new Logger(DeepseekService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;
  private readonly vlModel: string;
  private readonly visionNative: boolean;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('deepseek.apiKey') ?? '';
    const baseURL = config.get<string>('deepseek.baseUrl') ?? 'https://api.deepseek.com';
    this.model = config.get<string>('deepseek.model') ?? 'deepseek-chat';
    this.vlModel = config.get<string>('deepseek.vlModel') ?? 'deepseek-vl';
    this.visionNative = config.get<boolean>('deepseek.visionNative') === true;

    if (!apiKey || apiKey.includes('please-replace')) {
      this.client = null;
      this.logger.warn('DEEPSEEK_API_KEY not set — LLM calls will use mock responses');
    } else {
      this.client = new OpenAI({ apiKey, baseURL });
      if (!this.visionNative) {
        this.logger.log(
          'DeepSeek hosted API is text-only; image chats use text fallback (set DEEPSEEK_VISION_NATIVE=true for real VL endpoints)',
        );
      }
    }
  }

  /** 是否支持真正的 image_url 多模态（官方 DeepSeek API 目前不行） */
  supportsNativeVision() {
    return this.visionNative;
  }

  async chat(messages: ChatTurn[], options?: ChatOptions) {
    if (!this.client) {
      return this.mockReply(messages);
    }

    const model = options?.useVision ? this.vlModel : this.model;

    try {
      const res = await this.client.chat.completions.create({
        model,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 600,
      });
      const content = res.choices[0]?.message?.content ?? '';
      const tokensUsed = res.usage?.total_tokens ?? null;
      return { content, tokensUsed };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`DeepSeek API error: ${detail}`, err instanceof Error ? err.stack : undefined);
      throw new ServiceUnavailableException({
        error: 'LLM_ERROR',
        message: this.friendlyLlmError(detail, 'DeepSeek'),
      });
    }
  }

  async *chatStream(
    messages: ChatTurn[],
    options?: ChatOptions,
  ): AsyncGenerator<{ delta: string; done?: boolean; tokensUsed?: number | null }> {
    if (!this.client) {
      const { content } = this.mockReply(messages);
      for (const ch of content) {
        yield { delta: ch };
        await new Promise((r) => setTimeout(r, 8));
      }
      yield { delta: '', done: true, tokensUsed: 0 };
      return;
    }

    const model = options?.useVision ? this.vlModel : this.model;

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 600,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) yield { delta };
      }
      yield { delta: '', done: true, tokensUsed: null };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`DeepSeek stream error: ${detail}`, err instanceof Error ? err.stack : undefined);
      throw new ServiceUnavailableException({
        error: 'LLM_ERROR',
        message: this.friendlyLlmError(detail, 'DeepSeek'),
      });
    }
  }

  private friendlyLlmError(detail: string, provider: string) {
    const d = detail.toLowerCase();
    if (d.includes('401') || d.includes('unauthorized') || d.includes('invalid api key') || d.includes('authentication')) {
      return `${provider} API Key 无效或未配置，请检查 backend/.env`;
    }
    if (d.includes('429') || d.includes('rate limit') || d.includes('too many')) {
      return `${provider} 请求过于频繁，请稍后再试`;
    }
    if (d.includes('timeout') || d.includes('etimedout') || d.includes('timed out') || d.includes('abort')) {
      return `${provider} 响应超时，请稍后重试`;
    }
    if (d.includes('insufficient') || d.includes('quota') || d.includes('balance')) {
      return `${provider} 额度不足，请到控制台检查账户`;
    }
    return detail || `${provider} 调用失败`;
  }

  async chatJson<T>(
    messages: ChatTurn[],
    options?: ChatOptions,
  ): Promise<{ data: T; tokensUsed: number | null }> {
    const { content, tokensUsed } = await this.chat(
      [
        ...messages,
        {
          role: 'system',
          content: '你必须只输出合法 JSON，不要 markdown 代码块，不要多余解释。',
        },
      ],
      options,
    );

    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return { data: JSON.parse(cleaned) as T, tokensUsed };
    } catch {
      throw new ServiceUnavailableException({
        error: 'LLM_ERROR',
        message: 'Failed to parse LLM JSON response',
      });
    }
  }

  private mockReply(messages: ChatTurn[]) {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    let lastUser = '';
    let hasImage = false;
    if (typeof last?.content === 'string') {
      lastUser = last.content;
    } else if (Array.isArray(last?.content)) {
      for (const part of last.content) {
        if (part.type === 'text') lastUser = part.text;
        if (part.type === 'image_url') hasImage = true;
      }
    }
    const hint = hasImage ? '我看到你发的照片啦，' : '';
    const content = `（演示模式：未配置 DEEPSEEK_API_KEY）${hint}喵～我听到了：「${lastUser.slice(0, 80)}」。配上 API Key 后就能真正对话啦。`;
    return { content, tokensUsed: 0 };
  }
}
