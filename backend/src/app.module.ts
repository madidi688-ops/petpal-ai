import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { LlmModule } from './infra/llm/llm.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { PetsModule } from './modules/pets/pets.module';
import { BehaviorsModule } from './modules/behaviors/behaviors.module';
import { ChatModule } from './modules/chat/chat.module';
import { EmotionModule } from './modules/emotion/emotion.module';
import { DiaryModule } from './modules/diary/diary.module';
import { MbtiModule } from './modules/mbti/mbti.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    RedisModule,
    LlmModule,
    HealthModule,
    AuthModule,
    PetsModule,
    BehaviorsModule,
    ChatModule,
    EmotionModule,
    DiaryModule,
    MbtiModule,
    UploadModule,
  ],
})
export class AppModule {}
