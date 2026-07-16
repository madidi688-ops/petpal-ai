'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, apiUrl } from '@/lib/api';
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

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(key: string) {
  const today = dayKey(new Date().toISOString());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = dayKey(y.toISOString());
  if (key === today) return '今天';
  if (key === yesterday) return '昨天';
  return key;
}

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

  const grouped = useMemo(() => {
    const map = new Map<string, BehaviorEvent[]>();
    for (const ev of events) {
      const key = dayKey(ev.occurredAt);
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [events]);

  async function removeEvent(id: string) {
    if (!petId) return;
    if (!confirm('删除这条行为记录？')) return;
    try {
      await api(`/pets/${petId}/behaviors/${id}`, { method: 'DELETE' });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  }

  const petName = pets.find((p) => p.id === petId)?.name;

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-bold">行为记录</h1>
          <p className="mt-1 text-sm text-ink/50">记下来的小事，会喂给日记和 MBTI</p>
        </div>
        {pets.length > 0 ? (
          <select className="input" value={petId} onChange={(e) => setPetId(e.target.value)}>
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-ink/50">
            请先在首页添加宠物 · <Link className="text-moss underline" href="/dashboard">去添加</Link>
          </p>
        )}
        {petId && (
          <BehaviorForm
            petId={petId}
            onCreated={(ev) => setEvents((prev) => [ev, ...prev])}
          />
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">最近记录</h2>
          {events.length > 0 && (
            <p className="text-xs text-ink/40">
              {petName ? `${petName} · ` : ''}共 {events.length} 条
            </p>
          )}
        </div>
        {error && <p className="text-sm text-clay">{error}</p>}
        {events.length === 0 ? (
          <div className="card-soft text-sm text-ink/50">
            还没有行为记录。左侧记一条「玩耍」或「吃饭」试试。
          </div>
        ) : (
          grouped.map(([day, list]) => (
            <section key={day} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/40">
                {dayLabel(day)} · {list.length} 条
              </h3>
              {list.map((ev) => (
                <article key={ev.id} className="card-soft group">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-moss">
                      {TYPE_LABEL[ev.type] ?? ev.type}
                    </span>
                    <div className="flex items-center gap-2">
                      <time className="text-xs text-ink/40">
                        {new Date(ev.occurredAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                      <button
                        type="button"
                        className="text-xs text-ink/25 opacity-0 hover:text-clay group-hover:opacity-100"
                        onClick={() => void removeEvent(ev.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  {ev.note && <p className="mt-2 text-sm text-ink/75">{ev.note}</p>}
                  {ev.moodTag && <p className="mt-1 text-xs text-ink/45">#{ev.moodTag}</p>}
                  {ev.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={apiUrl(ev.imageUrl)}
                      alt=""
                      className="mt-3 max-h-48 rounded-xl object-cover"
                    />
                  )}
                </article>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
