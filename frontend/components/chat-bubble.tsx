import { PetAvatar } from '@/components/pet-avatar';
import { apiUrl } from '@/lib/api';
import type { Pet } from '@/lib/types';

export function ChatBubble({
  role,
  content,
  imageUrl,
  videoUrl,
  audioUrl,
  pet,
  streaming,
}: {
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  pet?: Pick<Pet, 'name' | 'species' | 'avatarUrl'> | null;
  streaming?: boolean;
}) {
  const isUser = role === 'user';
  const imgSrc = imageUrl ? apiUrl(imageUrl) : null;
  const vidSrc = videoUrl ? apiUrl(videoUrl) : null;
  const audSrc = audioUrl ? apiUrl(audioUrl) : null;
  const emptyStreaming = streaming && !content;

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <PetAvatar
          pet={pet}
          size="sm"
          breathing={Boolean(streaming)}
          className="mb-0.5 rounded-full"
        />
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-md bg-moss text-white'
            : 'rounded-bl-md border border-ink/5 bg-white/80 text-ink'
        }`}
      >
        {imgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt=""
            className={`mb-2 max-h-48 w-full rounded-xl object-cover ${
              isUser ? 'ring-1 ring-white/20' : 'ring-1 ring-ink/5'
            }`}
          />
        )}
        {vidSrc && (
          <video
            src={vidSrc}
            controls
            playsInline
            className={`mb-2 max-h-48 w-full rounded-xl ${
              isUser ? 'ring-1 ring-white/20' : 'ring-1 ring-ink/5'
            }`}
          />
        )}
        {audSrc && (
          <div
            className={`mb-2 rounded-xl px-3 py-2 ${
              isUser ? 'bg-white/15' : 'bg-mist/80'
            }`}
          >
            <p className={`mb-1 text-[11px] ${isUser ? 'text-white/70' : 'text-ink/45'}`}>
              语音消息
            </p>
            <audio src={audSrc} controls className="w-full max-w-[240px]" />
          </div>
        )}
        {emptyStreaming ? (
          <span className="inline-flex gap-1 text-ink/40" aria-label="正在回复">
            <span className="animate-pulse">·</span>
            <span className="animate-pulse [animation-delay:120ms]">·</span>
            <span className="animate-pulse [animation-delay:240ms]">·</span>
          </span>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
