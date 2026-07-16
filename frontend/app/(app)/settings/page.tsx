'use client';

import { useAuthStore } from '@/lib/auth-store';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

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
      </div>

      <div className="card-soft space-y-2 text-sm text-ink/70">
        <h2 className="font-display text-lg font-semibold text-ink">安装到手机</h2>
        <p>
          支持「添加到主屏幕」。在安全连接（HTTPS）或电脑本地环境下：
        </p>
        <ul className="list-disc space-y-1 pl-5 text-ink/60">
          <li>Chrome / Edge：菜单 → 安装应用</li>
          <li>iOS Safari：分享 → 添加到主屏幕</li>
        </ul>
        <p className="text-xs text-ink/45">手机录音与安装通常需要 HTTPS。</p>
      </div>

      <p className="text-sm text-ink/55">对话与日记由云端 AI 生成；若暂时不可用，请稍后再试。</p>
    </div>
  );
}
