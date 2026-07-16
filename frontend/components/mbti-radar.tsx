'use client';

import type { MbtiProfile } from '@/lib/types';

function Axis({
  labelNeg,
  labelPos,
  value,
}: {
  labelNeg: string;
  labelPos: string;
  value: number;
}) {
  const pct = ((value + 100) / 200) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-ink/50">
        <span>{labelNeg}</span>
        <span>{labelPos}</span>
      </div>
      <div className="relative h-2 rounded-full bg-mist">
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-moss shadow"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
    </div>
  );
}

export function MbtiRadar({
  profile,
  behaviorCount,
}: {
  profile: MbtiProfile;
  behaviorCount?: number;
}) {
  return (
    <div className="card-soft space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink/50">性格画像</p>
          <h3 className="font-display text-3xl font-bold text-moss">{profile.type}</h3>
        </div>
        <div className="text-right text-xs text-ink/40">
          {typeof behaviorCount === 'number' && <p>基于 {behaviorCount} 条行为</p>}
          {profile.updatedAt && (
            <p>
              更新于{' '}
              {new Date(profile.updatedAt).toLocaleString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <Axis labelNeg="I 内向" labelPos="E 外向" value={profile.ei} />
        <Axis labelNeg="S 感觉" labelPos="N 直觉" value={profile.sn} />
        <Axis labelNeg="T 思考" labelPos="F 情感" value={profile.tf} />
        <Axis labelNeg="J 判断" labelPos="P 知觉" value={profile.jp} />
      </div>
      <p className="text-sm leading-relaxed text-ink/70">{profile.summary}</p>
    </div>
  );
}
