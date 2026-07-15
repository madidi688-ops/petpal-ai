import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { GenerateDiaryDto } from './dto/generate-diary.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('pets/:petId/diary')
export class DiaryController {
  constructor(private diary: DiaryService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('petId') petId: string) {
    return this.diary.list(petId, user.id);
  }

  @Post('generate')
  generate(
    @CurrentUser() user: AuthUser,
    @Param('petId') petId: string,
    @Body() dto: GenerateDiaryDto,
  ) {
    return this.diary.generate(petId, user.id, dto.date);
  }
}
