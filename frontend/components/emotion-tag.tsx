const LABEL: Record<string, string> = {
  happy: '开心',
  anxious: '焦虑',
  curious: '好奇',
  sleepy: '困倦',
  playful: '想玩',
  lonely: '想你',
  angry: '不爽',
  calm: '平静',
};

export function EmotionTag({ emotion, score }: { emotion: string; score?: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-mist px-3 py-1 text-xs font-medium text-moss">
      <span className="h-1.5 w-1.5 rounded-full bg-moss" />
      {LABEL[emotion] ?? emotion}
      {typeof score === 'number' && <span className="text-ink/40">{score}%</span>}
    </span>
  );
}
