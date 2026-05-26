'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, syncAuthCookie } from '@/lib/supabase';
import { fetchProfile, createOrUpdateProfile } from '@/lib/profileService';
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
      const { data: sessionData } = await supabase.auth.getSession();
      syncAuthCookie(sessionData.session?.access_token ?? null);

      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (user) {
        const profileResponse = await fetchProfile(user.id);
        const profile = profileResponse?.success && profileResponse?.data?.[0];

        // If profile doesn't exist, create one
        if (!profile) {
          await createOrUpdateProfile({
            id: user.id,
            email: user.email || '',
            displayName: user.user_metadata?.full_name || undefined,
            avatar: user.user_metadata?.avatar_url || undefined,
            createdAt: new Date().toISOString(),
          });
        }

        setUser({
          id: user.id,
          email: user.email || '',
          displayName:
            profile?.display_name || user.user_metadata?.full_name || undefined,
          avatar: profile?.avatar_url || user.user_metadata?.avatar_url || undefined,
          createdAt: profile?.created_at || (user.created_at as string) || new Date().toISOString(),
        });
      } else {
        logout();
      }
      setLoading(false);
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        syncAuthCookie(session?.access_token ?? null);

        const user = session?.user;
        if (event === 'SIGNED_IN' && user) {
          const profileResponse = await fetchProfile(user.id);
          const profile = profileResponse?.success && profileResponse?.data?.[0];

          // If profile doesn't exist, create one
          if (!profile) {
            await createOrUpdateProfile({
              id: user.id,
              email: user.email || '',
              displayName: user.user_metadata?.full_name || undefined,
              avatar: user.user_metadata?.avatar_url || undefined,
              createdAt: new Date().toISOString(),
            });
          }

          setUser({
            id: user.id,
            email: user.email || '',
            displayName:
              profile?.display_name || user.user_metadata?.full_name || undefined,
            avatar: profile?.avatar_url || user.user_metadata?.avatar_url || undefined,
            createdAt: profile?.created_at || (user.created_at as string) || new Date().toISOString(),
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
