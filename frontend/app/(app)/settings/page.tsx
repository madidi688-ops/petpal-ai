'use client';

import { useAuthStore } from '@/lib/auth-store';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-3xl font-bold">设置</h1>
      <div className="card-soft space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-ink/50">账号</span>
          <span>{user?.email ?? '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-ink/50">昵称</span>
          <span>{user?.name ?? '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-ink/50">API</span>
          <span className="truncate font-mono text-xs">{apiBase}</span>
        </div>
      </div>
      <p className="text-sm text-ink/55">
        DeepSeek Key 配置在根目录 <code className="rounded bg-mist px-1">.env</code> 的{' '}
        <code className="rounded bg-mist px-1">DEEPSEEK_API_KEY</code>。未配置时对话走演示模式。
      </p>
    </div>
  );
}
