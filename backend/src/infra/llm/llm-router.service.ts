import { Injectable } from '@nestjs/common';
import { DeepseekService, ChatTurn, ChatOptions } from './deepseek.service';
import { SeedanceService } from './seedance.service';

export type MediaInput = {
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
};

@Injectable()
export class LlmRouterService {
  constructor(
    private readonly deepseek: DeepseekService,
    private readonly seedance: SeedanceService,
  ) {}

  usesMultimodal(input: MediaInput) {
    return Boolean(input.imageUrl || input.videoUrl || input.audioUrl);
  }

  providerFor(input: MediaInput): 'seedance' | 'deepseek' {
    return this.usesMultimodal(input) ? 'seedance' : 'deepseek';
  }

  uploadFile(
    filePath: string,
    filename: string,
    mime: string,
    opts?: { fps?: number },
  ) {
    return this.seedance.uploadFile(filePath, filename, mime, opts);
  }

  async chat(messages: ChatTurn[], input: MediaInput, options?: ChatOptions) {
    if (this.usesMultimodal(input)) {
      return this.seedance.chat(messages, options);
    }
    return this.deepseek.chat(messages, options);
  }

  chatStream(messages: ChatTurn[], input: MediaInput, options?: ChatOptions) {
    if (this.usesMultimodal(input)) {
      return this.seedance.chatStream(messages, options);
    }
    return this.deepseek.chatStream(messages, options);
  }
}
