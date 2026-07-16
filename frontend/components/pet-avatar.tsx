import { apiUrl } from '@/lib/api';
import type { Pet } from '@/lib/types';

const SPECIES_FALLBACK: Record<string, string> = {
  cat: '🐱',
  dog: '🐶',
  other: '🐾',
};

export function PetAvatar({
  pet,
  size = 'md',
  className = '',
  breathing = false,
}: {
  pet?: Pick<Pet, 'name' | 'species' | 'avatarUrl'> | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  breathing?: boolean;
}) {
  const px = size === 'sm' ? 'h-8 w-8 text-sm' : size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-12 w-12 text-lg';
  const src = pet?.avatarUrl ? apiUrl(pet.avatarUrl) : null;
  const letter = pet?.name?.slice(0, 1) || SPECIES_FALLBACK[pet?.species ?? 'other'] || '🐾';
  const breathe = breathing ? 'animate-breathe' : '';

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={pet?.name ?? '宠物头像'}
        className={`${px} ${breathe} shrink-0 rounded-2xl object-cover ring-1 ring-ink/10 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${px} ${breathe} flex shrink-0 items-center justify-center rounded-2xl bg-moss/15 font-display font-bold text-moss ${className}`}
      aria-hidden
    >
      {letter}
    </div>
  );
}
