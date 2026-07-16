'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, uploadFile } from '@/lib/api';
import type { DiaryEntry, MbtiProfile, Pet } from '@/lib/types';
import { MbtiRadar } from '@/components/mbti-radar';
import { PetAvatar } from '@/components/pet-avatar';
import { DiaryShareCard } from '@/components/diary-share-card';

export default function PetDetailPage() {
  const params = useParams();
  const petId = params.petId as string;
  const [pet, setPet] = useState<Pet | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [mbti, setMbti] = useState<MbtiProfile | null>(null);
  const [behaviorCount, setBehaviorCount] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const [p, d, m, behaviors] = await Promise.all([
        api<Pet>(`/pets/${petId}`),
        api<DiaryEntry[]>(`/pets/${petId}/diary`),
        api<MbtiProfile | null>(`/pets/${petId}/mbti`),
        api<{ id: string }[]>(`/pets/${petId}/behaviors?take=100`).catch(() => []),
      ]);
      setPet(p);
      setDiaries(d);
      setMbti(m);
      setBehaviorCount(behaviors.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    }
  }

  useEffect(() => {
    load();
  }, [petId]);

  async function onAvatarPick(file: File | null) {
    if (!file || !file.type.startsWith('image/')) {
      setError('请选择图片作为头像');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('头像需 ≤5MB');
      return;
    }
    setBusy('avatar');
    setError('');
    try {
      const uploaded = await uploadFile(file);
      const updated = await api<Pet>(`/pets/${petId}`, {
        method: 'PATCH',
        json: { avatarUrl: uploaded.url },
      });
      setPet(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '头像上传失败');
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

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
        <div className="flex items-start gap-4">
          <div className="relative">
            <PetAvatar pet={pet} size="lg" />
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onAvatarPick(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="btn-ghost mt-2 w-full px-2 py-1 text-xs"
              disabled={busy === 'avatar'}
              onClick={() => fileRef.current?.click()}
            >
              {busy === 'avatar' ? '上传中…' : pet?.avatarUrl ? '更换头像' : '上传头像'}
            </button>
          </div>
          <div>
            <Link href="/dashboard" className="text-sm text-ink/50 hover:text-ink">
              ← 返回
            </Link>
            <h1 className="font-display text-3xl font-bold">{pet?.name ?? '宠物详情'}</h1>
            {pet?.personalityNotes && (
              <p className="mt-2 max-w-xl text-sm text-ink/60">{pet.personalityNotes}</p>
            )}
            <p className="mt-1 text-xs text-ink/40">上传照片后，对话里会显示 TA 的头像</p>
          </div>
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
            <div className="card-soft space-y-2 text-sm text-ink/50">
              <p>还没有日记。先记几条行为再生成。</p>
              <Link href="/behaviors" className="text-moss underline">
                去记行为
              </Link>
            </div>
          ) : pet ? (
            <div className="space-y-4">
              {diaries.map((d) => (
                <DiaryShareCard key={d.id} pet={pet} diary={d} />
              ))}
            </div>
          ) : null}
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
            <MbtiRadar profile={mbti} behaviorCount={behaviorCount} />
          ) : (
            <div className="card-soft space-y-2 text-sm text-ink/50">
              <p>还没有画像。积累行为后再点「刷新画像」。</p>
              <p className="text-xs text-ink/40">当前已有 {behaviorCount} 条行为记录</p>
              <Link href="/behaviors" className="text-moss underline">
                去记行为
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
