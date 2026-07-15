'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

const NAV = [
  { href: '/dashboard', label: '首页' },
  { href: '/behaviors', label: '行为' },
  { href: '/settings', label: '设置' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('petpal_token') : null;
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!user) {
      api<AuthUser>('/auth/me')
        .then(setUser)
        .catch(() => {
          logout();
          router.replace('/login');
        });
    }
  }, [user, setUser, logout, router]);

  return (
    <div className="min-h-screen bg-soft-mesh">
      <header className="sticky top-0 z-20 border-b border-ink/5 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="font-display text-xl font-bold tracking-tight text-ink">
            PetPal <span className="text-moss">AI</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  pathname.startsWith(item.href)
                    ? 'bg-moss/10 font-semibold text-moss'
                    : 'text-ink/70 hover:bg-white/60'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.replace('/login');
                }}
                className="ml-2 text-sm text-ink/50 hover:text-ink"
              >
                退出
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
