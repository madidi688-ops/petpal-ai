import { Module } from '@nestjs/common';
import { BehaviorsService } from './behaviors.service';
import { BehaviorsController } from './behaviors.controller';
import { PetsModule } from '../pets/pets.module';

@Module({
  imports: [PetsModule],
  controllers: [BehaviorsController],
  providers: [BehaviorsService],
  exports: [BehaviorsService],
})
export class BehaviorsModule {}
