import { Controller, Get, Param, Post } from '@nestjs/common';
import { MbtiService } from './mbti.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('pets/:petId/mbti')
export class MbtiController {
  constructor(private mbti: MbtiService) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Param('petId') petId: string) {
    return this.mbti.get(petId, user.id);
  }

  @Post('refresh')
  refresh(@CurrentUser() user: AuthUser, @Param('petId') petId: string) {
    return this.mbti.refresh(petId, user.id);
  }
}
