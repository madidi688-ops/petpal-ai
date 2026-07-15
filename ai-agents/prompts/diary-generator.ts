export function buildDiaryPrompt(input: {
  petName: string;
  species: string;
  date: string;
  behaviors: Array<{ type: string; note?: string | null; moodTag?: string | null; occurredAt: string }>;
}) {
  const lines = input.behaviors
    .map((b) => `- ${b.occurredAt} [${b.type}] ${b.note ?? ''}${b.moodTag ? ` (#${b.moodTag})` : ''}`)
    .join('\n');

  return `你是一只名叫「${input.petName}」的${input.species === 'dog' ? '狗' : '猫'}。
请用第一人称写 ${input.date} 的日记，温暖有趣，200-400字。
今日行为记录：
${lines || '（今天主人没有写行为，请写一篇安静的居家日记）'}

只输出 JSON：
{"content":"日记正文","moodScore":0-100,"highlights":["简述1","简述2"]}`;
}

export const DIARY_PROMPT_VERSION = 'diary@v1';
