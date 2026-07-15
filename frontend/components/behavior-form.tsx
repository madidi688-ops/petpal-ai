'use client';

import { FormEvent, useState } from 'react';
import { api, uploadFile } from '@/lib/api';
import type { BehaviorEvent } from '@/lib/types';

const TYPES = [
  { value: 'eat', label: '吃饭' },
  { value: 'drink', label: '喝水' },
  { value: 'sleep', label: '睡觉' },
  { value: 'play', label: '玩耍' },
  { value: 'groom', label: '梳毛/舔毛' },
  { value: 'toilet', label: '如厕' },
  { value: 'other', label: '其他' },
];

export function BehaviorForm({
  petId,
  onCreated,
}: {
  petId: string;
  onCreated?: (event: BehaviorEvent) => void;
}) {
  const [type, setType] = useState('play');
  const [note, setNote] = useState('');
  const [moodTag, setMoodTag] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let imageUrl: string | undefined;
      if (file) {
        const uploaded = await uploadFile(file);
        imageUrl = uploaded.url.startsWith('http')
          ? uploaded.url
          : `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'}${uploaded.url}`;
      }
      const event = await api<BehaviorEvent>(`/pets/${petId}/behaviors`, {
        method: 'POST',
        json: {
          type,
          note: note || undefined,
          moodTag: moodTag || undefined,
          imageUrl,
        },
      });
      setNote('');
      setMoodTag('');
      setFile(null);
      onCreated?.(event);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-soft space-y-3">
      <h3 className="font-display text-lg font-semibold">记录一次行为</h3>
      <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <textarea
        className="input"
        rows={3}
        placeholder="发生了什么？（可选）"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <input
        className="input"
        placeholder="情绪标签，如 playful"
        value={moodTag}
        onChange={(e) => setMoodTag(e.target.value)}
      />
      <input
        className="block w-full text-sm text-ink/60"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {error && <p className="text-sm text-clay">{error}</p>}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? '保存中…' : '保存记录'}
      </button>
    </form>
  );
}
