import { Controller, Get, Param, Query } from '@nestjs/common';
import { EmotionService } from './emotion.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('pets/:petId/emotions')
export class EmotionController {
  constructor(private emotion: EmotionService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('petId') petId: string,
    @Query('take') take?: string,
  ) {
    return this.emotion.list(petId, user.id, take ? Number(take) : 30);
  }

  @Get('recent')
  recent(@CurrentUser() user: AuthUser, @Param('petId') petId: string) {
    return this.emotion.recent(petId, user.id);
  }
}
