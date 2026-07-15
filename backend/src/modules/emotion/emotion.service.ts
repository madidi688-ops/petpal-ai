import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PetsService } from '../pets/pets.service';
import { DeepseekService } from '../../infra/llm/deepseek.service';
import {
  EMOTION_CLASSIFIER_PROMPT,
  EMOTION_PROMPT_VERSION,
} from '../../ai/prompts/emotion-classifier';

type EmotionResult = { emotion: string; score: number; reason?: string };

@Injectable()
export class EmotionService {
  constructor(
    private prisma: PrismaService,
    private pets: PetsService,
    private llm: DeepseekService,
  ) {}

  async list(petId: string, userId: string, take = 30) {
    await this.pets.getOwned(petId, userId);
    return this.prisma.emotionLog.findMany({
      where: { petId },
      orderBy: { recordedAt: 'desc' },
      take,
    });
  }

  async recent(petId: string, userId: string) {
    await this.pets.getOwned(petId, userId);
    return this.prisma.emotionLog.findFirst({
      where: { petId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async analyzeFromChat(petId: string, userMsg: string, assistantMsg: string) {
    let result: EmotionResult;

    try {
      const { data } = await this.llm.chatJson<EmotionResult>(
        [
          { role: 'system', content: EMOTION_CLASSIFIER_PROMPT },
          {
            role: 'user',
            content: `主人说：${userMsg}\n宠物回：${assistantMsg}`,
          },
        ],
        { temperature: 0, maxTokens: 150 },
      );
      result = data;
    } catch {
      result = { emotion: 'calm', score: 50, reason: 'fallback' };
    }

    const log = await this.prisma.emotionLog.create({
      data: {
        petId,
        source: 'chat',
        emotion: result.emotion || 'calm',
        score: Math.min(100, Math.max(0, Number(result.score) || 50)),
      },
    });

    return { ...log, reason: result.reason, promptVersion: EMOTION_PROMPT_VERSION };
  }
}
