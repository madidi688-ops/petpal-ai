'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('demo@petpal.ai');
  const [password, setPassword] = useState('demo1234');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function doLogin(em: string, pw: string) {
    setError('');
    setLoading(true);
    try {
      const data = await login(em, pw);
      setUser(data.user);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'login') {
      await doLogin(email, password);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await register(email, password, name || undefined);
      setUser(data.user);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-end overflow-hidden md:items-center">
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
        className="absolute inset-0 bg-gradient-to-t from-[#1c1917]/85 via-[#1c1917]/45 to-[#1c1917]/25 md:bg-gradient-to-r md:from-[#1c1917]/80 md:via-[#1c1917]/45 md:to-transparent"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-8 md:py-16">
        <div className="animate-rise text-cream">
          <p className="font-display text-4xl font-bold tracking-tight md:text-6xl">PetPal AI</p>
          <p className="mt-4 max-w-md text-base text-cream/80 md:text-lg">
            陪你看懂毛孩子的一天：对话、日记、性格画像。
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="animate-rise space-y-4 rounded-3xl border border-white/15 bg-cream/95 p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.55)] backdrop-blur md:p-6"
          style={{ animationDelay: '90ms' }}
        >
          <div className="flex gap-2 rounded-xl bg-mist/70 p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                mode === 'login' ? 'bg-white shadow-sm text-ink' : 'text-ink/60'
              }`}
              onClick={() => setMode('login')}
            >
              登录
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                mode === 'register' ? 'bg-white shadow-sm text-ink' : 'text-ink/60'
              }`}
              onClick={() => setMode('register')}
            >
              注册
            </button>
          </div>

          {mode === 'register' && (
            <input
              className="input"
              placeholder="昵称（可选）"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className="input"
            type="email"
            required
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            required
            minLength={6}
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-sm text-clay">{error}</p>}

          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? '请稍候…' : mode === 'login' ? '进入 PetPal' : '创建账号'}
          </button>

          {mode === 'login' && (
            <button
              type="button"
              className="btn-ghost w-full"
              disabled={loading}
              onClick={() => void doLogin('demo@petpal.ai', 'demo1234')}
            >
              一键体验演示账号
            </button>
          )}

          <p className="text-center text-xs text-ink/45">演示账号已预填：demo@petpal.ai / demo1234</p>
        </form>
      </div>
    </div>
  );
}
