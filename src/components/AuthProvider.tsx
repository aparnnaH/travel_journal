'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fetchProfile } from '@/lib/profileService';
import { useAuthStore } from '@/store/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  useEffect(() => {
    let subscription: { unsubscribe?: () => void } | null = null;

    const initialize = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (user) {
        const profileResponse = await fetchProfile(user.id);
        const profile = profileResponse?.success && profileResponse?.data?.[0];

        setUser({
          id: user.id,
          email: user.email || '',
          displayName:
            profile?.displayName || user.user_metadata?.full_name || undefined,
          avatar: profile?.avatar || user.user_metadata?.avatar_url || undefined,
          createdAt: profile?.createdAt || (user.created_at as string) || new Date().toISOString(),
        });
      } else {
        logout();
      }
      setLoading(false);
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user;
        if (event === 'SIGNED_IN' && user) {
          const profileResponse = await fetchProfile(user.id);
          const profile = profileResponse?.success && profileResponse?.data?.[0];

          setUser({
            id: user.id,
            email: user.email || '',
            displayName:
              profile?.displayName || user.user_metadata?.full_name || undefined,
            avatar: profile?.avatar || user.user_metadata?.avatar_url || undefined,
            createdAt: profile?.createdAt || (user.created_at as string) || new Date().toISOString(),
          });
        }

        if (event === 'SIGNED_OUT') {
          logout();
          router.replace('/login');
        }

        setLoading(false);
      }
    );

    subscription = authListener?.subscription ?? null;

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [setUser, setLoading, logout, router]);

  return <>{children}</>;
}
