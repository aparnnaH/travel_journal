// Client-side auth provider for the whole app.
// It hydrates Supabase auth into the Zustand auth store and keeps the
// server-readable session cookie synchronized with the browser session.
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient, syncAuthCookie } from '@/lib/supabase';
import { fetchProfile } from '@/lib/profileService';
import { demoMapState, demoUser, enableDemoMode, isDemoMode, isLocalDemoHost, seedDemoLocalContext } from '@/lib/demoMode';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';
import type { AuthUser } from '@/types';
import DemoModeBanner from './demo/DemoModeBanner';
import MapCloudSync from './MapCloudSync';

interface AuthProviderProps {
  children: React.ReactNode;
}

// Profile rows may be returned with database snake_case fields or normalized
// camelCase fields depending on which service mapped the response.
interface ProfileRecord {
  displayName?: string | null;
  display_name?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
}

// Pulls the first profile row out of the standard API response shape.
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

// Combines Supabase Auth identity with optional profile table details into the
// normalized AuthUser shape used by the UI.
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

// AuthProvider runs once near the root of the client tree. It initializes auth,
// subscribes to future auth events, and renders children only after mounting the
// app-wide cloud sync helper.
export default function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const logout = useAuthStore((state) => state.logout);
  const replaceMapState = useMapStore((state) => state.replaceMapState);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let subscription: { unsubscribe?: () => void } | null = null;
    const isAuthRoute = pathname === '/login' || pathname === '/signup';

    const initializeDemo = async () => {
      setLoading(true);
      await syncAuthCookie(null);
      enableDemoMode();
      seedDemoLocalContext();
      setUser(demoUser);
      replaceMapState(demoMapState);
      setLoading(false);
    };

    if (isDemoMode()) {
      void initializeDemo();

      return () => {
        subscription?.unsubscribe?.();
      };
    }

    // Initial hydration reads any existing Supabase browser session and mirrors
    // it into the app cookie so API routes can authenticate immediately.
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
        } else if (!isAuthRoute && isLocalDemoHost()) {
          await initializeDemo();
        } else {
          await syncAuthCookie(null);
          logout();
        }
      } catch (error) {
        console.warn('Unable to initialize authentication.', error);
        if (!isAuthRoute && isLocalDemoHost()) {
          await initializeDemo();
        } else {
          await syncAuthCookie(null);
          logout();
        }
      } finally {
        setLoading(false);
      }
    };

    initialize();

    try {
      const supabase = getSupabaseClient();
      // Supabase emits auth events when the browser session changes. The store
      // and HTTP-only cookie must be updated together to avoid split-brain auth.
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
  }, [setUser, setLoading, logout, router, replaceMapState, pathname]);

  return (
    <>
      <MapCloudSync />
      <DemoModeBanner />
      {children}
    </>
  );
}
