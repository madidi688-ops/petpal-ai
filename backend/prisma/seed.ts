import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

function ensureSeedAvatar(): string {
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  const dest = join(uploadsDir, 'seed-niangao-avatar.jpg');
  const candidates = [
    join(process.cwd(), 'seed-assets', 'cat.jpg'),
    join(process.cwd(), '..', 'frontend', 'public', 'media', 'cat.jpg'),
    join('D:', 'sucai', '猫.jpg'),
  ];
  for (const src of candidates) {
    if (existsSync(src)) {
      copyFileSync(src, dest);
      break;
    }
  }
  return '/uploads/seed-niangao-avatar.jpg';
}

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@petpal.ai' },
    update: { name: 'Demo铲屎官', passwordHash },
    create: {
      email: 'demo@petpal.ai',
      passwordHash,
      name: 'Demo铲屎官',
    },
  });

  const avatarUrl = ensureSeedAvatar();

  let pet = await prisma.pet.findFirst({ where: { userId: user.id, name: '年糕' } });
  if (!pet) {
    pet = await prisma.pet.create({
      data: {
        userId: user.id,
        name: '年糕',
        species: 'cat',
        breed: '英短',
        avatarUrl,
        personalityNotes: '粘人、爱蹭、晚上特别活跃',
      },
    });
  } else {
    pet = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        avatarUrl,
        breed: pet.breed || '英短',
        personalityNotes: pet.personalityNotes || '粘人、爱蹭、晚上特别活跃',
      },
    });
  }

  const behaviorCount = await prisma.behaviorEvent.count({ where: { petId: pet.id } });
  if (behaviorCount === 0) {
    await prisma.behaviorEvent.createMany({
      data: [
        {
          petId: pet.id,
          type: 'eat',
          note: '吃了一小碗罐头，胃口不错',
          moodTag: '开心',
        },
        {
          petId: pet.id,
          type: 'play',
          note: '追激光笔追了十分钟',
          moodTag: '兴奋',
        },
        {
          petId: pet.id,
          type: 'sleep',
          note: '在键盘上睡午觉',
          moodTag: '犯困',
        },
      ],
    });
  }

  const sessionCount = await prisma.chatSession.count({ where: { petId: pet.id, userId: user.id } });
  if (sessionCount === 0) {
    const session = await prisma.chatSession.create({
      data: {
        petId: pet.id,
        userId: user.id,
        title: '主人回来啦',
      },
    });
    await prisma.chatMessage.createMany({
      data: [
        {
          sessionId: session.id,
          role: 'user',
          content: '年糕，我回来啦',
        },
        {
          sessionId: session.id,
          role: 'assistant',
          content:
            '喵～我等你好久啦！快摸摸我的头，我刚刚在窗边看小鸟，现在只想黏着你。',
        },
        {
          sessionId: session.id,
          role: 'user',
          content: '今天想吃什么',
        },
        {
          sessionId: session.id,
          role: 'assistant',
          content: '想吃带冻干的罐头！碗要盛得满满的，吃完还要你陪我玩一会儿激光笔～',
        },
      ],
    });
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const behaviors = await prisma.behaviorEvent.findMany({
    where: { petId: pet.id },
    take: 3,
    orderBy: { occurredAt: 'desc' },
  });
  await prisma.diaryEntry.upsert({
    where: { petId_date: { petId: pet.id, date: today } },
    create: {
      petId: pet.id,
      date: today,
      content:
        '今天罐头很好吃，还追了好久激光笔。中午偷偷在键盘上睡了一觉——主人回来时，我已经准备好撒娇了。',
      moodScore: 86,
      highlightBehaviorIds: JSON.stringify(behaviors.map((b) => b.id)),
      generatedBy: 'seed-demo',
    },
    update: {
      content:
        '今天罐头很好吃，还追了好久激光笔。中午偷偷在键盘上睡了一觉——主人回来时，我已经准备好撒娇了。',
      moodScore: 86,
      highlightBehaviorIds: JSON.stringify(behaviors.map((b) => b.id)),
      generatedBy: 'seed-demo',
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed done. Login: demo@petpal.ai / demo1234 · pet=年糕 with avatar + sample chat');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
