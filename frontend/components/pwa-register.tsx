'use client';

import { useEffect } from 'react';

/** 注册 Service Worker，支持「添加到主屏幕」（需 HTTPS 或 localhost） */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // ignore — 开发态或非安全上下文可能失败
    });
  }, []);
  return null;
}
