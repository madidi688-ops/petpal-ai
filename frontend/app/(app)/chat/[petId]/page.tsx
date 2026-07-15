'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { ChatMessage, EmotionLog, Pet } from '@/lib/types';
import { ChatBubble } from '@/components/chat-bubble';
import { EmotionTag } from '@/components/emotion-tag';

export default function ChatPage() {
  const params = useParams();
  const petId = params.petId as string;
  const [pet, setPet] = useState<Pet | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState<EmotionLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Pet>(`/pets/${petId}`)
      .then(setPet)
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, [petId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || loading) return;
    const text = content.trim();
    setContent('');
    setLoading(true);
    setError('');
    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await api<{
        sessionId: string;
        message: ChatMessage;
        emotion: EmotionLog;
      }>(`/pets/${petId}/chat`, {
        method: 'POST',
        json: { content: text, sessionId },
      });
      setSessionId(res.sessionId);
      setMessages((prev) => [...prev, res.message]);
      setEmotion(res.emotion);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-ink/50 hover:text-ink">
            ← 返回
          </Link>
          <h1 className="font-display text-2xl font-bold">
            和 {pet?.name ?? '…'} 聊聊
          </h1>
        </div>
        {emotion && <EmotionTag emotion={emotion.emotion} score={emotion.score} />}
      </div>

      <div className="card-soft flex h-[55vh] flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="m-auto text-center text-sm text-ink/45">
            跟他说今天发生了什么吧。<br />也可以问「你开心吗？」
          </p>
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} role={m.role} content={m.content} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}

      <form onSubmit={send} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={`对 ${pet?.name ?? '它'} 说点什么…`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
        />
        <button className="btn-primary" type="submit" disabled={loading || !content.trim()}>
          {loading ? '…' : '发送'}
        </button>
      </form>
    </div>
  );
}
