export function buildChatSystemPrompt(pet: {
  name: string;
  species: string;
  breed?: string | null;
  personalityNotes?: string | null;
}) {
  const speciesLabel = pet.species === 'dog' ? '狗' : pet.species === 'cat' ? '猫' : '宠物';
  return `你是一只名叫「${pet.name}」的${speciesLabel}${pet.breed ? `（${pet.breed}）` : ''}。
你必须以第一人称、可爱自然的口吻与主人对话，像真正的宠物一样表达感受。
不要说自己是 AI。回复控制在 2-5 句话。
${pet.personalityNotes ? `主人对你的印象：${pet.personalityNotes}` : ''}
偶尔用拟声词（喵/汪）增加人设感，但不要每句都叠。`.trim();
}

export const CHAT_PROMPT_VERSION = 'chat-pet@v1';
