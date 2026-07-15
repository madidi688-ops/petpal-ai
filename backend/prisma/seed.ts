import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@petpal.ai' },
    update: {},
    create: {
      email: 'demo@petpal.ai',
      passwordHash,
      name: 'Demo铲屎官',
    },
  });

  const existing = await prisma.pet.findFirst({ where: { userId: user.id, name: '年糕' } });
  if (!existing) {
    const pet = await prisma.pet.create({
      data: {
        userId: user.id,
        name: '年糕',
        species: 'cat',
        breed: '英短',
        personalityNotes: '粘人、爱蹭、晚上特别活跃',
      },
    });

    await prisma.behaviorEvent.createMany({
      data: [
        {
          petId: pet.id,
          type: 'eat',
          note: '吃了一小碗罐头，胃口不错',
          moodTag: 'happy',
        },
        {
          petId: pet.id,
          type: 'play',
          note: '追激光笔追了十分钟',
          moodTag: 'playful',
        },
        {
          petId: pet.id,
          type: 'sleep',
          note: '在键盘上睡午觉',
          moodTag: 'sleepy',
        },
      ],
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed done. Login: demo@petpal.ai / demo1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
