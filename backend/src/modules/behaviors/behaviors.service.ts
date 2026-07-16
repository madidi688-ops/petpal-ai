import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PetsService } from '../pets/pets.service';
import { CreateBehaviorDto } from './dto/create-behavior.dto';

@Injectable()
export class BehaviorsService {
  constructor(
    private prisma: PrismaService,
    private pets: PetsService,
  ) {}

  async list(petId: string, userId: string, take = 50) {
    await this.pets.getOwned(petId, userId);
    return this.prisma.behaviorEvent.findMany({
      where: { petId },
      orderBy: { occurredAt: 'desc' },
      take,
    });
  }

  async create(petId: string, userId: string, dto: CreateBehaviorDto) {
    await this.pets.getOwned(petId, userId);
    return this.prisma.behaviorEvent.create({
      data: {
        petId,
        type: dto.type,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        note: dto.note,
        imageUrl: dto.imageUrl,
        moodTag: dto.moodTag,
      },
    });
  }

  async remove(petId: string, userId: string, behaviorId: string) {
    await this.pets.getOwned(petId, userId);
    const row = await this.prisma.behaviorEvent.findFirst({
      where: { id: behaviorId, petId },
    });
    if (!row) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: '行为记录不存在' });
    }
    await this.prisma.behaviorEvent.delete({ where: { id: behaviorId } });
    return { deleted: true };
  }

  async listByDate(petId: string, userId: string, date: Date) {
    await this.pets.getOwned(petId, userId);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return this.prisma.behaviorEvent.findMany({
      where: { petId, occurredAt: { gte: start, lte: end } },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
