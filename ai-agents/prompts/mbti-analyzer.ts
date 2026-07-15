export function buildMbtiPrompt(input: {
  petName: string;
  species: string;
  notes?: string | null;
  behaviors: Array<{ type: string; note?: string | null; moodTag?: string | null }>;
}) {
  const sample = input.behaviors
    .slice(0, 40)
    .map((b) => `- [${b.type}] ${b.note ?? ''} ${b.moodTag ?? ''}`)
    .join('\n');

  return `根据宠物「${input.petName}」（${input.species}）的行为记录，生成 MBTI 性格画像。
性格备注：${input.notes ?? '无'}
行为样本：
${sample || '（样本不足，请给出保守估计）'}

只输出 JSON：
{
  "ei": -100到100整数（负=I 正=E）,
  "sn": -100到100（负=S 正=N）,
  "tf": -100到100（负=T 正=F）,
  "jp": -100到100（负=J 正=P）,
  "type": "四字母如 ENFP",
  "summary": "80-150字人设解读"
}`;
}

export const MBTI_PROMPT_VERSION = 'mbti@v1';
