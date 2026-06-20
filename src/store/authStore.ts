// Global auth UI state.
// Supabase owns the actual session; this Zustand store gives React components a
// small normalized view of the current user and loading/error status.
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

// The auth store deliberately stays tiny. AuthProvider is responsible for
// populating it; pages/components should read it instead of querying Supabase
// just to decide whether a user is signed in.
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  error: null,
  setUser: (user) => set({ user, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  logout: () => set({ user: null, error: null }),
}));
