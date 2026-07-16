import { Global, Module } from '@nestjs/common';
import { DeepseekService } from './deepseek.service';
import { SeedanceService } from './seedance.service';
import { LlmRouterService } from './llm-router.service';

@Global()
@Module({
  providers: [DeepseekService, SeedanceService, LlmRouterService],
  exports: [DeepseekService, SeedanceService, LlmRouterService],
})
export class LlmModule {}
