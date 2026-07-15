import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendChatDto } from './dto/send-chat.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('pets/:petId/chat')
export class ChatController {
  constructor(private chat: ChatService) {}

  @Get('sessions')
  listSessions(@CurrentUser() user: AuthUser, @Param('petId') petId: string) {
    return this.chat.listSessions(petId, user.id);
  }

  @Get('sessions/:sessionId')
  getSession(
    @CurrentUser() user: AuthUser,
    @Param('petId') petId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chat.getSession(petId, user.id, sessionId);
  }

  @Post()
  send(
    @CurrentUser() user: AuthUser,
    @Param('petId') petId: string,
    @Body() dto: SendChatDto,
  ) {
    return this.chat.send(petId, user.id, dto);
  }
}
