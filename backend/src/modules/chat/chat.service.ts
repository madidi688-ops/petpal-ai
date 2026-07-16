import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import OpenAI from 'openai';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PetsService } from '../pets/pets.service';
import { ChatTurn } from '../../infra/llm/deepseek.service';
import { LlmRouterService } from '../../infra/llm/llm-router.service';
import { RedisService } from '../../infra/redis/redis.service';
import { EmotionService } from '../emotion/emotion.service';
import { SendChatDto } from './dto/send-chat.dto';
import { buildChatSystemPrompt, CHAT_PROMPT_VERSION } from '../../ai/prompts/chat-pet';
import {
  resolveLocalUploadPath,
  resolveUploadDataUrl,
  toAbsoluteUploadUrl,
} from '../../infra/media/media-url.util';

type MemMsg = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly publicBaseUrl: string;

  constructor(
    private prisma: PrismaService,
    private pets: PetsService,
    private llm: LlmRouterService,
    private redis: RedisService,
    private emotion: EmotionService,
    config: ConfigService,
  ) {
    this.publicBaseUrl = config.get<string>('publicBaseUrl') ?? 'http://localhost:4001';
  }

  async listSessions(petId: string, userId: string) {
    await this.pets.getOwned(petId, userId);
    return this.prisma.chatSession.findMany({
      where: { petId, userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  async getSession(petId: string, userId: string, sessionId: string) {
    await this.pets.getOwned(petId, userId);
    return this.prisma.chatSession.findFirst({
      where: { id: sessionId, petId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async deleteSession(petId: string, userId: string, sessionId: string) {
    await this.pets.getOwned(petId, userId);
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, petId, userId },
    });
    if (!session) {
      throw new BadRequestException({
        error: 'NOT_FOUND',
        message: '会话不存在或无权删除',
      });
    }
    await this.prisma.chatSession.delete({ where: { id: sessionId } });
    await this.redis.del(`chat:session:${sessionId}:messages`);
    return { deleted: true };
  }

  async send(petId: string, userId: string, dto: SendChatDto) {
    const prepared = await this.prepareTurn(petId, userId, dto);
    const { content, tokensUsed } = await this.invokeLlm(prepared);
    return this.finalizeTurn(prepared, content, tokensUsed);
  }

  async sendStream(petId: string, userId: string, dto: SendChatDto, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const prepared = await this.prepareTurn(petId, userId, dto);
      writeEvent('meta', {
        sessionId: prepared.sessionId,
        provider: this.llm.providerFor(prepared.media),
      });

      let full = '';
      let tokensUsed: number | null = null;

      for await (const chunk of this.invokeLlmStream(prepared)) {
        if (chunk.delta) {
          full += chunk.delta;
          writeEvent('delta', { content: chunk.delta });
        }
        if (chunk.done) {
          tokensUsed = chunk.tokensUsed ?? null;
        }
      }

      const result = await this.finalizeTurn(prepared, full, tokensUsed);
      writeEvent('done', {
        sessionId: result.sessionId,
        message: result.message,
        emotion: result.emotion,
        promptVersion: result.promptVersion,
        provider: this.llm.providerFor(prepared.media),
      });
      res.end();
    } catch (err) {
      const message =
        err instanceof ServiceUnavailableException || err instanceof BadRequestException
          ? (err.getResponse() as { message?: string })?.message ?? err.message
          : err instanceof Error
            ? err.message
            : 'stream failed';
      writeEvent('error', { message });
      res.end();
    }
  }

  private async prepareTurn(petId: string, userId: string, dto: SendChatDto) {
    const pet = await this.pets.getOwned(petId, userId);
    const hasMedia = Boolean(dto.imageUrl || dto.videoUrl || dto.audioUrl);
    const text =
      (dto.content ?? '').trim() ||
      (dto.imageUrl
        ? '看看这张照片'
        : dto.videoUrl
          ? '看看这个视频里发生了什么'
          : dto.audioUrl
            ? '听听这段声音'
            : '');

    if (!text && !hasMedia) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'content or media is required',
      });
    }

    let sessionId = dto.sessionId;
    if (!sessionId) {
      const session = await this.prisma.chatSession.create({
        data: {
          petId,
          userId,
          title: this.buildSessionTitle(text, {
            imageUrl: dto.imageUrl,
            videoUrl: dto.videoUrl,
            audioUrl: dto.audioUrl,
          }),
        },
      });
      sessionId = session.id;
    }

    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: text,
        imageUrl: dto.imageUrl,
        videoUrl: dto.videoUrl,
        audioUrl: dto.audioUrl,
      },
    });

    const memKey = `chat:session:${sessionId}:messages`;
    const history = (await this.redis.getJson<MemMsg[]>(memKey)) ?? [];
    const recent = history.slice(-10);

    const system = buildChatSystemPrompt(pet);
    const media = {
      imageUrl: dto.imageUrl,
      videoUrl: dto.videoUrl,
      audioUrl: dto.audioUrl,
    };
    const multimodal = this.llm.usesMultimodal(media);

    const userContent = multimodal
      ? await this.buildMultimodalUserContent(text, media)
      : text;

    const llmMessages: ChatTurn[] = [
      { role: 'system', content: system },
      ...recent,
      { role: 'user', content: userContent },
    ];

    return {
      petId,
      sessionId,
      text,
      memKey,
      recent,
      llmMessages,
      multimodal,
      media,
    };
  }

  private buildSessionTitle(
    text: string,
    media: { imageUrl?: string; videoUrl?: string; audioUrl?: string },
  ) {
    const generic =
      /^(看看这张照片|看看这个视频里发生了什么|听听这段声音)(，.*)?$/;
    const meaningful = text.replace(generic, '').trim();
    if (meaningful) return meaningful.slice(0, 30);
    if (media.imageUrl) return '发来一张照片';
    if (media.videoUrl) return '发来一段视频';
    if (media.audioUrl) return '发来一段语音';
    return (text || '新对话').slice(0, 30);
  }

  private async buildMultimodalUserContent(
    text: string,
    media: { imageUrl?: string; videoUrl?: string; audioUrl?: string },
  ): Promise<OpenAI.Chat.ChatCompletionContentPart[]> {
    const parts: OpenAI.Chat.ChatCompletionContentPart[] = [];
    if (text) parts.push({ type: 'text', text });

    // 图片：base64 data URL（已验证可用）
    const image = resolveUploadDataUrl(media.imageUrl, process.cwd());
    if (image) {
      parts.push({ type: 'image_url', image_url: { url: image.dataUrl } });
    }

    // 视频：优先 Files API → file_id；小文件可退回 data URL
    if (media.videoUrl) {
      const videoPart = await this.buildVideoPart(media.videoUrl);
      parts.push(videoPart);
    }

    // 音频：优先 Files API（浏览器 webm 录音也走上传）
    if (media.audioUrl) {
      const audioPart = await this.buildAudioPart(media.audioUrl);
      parts.push(audioPart);
    }

    if (parts.length === 0 || (parts.length === 1 && text && !media.imageUrl && !media.videoUrl && !media.audioUrl)) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'media file could not be resolved',
      });
    }

    return parts;
  }

  private llmOptions(multimodal: boolean) {
    return {
      temperature: 0.85,
      maxTokens: multimodal ? 800 : 200,
    };
  }

  private isAudioUnsupported(err: unknown) {
    const msg =
      err instanceof ServiceUnavailableException
        ? (err.getResponse() as { message?: string })?.message ?? err.message
        : err instanceof Error
          ? err.message
          : String(err);
    return msg.includes('不支持音频理解') || msg.includes('content type is not supported');
  }

  private async invokeLlm(prepared: Awaited<ReturnType<ChatService['prepareTurn']>>) {
    try {
      return await this.llm.chat(
        prepared.llmMessages,
        prepared.media,
        this.llmOptions(prepared.multimodal),
      );
    } catch (err) {
      if (prepared.media.audioUrl && this.isAudioUnsupported(err)) {
        const fallback = await this.buildAudioTextFallback(prepared);
        if (fallback) return fallback;
      }
      throw err;
    }
  }

  private async *invokeLlmStream(prepared: Awaited<ReturnType<ChatService['prepareTurn']>>) {
    try {
      yield* this.llm.chatStream(
        prepared.llmMessages,
        prepared.media,
        this.llmOptions(prepared.multimodal),
      );
    } catch (err) {
      if (prepared.media.audioUrl && this.isAudioUnsupported(err)) {
        const fallback = await this.buildAudioTextFallback(prepared);
        if (fallback) {
          const step = Math.max(1, Math.floor(fallback.content.length / 40));
          for (let i = 0; i < fallback.content.length; i += step) {
            yield { delta: fallback.content.slice(i, i + step) };
            await new Promise((r) => setTimeout(r, 12));
          }
          yield { delta: '', done: true, tokensUsed: fallback.tokensUsed };
          return;
        }
      }
      throw err;
    }
  }

  /** 当前接入点不支持音频时，若有文字/转写则退回纯文本对话 */
  private async buildAudioTextFallback(
    prepared: Awaited<ReturnType<ChatService['prepareTurn']>>,
  ) {
    const hint = '听听这段声音，告诉我你听到了什么';
    const userText = prepared.text.trim();
    if (!userText || userText === hint) return null;

    const media = {
      imageUrl: prepared.media.imageUrl,
      videoUrl: prepared.media.videoUrl,
    };
    const multimodal = this.llm.usesMultimodal(media);
    const note =
      '（主人还发来了一段语音，但当前模型暂时听不了；请根据下面文字理解并像宠物一样回应。）';
    const userContent = multimodal
      ? await this.buildMultimodalUserContent(`${userText}\n${note}`, media)
      : `${userText}\n${note}`;

    const llmMessages: ChatTurn[] = [
      prepared.llmMessages[0],
      ...prepared.recent,
      { role: 'user', content: userContent },
    ];

    this.logger.warn('Audio not supported on Ark endpoint — falling back to text-only');
    return this.llm.chat(llmMessages, media, this.llmOptions(multimodal));
  }

  private async buildVideoPart(
    videoUrl: string,
  ): Promise<OpenAI.Chat.ChatCompletionContentPart> {
    const local = resolveLocalUploadPath(videoUrl, process.cwd());

    // 本地文件：走方舟 Files API（远端读不到 localhost）
    if (local) {
      try {
        const fileId = await this.llm.uploadFile(local.filePath, local.filename, local.mime, {
          fps: 1,
        });
        return {
          type: 'video_url',
          video_url: { file_id: fileId, fps: 1 },
        } as unknown as OpenAI.Chat.ChatCompletionContentPart;
      } catch (err) {
        this.logger.warn(
          `Ark Files upload failed, fallback data URL: ${err instanceof Error ? err.message : String(err)}`,
        );
        // 小视频才允许 base64 兜底（约 < 8MB）
        if (local.size <= 8 * 1024 * 1024) {
          const video = resolveUploadDataUrl(videoUrl, process.cwd());
          if (video) {
            return {
              type: 'video_url',
              video_url: { url: video.dataUrl, fps: 1 },
            } as unknown as OpenAI.Chat.ChatCompletionContentPart;
          }
        }
        throw new ServiceUnavailableException({
          error: 'LLM_ERROR',
          message: '视频上传到方舟失败，请换更短的 mp4 再试',
        });
      }
    }

    // 公网 URL 直接传
    if (/^https?:\/\//i.test(videoUrl)) {
      return {
        type: 'video_url',
        video_url: { url: videoUrl, fps: 1 },
      } as unknown as OpenAI.Chat.ChatCompletionContentPart;
    }

    const abs = toAbsoluteUploadUrl(videoUrl, this.publicBaseUrl);
    return {
      type: 'video_url',
      video_url: { url: abs, fps: 1 },
    } as unknown as OpenAI.Chat.ChatCompletionContentPart;
  }

  private async buildAudioPart(
    audioUrl: string,
  ): Promise<OpenAI.Chat.ChatCompletionContentPart> {
    // 方舟音频只认扁平 audio_url（公网 URL 或 data URL），不支持 data/format 字段
    const audio = resolveUploadDataUrl(audioUrl, process.cwd());
    if (!audio) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'audio file could not be resolved',
      });
    }

    if (audio.dataUrl.startsWith('data:') && audio.dataUrl.length > 12 * 1024 * 1024) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: '音频过大，请缩短到约 1 分钟内或上传较小的 mp3/wav',
      });
    }

    return {
      type: 'input_audio',
      audio_url: audio.dataUrl,
    } as unknown as OpenAI.Chat.ChatCompletionContentPart;
  }

  private async finalizeTurn(
    prepared: {
      petId: string;
      sessionId: string;
      text: string;
      memKey: string;
      recent: MemMsg[];
    },
    content: string,
    tokensUsed: number | null,
  ) {
    const assistantMsg = await this.prisma.chatMessage.create({
      data: {
        sessionId: prepared.sessionId,
        role: 'assistant',
        content,
        tokensUsed: tokensUsed ?? undefined,
      },
    });

    const nextMem: MemMsg[] = [
      ...prepared.recent,
      { role: 'user' as const, content: prepared.text },
      { role: 'assistant' as const, content },
    ].slice(-10);
    await this.redis.setJson(prepared.memKey, nextMem, 86400);

    await this.prisma.chatSession.update({
      where: { id: prepared.sessionId },
      data: { updatedAt: new Date() },
    });

    const emotion = await this.emotion.analyzeFromChat(
      prepared.petId,
      prepared.text,
      content,
    );

    return {
      sessionId: prepared.sessionId,
      message: assistantMsg,
      emotion,
      promptVersion: CHAT_PROMPT_VERSION,
    };
  }
}
