'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { DiaryEntry, MbtiProfile, Pet } from '@/lib/types';
import { MbtiRadar } from '@/components/mbti-radar';

export default function PetDetailPage() {
  const params = useParams();
  const petId = params.petId as string;
  const [pet, setPet] = useState<Pet | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [mbti, setMbti] = useState<MbtiProfile | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const [p, d, m] = await Promise.all([
        api<Pet>(`/pets/${petId}`),
        api<DiaryEntry[]>(`/pets/${petId}/diary`),
        api<MbtiProfile | null>(`/pets/${petId}/mbti`),
      ]);
      setPet(p);
      setDiaries(d);
      setMbti(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    }
  }

  useEffect(() => {
    load();
  }, [petId]);

  async function generateDiary() {
    setBusy('diary');
    setError('');
    try {
      await api(`/pets/${petId}/diary/generate`, { method: 'POST', json: {} });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setBusy('');
    }
  }

  async function refreshMbti() {
    setBusy('mbti');
    setError('');
    try {
      const profile = await api<MbtiProfile>(`/pets/${petId}/mbti/refresh`, {
        method: 'POST',
        json: {},
      });
      setMbti(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-ink/50 hover:text-ink">
            ← 返回
          </Link>
          <h1 className="font-display text-3xl font-bold">{pet?.name ?? '宠物详情'}</h1>
          {pet?.personalityNotes && (
            <p className="mt-2 max-w-xl text-sm text-ink/60">{pet.personalityNotes}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-ghost" href={`/chat/${petId}`}>
            去对话
          </Link>
          <Link className="btn-ghost" href="/behaviors">
            记行为
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">AI 日记</h2>
            <button
              className="btn-primary"
              type="button"
              disabled={busy === 'diary'}
              onClick={generateDiary}
            >
              {busy === 'diary' ? '生成中…' : '生成今日日记'}
            </button>
          </div>
          {diaries.length === 0 ? (
            <div className="card-soft text-sm text-ink/50">还没有日记。先记几条行为再生成。</div>
          ) : (
            <div className="space-y-3">
              {diaries.map((d) => (
                <article key={d.id} className="card-soft space-y-2">
                  <div className="flex items-center justify-between text-xs text-ink/45">
                    <span>{String(d.date).slice(0, 10)}</span>
                    <span>心情 {d.moodScore}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                    {d.content}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">MBTI 画像</h2>
            <button
              className="btn-primary"
              type="button"
              disabled={busy === 'mbti'}
              onClick={refreshMbti}
            >
              {busy === 'mbti' ? '分析中…' : '刷新画像'}
            </button>
          </div>
          {mbti ? (
            <MbtiRadar profile={mbti} />
          ) : (
            <div className="card-soft text-sm text-ink/50">
              还没有画像。积累行为后再点「刷新画像」。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
