import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PetsService } from '../pets/pets.service';
import { BehaviorsService } from '../behaviors/behaviors.service';
import { DeepseekService } from '../../infra/llm/deepseek.service';
import { buildDiaryPrompt, DIARY_PROMPT_VERSION } from '../../ai/prompts/diary-generator';

type DiaryJson = { content: string; moodScore: number; highlights?: string[] };

@Injectable()
export class DiaryService {
  constructor(
    private prisma: PrismaService,
    private pets: PetsService,
    private behaviors: BehaviorsService,
    private llm: DeepseekService,
  ) {}

  async list(petId: string, userId: string) {
    await this.pets.getOwned(petId, userId);
    return this.prisma.diaryEntry.findMany({
      where: { petId },
      orderBy: { date: 'desc' },
      take: 30,
    });
  }

  async generate(petId: string, userId: string, dateStr?: string) {
    const pet = await this.pets.getOwned(petId, userId);
    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(12, 0, 0, 0);

    const behaviors = await this.behaviors.listByDate(petId, userId, date);
    const prompt = buildDiaryPrompt({
      petName: pet.name,
      species: pet.species,
      date: date.toISOString().slice(0, 10),
      behaviors: behaviors.map((b) => ({
        type: b.type,
        note: b.note,
        moodTag: b.moodTag,
        occurredAt: b.occurredAt.toISOString(),
      })),
    });

    let data: DiaryJson;
    try {
      const res = await this.llm.chatJson<DiaryJson>(
        [{ role: 'user', content: prompt }],
        { temperature: 0.8, maxTokens: 600 },
      );
      data = res.data;
    } catch {
      data = {
        content: `今天是安静的一天。我（${pet.name}）在家里等着主人。`,
        moodScore: 60,
        highlights: [],
      };
    }

    return this.prisma.diaryEntry.upsert({
      where: { petId_date: { petId, date } },
      create: {
        petId,
        date,
        content: data.content,
        moodScore: Math.min(100, Math.max(0, Number(data.moodScore) || 60)),
        highlightBehaviorIds: JSON.stringify(behaviors.map((b) => b.id)),
        generatedBy: DIARY_PROMPT_VERSION,
      },
      update: {
        content: data.content,
        moodScore: Math.min(100, Math.max(0, Number(data.moodScore) || 60)),
        highlightBehaviorIds: JSON.stringify(behaviors.map((b) => b.id)),
        generatedBy: DIARY_PROMPT_VERSION,
      },
    });
  }
}
