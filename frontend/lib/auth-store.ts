'use client';

import { create } from 'zustand';
import type { AuthUser } from './types';
import { setToken } from './api';

type AuthState = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => {
    setToken(null);
    set({ user: null });
  },
}));
