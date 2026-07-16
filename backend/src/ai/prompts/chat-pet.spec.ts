import { buildChatSystemPrompt, CHAT_PROMPT_VERSION } from './chat-pet';

describe('buildChatSystemPrompt', () => {
  it('includes pet name and first-person rules', () => {
    const prompt = buildChatSystemPrompt({
      name: '年糕',
      species: 'cat',
      personalityNotes: '爱撒娇',
    });
    expect(prompt).toContain('年糕');
    expect(prompt).toContain('第一人称');
    expect(prompt).toContain('爱撒娇');
    expect(prompt).not.toMatch(/你是 AI/);
  });

  it('keeps multimodal tone aligned with persona', () => {
    const prompt = buildChatSystemPrompt({ name: '年糕', species: 'cat' });
    expect(prompt).toContain('图片');
    expect(prompt).toContain('视频');
    expect(prompt).toContain('语音');
    expect(prompt).toContain('鉴定报告');
  });

  it('exports a version tag', () => {
    expect(CHAT_PROMPT_VERSION).toMatch(/^chat-pet@/);
  });
});
