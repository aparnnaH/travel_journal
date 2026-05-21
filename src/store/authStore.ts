import { create } from 'zustand';
import type { AuthUser } from '@/types';

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  logout: () => set({ user: null, error: null }),
}));
