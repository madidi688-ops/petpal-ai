import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PetsService } from '../pets/pets.service';
import { DeepseekService } from '../../infra/llm/deepseek.service';
import { buildMbtiPrompt, MBTI_PROMPT_VERSION } from '../../ai/prompts/mbti-analyzer';

type MbtiJson = {
  ei: number;
  sn: number;
  tf: number;
  jp: number;
  type: string;
  summary: string;
};

function clamp(n: number) {
  return Math.min(100, Math.max(-100, Math.round(n)));
}

function deriveType(ei: number, sn: number, tf: number, jp: number) {
  return `${ei >= 0 ? 'E' : 'I'}${sn >= 0 ? 'N' : 'S'}${tf >= 0 ? 'F' : 'T'}${jp >= 0 ? 'P' : 'J'}`;
}

@Injectable()
export class MbtiService {
  constructor(
    private prisma: PrismaService,
    private pets: PetsService,
    private llm: DeepseekService,
  ) {}

  async get(petId: string, userId: string) {
    await this.pets.getOwned(petId, userId);
    return this.prisma.mBTIProfile.findUnique({ where: { petId } });
  }

  async refresh(petId: string, userId: string) {
    const pet = await this.pets.getOwned(petId, userId);
    const behaviors = await this.prisma.behaviorEvent.findMany({
      where: { petId },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });

    const prompt = buildMbtiPrompt({
      petName: pet.name,
      species: pet.species,
      notes: pet.personalityNotes,
      behaviors: behaviors.map((b) => ({
        type: b.type,
        note: b.note,
        moodTag: b.moodTag,
      })),
    });

    let data: MbtiJson;
    try {
      const res = await this.llm.chatJson<MbtiJson>(
        [{ role: 'user', content: prompt }],
        { temperature: 0.3, maxTokens: 400 },
      );
      data = res.data;
    } catch {
      data = {
        ei: 20,
        sn: 10,
        tf: 30,
        jp: 15,
        type: 'ENFP',
        summary: `${pet.name} 看起来活泼好奇，喜欢探索，也需要稳定陪伴。`,
      };
    }

    const ei = clamp(Number(data.ei) || 0);
    const sn = clamp(Number(data.sn) || 0);
    const tf = clamp(Number(data.tf) || 0);
    const jp = clamp(Number(data.jp) || 0);
    const type = data.type?.length === 4 ? data.type.toUpperCase() : deriveType(ei, sn, tf, jp);

    return this.prisma.mBTIProfile.upsert({
      where: { petId },
      create: {
        petId,
        ei,
        sn,
        tf,
        jp,
        type,
        summary: data.summary || `${pet.name} 的性格画像（${MBTI_PROMPT_VERSION}）`,
      },
      update: {
        ei,
        sn,
        tf,
        jp,
        type,
        summary: data.summary || `${pet.name} 的性格画像（${MBTI_PROMPT_VERSION}）`,
      },
    });
  }
}
