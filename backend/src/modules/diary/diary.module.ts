import { Module } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { DiaryController } from './diary.controller';
import { PetsModule } from '../pets/pets.module';
import { BehaviorsModule } from '../behaviors/behaviors.module';

@Module({
  imports: [PetsModule, BehaviorsModule],
  controllers: [DiaryController],
  providers: [DiaryService],
})
export class DiaryModule {}
