import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { BehaviorsService } from './behaviors.service';
import { CreateBehaviorDto } from './dto/create-behavior.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('pets/:petId/behaviors')
export class BehaviorsController {
  constructor(private behaviors: BehaviorsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('petId') petId: string,
    @Query('take') take?: string,
  ) {
    return this.behaviors.list(petId, user.id, take ? Number(take) : 50);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('petId') petId: string,
    @Body() dto: CreateBehaviorDto,
  ) {
    return this.behaviors.create(petId, user.id, dto);
  }

  @Delete(':behaviorId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('petId') petId: string,
    @Param('behaviorId') behaviorId: string,
  ) {
    return this.behaviors.remove(petId, user.id, behaviorId);
  }
}
