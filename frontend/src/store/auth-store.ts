import { create } from 'zustand';
import { tokenStore } from '@/lib/api';
import { authService, userService } from '@/lib/services';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string) => void;
  loadMe: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  setUser: (user) => set({ user }),
  setToken: (token) => tokenStore.set(token),

  loadMe: async () => {
    if (!tokenStore.get()) {
      set({ initialized: true });
      return;
    }
    set({ loading: true });
    try {
      const user = await userService.me();
      set({ user });
    } catch {
      tokenStore.clear();
      set({ user: null });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    set({ user: null });
  },
}));
