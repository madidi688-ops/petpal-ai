import Link from 'next/link';
import type { EmotionLog, Pet } from '@/lib/types';
import { EmotionTag } from './emotion-tag';

const SPECIES: Record<string, string> = { cat: '猫', dog: '狗', other: '宠物' };

export function PetCard({ pet, emotion }: { pet: Pet; emotion?: EmotionLog | null }) {
  return (
    <article className="card-soft flex flex-col gap-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_50px_-28px_rgba(28,25,23,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold">{pet.name}</h3>
          <p className="mt-1 text-sm text-ink/55">
            {SPECIES[pet.species] ?? pet.species}
            {pet.breed ? ` · ${pet.breed}` : ''}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-moss/15 font-display text-lg font-bold text-moss">
          {pet.name.slice(0, 1)}
        </div>
      </div>

      {emotion ? (
        <EmotionTag emotion={emotion.emotion} score={emotion.score} />
      ) : (
        <p className="text-xs text-ink/40">暂无情绪记录，去聊两句吧</p>
      )}

      <div className="mt-auto flex gap-2 pt-2">
        <Link className="btn-primary flex-1 text-center" href={`/chat/${pet.id}`}>
          对话
        </Link>
        <Link className="btn-ghost flex-1 text-center" href={`/pets/${pet.id}`}>
          详情
        </Link>
      </div>
    </article>
  );
}
