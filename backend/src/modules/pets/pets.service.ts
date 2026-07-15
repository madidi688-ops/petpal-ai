import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(private prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.pet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOwned(petId: string, userId: string) {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Pet not found' });
    if (pet.userId !== userId) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Not your pet' });
    }
    return pet;
  }

  create(userId: string, dto: CreatePetDto) {
    return this.prisma.pet.create({
      data: {
        userId,
        name: dto.name,
        species: dto.species ?? 'cat',
        breed: dto.breed,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
        avatarUrl: dto.avatarUrl,
        personalityNotes: dto.personalityNotes,
      },
    });
  }

  async update(petId: string, userId: string, dto: UpdatePetDto) {
    await this.getOwned(petId, userId);
    return this.prisma.pet.update({
      where: { id: petId },
      data: {
        ...dto,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      },
    });
  }

  async remove(petId: string, userId: string) {
    await this.getOwned(petId, userId);
    await this.prisma.pet.delete({ where: { id: petId } });
    return { deleted: true };
  }
}
