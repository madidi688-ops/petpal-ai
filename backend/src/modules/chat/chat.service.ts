import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PetsService } from '../pets/pets.service';
import { DeepseekService } from '../../infra/llm/deepseek.service';
import { RedisService } from '../../infra/redis/redis.service';
import { EmotionService } from '../emotion/emotion.service';
import { SendChatDto } from './dto/send-chat.dto';
import { buildChatSystemPrompt, CHAT_PROMPT_VERSION } from '../../ai/prompts/chat-pet';

type MemMsg = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private pets: PetsService,
    private llm: DeepseekService,
    private redis: RedisService,
    private emotion: EmotionService,
  ) {}

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
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, petId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return session;
  }

  async send(petId: string, userId: string, dto: SendChatDto) {
    const pet = await this.pets.getOwned(petId, userId);

    let sessionId = dto.sessionId;
    if (!sessionId) {
      const session = await this.prisma.chatSession.create({
        data: {
          petId,
          userId,
          title: dto.content.slice(0, 30),
        },
      });
      sessionId = session.id;
    }

    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: dto.content,
        imageUrl: dto.imageUrl,
      },
    });

    const memKey = `chat:session:${sessionId}:messages`;
    const history = (await this.redis.getJson<MemMsg[]>(memKey)) ?? [];
    const recent = history.slice(-10);

    const system = buildChatSystemPrompt(pet);
    const { content, tokensUsed } = await this.llm.chat(
      [
        { role: 'system', content: system },
        ...recent,
        { role: 'user', content: dto.content },
      ],
      { temperature: 0.85, maxTokens: 200 },
    );

    const assistantMsg = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content,
        tokensUsed: tokensUsed ?? undefined,
      },
    });

    const nextMem: MemMsg[] = [
      ...recent,
      { role: 'user' as const, content: dto.content },
      { role: 'assistant' as const, content },
    ].slice(-10);
    await this.redis.setJson(memKey, nextMem, 86400);

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    const emotion = await this.emotion.analyzeFromChat(petId, dto.content, content);

    return {
      sessionId,
      message: assistantMsg,
      emotion,
      promptVersion: CHAT_PROMPT_VERSION,
    };
  }
}
