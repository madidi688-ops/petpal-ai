import { LlmRouterService } from './llm-router.service';

describe('LlmRouterService routing', () => {
  const router = Object.create(LlmRouterService.prototype) as LlmRouterService;

  it('routes pure text to deepseek', () => {
    expect(router.usesMultimodal({})).toBe(false);
    expect(router.providerFor({})).toBe('deepseek');
  });

  it('routes image/video/audio to seedance (ark)', () => {
    expect(router.usesMultimodal({ imageUrl: '/uploads/a.jpg' })).toBe(true);
    expect(router.providerFor({ videoUrl: '/uploads/a.mp4' })).toBe('seedance');
    expect(router.providerFor({ audioUrl: '/uploads/a.wav' })).toBe('seedance');
  });
});
