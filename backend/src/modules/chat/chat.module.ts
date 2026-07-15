import { Module, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PetsModule } from '../pets/pets.module';
import { EmotionModule } from '../emotion/emotion.module';

@Module({
  imports: [PetsModule, forwardRef(() => EmotionModule)],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
