import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Initialize Supabase client
 * Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * in your .env.local file
 */
let browserClient: SupabaseClient | null = null;

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseClient() {
  if (!browserClient) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

export const authCookieName = 'sb-access-token';

export async function syncAuthCookie(token: string | null, expiresAt?: number | null) {
  if (typeof window === 'undefined') return;

  try {
    if (token) {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, expiresAt }),
      });
      return;
    }

    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch (error) {
    console.warn('Unable to sync auth session cookie.', error);
  }
}

// Auth helpers (client-side)
export async function signUpWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  const result = await supabase.auth.signUp({ email, password });
  const token = result.data?.session?.access_token ?? null;
  await syncAuthCookie(token, result.data?.session?.expires_at ?? null);
  return result;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  const result = await supabase.auth.signInWithPassword({ email, password });
  const token = result.data?.session?.access_token ?? null;
  await syncAuthCookie(token, result.data?.session?.expires_at ?? null);
  return result;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const result = await supabase.auth.signOut();
  await syncAuthCookie(null);
  return result;
}

export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function updateUserMetadata(metadata: {
  full_name?: string | null;
  avatar_url?: string | null;
}) {
  const supabase = getSupabaseClient();
  return supabase.auth.updateUser({ data: metadata });
}
