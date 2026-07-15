import { Global, Module } from '@nestjs/common';
import { DeepseekService } from './deepseek.service';

@Global()
@Module({
  providers: [DeepseekService],
  exports: [DeepseekService],
})
export class LlmModule {}
