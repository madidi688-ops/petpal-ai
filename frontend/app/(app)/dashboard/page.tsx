'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { EmotionLog, Pet } from '@/lib/types';
import { PetCard } from '@/components/pet-card';
import { PetAvatar } from '@/components/pet-avatar';

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

  const primary = pets[0];

  return (
    <div className="space-y-8">
      <section className="animate-rise relative min-h-[52vh] overflow-hidden rounded-3xl border border-ink/5 md:min-h-[58vh]">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/media/cat-eating.mp4?v=2"
          poster="/media/cat.jpg?v=2"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[#1c1917]/78 via-[#1c1917]/45 to-transparent"
        />
        <div className="relative z-10 flex h-full min-h-[52vh] max-w-xl flex-col justify-end px-6 py-10 text-cream md:min-h-[58vh] md:px-10 md:py-14">
          <p className="font-display text-4xl font-bold tracking-tight md:text-5xl">PetPal AI</p>
          <p className="mt-3 text-base text-cream/80 md:text-lg">读懂毛孩子的一天</p>
          {primary && (
            <div className="mt-6 flex flex-wrap gap-2">
              <Link className="btn-primary" href={`/chat/${primary.id}`}>
                和 {primary.name} 聊聊
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-xl border border-cream/30 bg-cream/10 px-4 py-2.5 text-sm font-medium text-cream backdrop-blur transition hover:bg-cream/20"
                href={`/pets/${primary.id}`}
              >
                上传头像 / 日记
              </Link>
            </div>
          )}
        </div>
      </section>

      {primary && (
        <section className="animate-rise" style={{ animationDelay: '60ms' }}>
          <div className="mb-4 flex items-center gap-3">
            <PetAvatar pet={primary} size="md" />
            <div>
              <h2 className="font-display text-lg font-semibold">2 分钟演示路径</h2>
              <p className="text-xs text-ink/45">
                登录 → 发猫视频 → 记行为 → 生成日记（按顺序点，别乱点）
              </p>
            </div>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            <li className="overflow-hidden rounded-2xl border border-ink/5 bg-white/70 shadow-[0_10px_40px_-24px_rgba(28,25,23,0.35)]">
              <video
                className="h-28 w-full object-cover"
                src="/media/cat-eating.mp4?v=2"
                muted
                loop
                autoPlay
                playsInline
                aria-hidden
              />
              <div className="p-4">
                <p className="text-xs font-semibold text-moss">01 发猫视频</p>
                <p className="mt-1 text-sm text-ink/70">打开和 {primary.name} 的聊天，发短视频看它怎么回</p>
                <Link className="mt-3 inline-block text-sm text-moss underline" href={`/chat/${primary.id}`}>
                  去聊天 →
                </Link>
              </div>
            </li>
            <li className="overflow-hidden rounded-2xl border border-ink/5 bg-white/70 shadow-[0_10px_40px_-24px_rgba(28,25,23,0.35)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/media/cat.jpg?v=2" alt="" className="h-28 w-full object-cover" />
              <div className="p-4">
                <p className="text-xs font-semibold text-moss">02 记行为</p>
                <p className="mt-1 text-sm text-ink/70">记一条吃 / 玩 / 睡，给日记留素材</p>
                <Link className="mt-3 inline-block text-sm text-moss underline" href="/behaviors">
                  去记行为 →
                </Link>
              </div>
            </li>
            <li className="overflow-hidden rounded-2xl border border-ink/5 bg-white/70 shadow-[0_10px_40px_-24px_rgba(28,25,23,0.35)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/media/dog.jpg?v=2" alt="" className="h-28 w-full object-cover" />
              <div className="p-4">
                <p className="text-xs font-semibold text-moss">03 生成日记</p>
                <p className="mt-1 text-sm text-ink/70">详情页点「生成今日日记」，再截分享卡</p>
                <Link className="mt-3 inline-block text-sm text-moss underline" href={`/pets/${primary.id}`}>
                  去生成 →
                </Link>
              </div>
            </li>
          </ol>
        </section>
      )}

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
        <div className="card-soft grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/cat.jpg?v=2" alt="" className="h-36 w-full rounded-2xl object-cover sm:h-40" />
          <div className="space-y-3">
            <p className="font-display text-xl text-ink/80">还没有毛孩子</p>
            <p className="text-sm text-ink/55">添加宠物后，就能用真实照片和视频把演示做活。</p>
            <button className="btn-primary" type="button" onClick={() => setShowForm(true)}>
              添加第一只宠物
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} emotion={emotions[pet.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
