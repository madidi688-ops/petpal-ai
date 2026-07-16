import { PetAvatar } from '@/components/pet-avatar';
import type { DiaryEntry, Pet } from '@/lib/types';

export function DiaryShareCard({
  pet,
  diary,
}: {
  pet: Pick<Pet, 'name' | 'species' | 'avatarUrl'>;
  diary: Pick<DiaryEntry, 'date' | 'content' | 'moodScore'>;
}) {
  const dateLabel = String(diary.date).slice(0, 10);
  const mood = Math.min(100, Math.max(0, diary.moodScore ?? 0));

  return (
    <article className="relative overflow-hidden rounded-3xl border border-ink/5 bg-gradient-to-br from-[#f7f3eb] via-[#eef5f0] to-[#e8efe6] p-5 shadow-[0_20px_50px_-28px_rgba(28,25,23,0.45)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-moss/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-clay/10 blur-2xl"
      />

      <header className="relative z-10 flex items-center gap-3">
        <PetAvatar pet={pet} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold text-ink">{pet.name} 的日记</p>
          <p className="text-xs text-ink/45">{dateLabel}</p>
        </div>
        <div className="rounded-2xl bg-white/70 px-3 py-2 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-wide text-ink/40">心情</p>
          <p className="font-display text-xl font-bold text-moss">{mood}</p>
        </div>
      </header>

      <div className="relative z-10 mt-4 rounded-2xl bg-white/65 p-4 backdrop-blur">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{diary.content}</p>
      </div>

      <footer className="relative z-10 mt-4 flex items-center justify-between text-[11px] text-ink/40">
        <span className="font-display tracking-wide">PetPal AI</span>
        <span>读懂毛孩子的一天</span>
      </footer>
    </article>
  );
}
