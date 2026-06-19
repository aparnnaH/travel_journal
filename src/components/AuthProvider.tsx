'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient, syncAuthCookie } from '@/lib/supabase';
import { fetchProfile } from '@/lib/profileService';
import { useAuthStore } from '@/store/authStore';
import type { AuthUser } from '@/types';
import MapCloudSync from './MapCloudSync';

interface AuthProviderProps {
  children: React.ReactNode;
}

interface ProfileRecord {
  displayName?: string | null;
  display_name?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
}

function firstProfileRecord(response: unknown): ProfileRecord | null {
  if (!response || typeof response !== 'object') return null;

  const profileResponse = response as {
    success?: boolean;
    data?: unknown;
  };

  if (!profileResponse.success || !Array.isArray(profileResponse.data)) return null;

  const [profile] = profileResponse.data;
  return profile && typeof profile === 'object' ? (profile as ProfileRecord) : null;
}

async function buildAuthUser(user: User): Promise<AuthUser> {
  let profile: ProfileRecord | null = null;

  try {
    profile = firstProfileRecord(await fetchProfile());
  } catch (error) {
    console.warn('Unable to load user profile during auth initialization.', error);
  }

  return {
    id: user.id,
    email: user.email || '',
    displayName:
      profile?.displayName ??
      profile?.display_name ??
      user.user_metadata?.full_name ??
      undefined,
    avatar:
      profile?.avatar ??
      profile?.avatar_url ??
      user.user_metadata?.avatar_url ??
      undefined,
    createdAt:
      profile?.createdAt ??
      profile?.created_at ??
      (user.created_at as string) ??
      new Date().toISOString(),
  };
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
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        await syncAuthCookie(
          sessionData.session?.access_token ?? null,
          sessionData.session?.expires_at ?? null
        );

        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (user) {
          setUser(await buildAuthUser(user));
        } else {
          await syncAuthCookie(null);
          logout();
        }
      } catch (error) {
        console.warn('Unable to initialize authentication.', error);
        await syncAuthCookie(null);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initialize();

    try {
      const supabase = getSupabaseClient();
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          const user = session?.user;
          await syncAuthCookie(session?.access_token ?? null, session?.expires_at ?? null);

          if (event === 'SIGNED_IN' && user) {
            setLoading(true);
            setUser(await buildAuthUser(user));
          }

          if (event === 'SIGNED_OUT') {
            logout();
            router.replace('/login');
          }

          setLoading(false);
        }
      );

      subscription = authListener?.subscription ?? null;
    } catch (error) {
      console.warn('Unable to subscribe to authentication changes.', error);
    }

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [setUser, setLoading, logout, router]);

  return (
    <>
      <MapCloudSync />
      {children}
    </>
  );
}
