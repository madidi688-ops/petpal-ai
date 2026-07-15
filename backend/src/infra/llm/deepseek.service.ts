import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string };

@Injectable()
export class DeepseekService {
  private readonly logger = new Logger(DeepseekService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('deepseek.apiKey') ?? '';
    const baseURL = config.get<string>('deepseek.baseUrl') ?? 'https://api.deepseek.com';
    this.model = config.get<string>('deepseek.model') ?? 'deepseek-chat';

    if (!apiKey || apiKey.includes('please-replace')) {
      this.client = null;
      this.logger.warn('DEEPSEEK_API_KEY not set — LLM calls will use mock responses');
    } else {
      this.client = new OpenAI({ apiKey, baseURL });
    }
  }

  async chat(messages: ChatTurn[], options?: { temperature?: number; maxTokens?: number }) {
    if (!this.client) {
      return this.mockReply(messages);
    }

    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 600,
      });
      const content = res.choices[0]?.message?.content ?? '';
      const tokensUsed = res.usage?.total_tokens ?? null;
      return { content, tokensUsed };
    } catch (err) {
      this.logger.error('DeepSeek API error', err instanceof Error ? err.stack : String(err));
      throw new ServiceUnavailableException({
        error: 'LLM_ERROR',
        message: 'DeepSeek API call failed',
      });
    }
  }

  async chatJson<T>(messages: ChatTurn[], options?: { temperature?: number; maxTokens?: number }): Promise<{ data: T; tokensUsed: number | null }> {
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

    const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
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
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const content = `（演示模式：未配置 DEEPSEEK_API_KEY）喵～我听到了：「${lastUser.slice(0, 80)}」。配上 API Key 后就能真正对话啦。`;
    return { content, tokensUsed: 0 };
  }
}
