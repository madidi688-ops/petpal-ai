'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { BehaviorEvent, Pet } from '@/lib/types';
import { BehaviorForm } from '@/components/behavior-form';

const TYPE_LABEL: Record<string, string> = {
  eat: '吃饭',
  drink: '喝水',
  sleep: '睡觉',
  play: '玩耍',
  groom: '梳毛',
  toilet: '如厕',
  other: '其他',
};

export default function BehaviorsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [petId, setPetId] = useState('');
  const [events, setEvents] = useState<BehaviorEvent[]>([]);
  const [error, setError] = useState('');

  async function loadPets() {
    const list = await api<Pet[]>('/pets');
    setPets(list);
    if (list[0] && !petId) setPetId(list[0].id);
  }

  async function loadEvents(id: string) {
    if (!id) return;
    const list = await api<BehaviorEvent[]>(`/pets/${id}/behaviors`);
    setEvents(list);
  }

  useEffect(() => {
    loadPets().catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, []);

  useEffect(() => {
    if (petId) {
      loadEvents(petId).catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
    }
  }, [petId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold">行为记录</h1>
        {pets.length > 0 ? (
          <select className="input" value={petId} onChange={(e) => setPetId(e.target.value)}>
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-ink/50">请先在首页添加宠物</p>
        )}
        {petId && (
          <BehaviorForm
            petId={petId}
            onCreated={(ev) => setEvents((prev) => [ev, ...prev])}
          />
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold">最近记录</h2>
        {error && <p className="text-sm text-clay">{error}</p>}
        {events.length === 0 ? (
          <div className="card-soft text-sm text-ink/50">还没有行为记录</div>
        ) : (
          events.map((ev) => (
            <article key={ev.id} className="card-soft">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-moss">
                  {TYPE_LABEL[ev.type] ?? ev.type}
                </span>
                <time className="text-xs text-ink/40">
                  {new Date(ev.occurredAt).toLocaleString()}
                </time>
              </div>
              {ev.note && <p className="mt-2 text-sm text-ink/75">{ev.note}</p>}
              {ev.moodTag && <p className="mt-1 text-xs text-ink/45">#{ev.moodTag}</p>}
              {ev.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ev.imageUrl}
                  alt=""
                  className="mt-3 max-h-48 rounded-xl object-cover"
                />
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
