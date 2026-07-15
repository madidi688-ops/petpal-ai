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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data =
        mode === 'login'
          ? await login(email, password)
          : await register(email, password, name || undefined);
      setUser(data.user);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft-mesh px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
            PetPal <span className="text-moss">AI</span>
          </h1>
          <p className="mt-3 text-ink/60">和你的宠物聊聊、记日记、看性格画像</p>
        </div>

        <form onSubmit={onSubmit} className="card-soft space-y-4">
          <div className="flex gap-2 rounded-xl bg-mist/60 p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                mode === 'login' ? 'bg-white shadow-sm' : 'text-ink/60'
              }`}
              onClick={() => setMode('login')}
            >
              登录
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                mode === 'register' ? 'bg-white shadow-sm' : 'text-ink/60'
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

          <p className="text-center text-xs text-ink/45">
            演示账号：demo@petpal.ai / demo1234（需先 seed）
          </p>
        </form>
      </div>
    </div>
  );
}
