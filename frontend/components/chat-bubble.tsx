export function ChatBubble({
  role,
  content,
}: {
  role: 'user' | 'assistant' | 'system';
  content: string;
}) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-md bg-moss text-white'
            : 'rounded-bl-md border border-ink/5 bg-white/80 text-ink'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
