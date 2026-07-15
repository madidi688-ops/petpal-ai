'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { EmotionLog, Pet } from '@/lib/types';
import { PetCard } from '@/components/pet-card';

export default function DashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [emotions, setEmotions] = useState<Record<string, EmotionLog | null>>({});
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'cat' | 'dog' | 'other'>('cat');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const list = await api<Pet[]>('/pets');
      setPets(list);
      const emoEntries = await Promise.all(
        list.map(async (p) => {
          try {
            const e = await api<EmotionLog | null>(`/pets/${p.id}/emotions/recent`);
            return [p.id, e] as const;
          } catch {
            return [p.id, null] as const;
          }
        }),
      );
      setEmotions(Object.fromEntries(emoEntries));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createPet(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api<Pet>('/pets', {
        method: 'POST',
        json: { name, species, personalityNotes: notes || undefined },
      });
      setName('');
      setNotes('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-ink/5 bg-gradient-to-br from-mist via-cream to-[#f3e6d8] px-6 py-10">
        <div className="relative z-10 max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-moss">PetPal AI</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            读懂毛孩子的一天
          </h1>
          <p className="mt-4 text-base text-ink/65">
            记录行为、对话陪伴，让 AI 帮你写宠物日记、生成性格画像。
          </p>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-moss/10 blur-2xl"
        />
      </section>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">我的宠物</h2>
        <button className="btn-primary" type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '取消' : '添加宠物'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPet} className="card-soft grid gap-3 md:grid-cols-2">
          <input
            className="input"
            required
            placeholder="名字，比如 年糕"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="input"
            value={species}
            onChange={(e) => setSpecies(e.target.value as 'cat' | 'dog' | 'other')}
          >
            <option value="cat">猫</option>
            <option value="dog">狗</option>
            <option value="other">其他</option>
          </select>
          <textarea
            className="input md:col-span-2"
            rows={2}
            placeholder="性格备注（会喂给 AI）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button className="btn-primary md:col-span-2" type="submit">
            创建档案
          </button>
        </form>
      )}

      {error && <p className="text-sm text-clay">{error}</p>}

      {loading ? (
        <p className="text-ink/50">加载中…</p>
      ) : pets.length === 0 ? (
        <div className="card-soft text-center text-ink/60">
          还没有宠物。点右上角「添加宠物」开始。
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} emotion={emotions[pet.id]} />
          ))}
        </div>
      )}

      {pets[0] && (
        <div className="flex flex-wrap gap-3">
          <Link className="btn-ghost" href={`/chat/${pets[0].id}`}>
            和 {pets[0].name} 聊聊
          </Link>
          <Link className="btn-ghost" href={`/pets/${pets[0].id}`}>
            查看日记 / MBTI
          </Link>
        </div>
      )}
    </div>
  );
}
