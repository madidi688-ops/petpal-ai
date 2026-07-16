'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, apiUrl, uploadFile } from '@/lib/api';
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

const MOOD_CHIPS = ['开心', '黏人', '兴奋', '犯困', '馋嘴', '炸毛'];

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
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onPick(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (file && file.size > 5 * 1024 * 1024) {
        throw new Error('图片需 ≤5MB');
      }
      let imageUrl: string | undefined;
      if (file) {
        const uploaded = await uploadFile(file);
        imageUrl = uploaded.url.startsWith('http')
          ? uploaded.url
          : apiUrl(uploaded.url);
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
      onPick(null);
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
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              type === t.value
                ? 'bg-moss text-white'
                : 'bg-mist text-ink/70 hover:bg-moss/15'
            }`}
            onClick={() => setType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <textarea
        className="input"
        rows={3}
        placeholder="发生了什么？（可选）"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="space-y-1.5">
        <p className="text-xs text-ink/45">心情标签</p>
        <div className="flex flex-wrap gap-1.5">
          {MOOD_CHIPS.map((m) => (
            <button
              key={m}
              type="button"
              className={`rounded-full px-2.5 py-1 text-xs transition ${
                moodTag === m
                  ? 'bg-clay/90 text-white'
                  : 'bg-mist text-ink/60 hover:bg-clay/15'
              }`}
              onClick={() => setMoodTag((prev) => (prev === m ? '' : m))}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <label className="block cursor-pointer text-sm text-ink/60">
        <span className="btn-ghost inline-block px-3 py-1.5 text-xs">选择图片（可选）</span>
        <input
          className="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </label>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-24 w-24 rounded-xl object-cover ring-1 ring-ink/10" />
      )}
      {error && <p className="text-sm text-clay">{error}</p>}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? '保存中…' : '保存记录'}
      </button>
    </form>
  );
}
