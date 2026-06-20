// Browser-side Supabase helpers.
// This file is intentionally client-safe: it uses the public anon key and
// forwards the access token to our own session route so server APIs can validate
// authenticated requests through an HTTP-only cookie.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Initialize Supabase client
 * Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * in your .env.local file
 */
let browserClient: SupabaseClient | null = null;

// Centralizes env validation so failed Supabase setup produces one clear error
// instead of scattered undefined-client failures throughout the app.
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

// Lazily creates a singleton browser client. Lazy creation prevents build-time
// crashes when env vars are not available during static analysis.
export function getSupabaseClient() {
  if (!browserClient) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

export const authCookieName = 'sb-access-token';

// Mirrors the Supabase browser session into an HTTP-only app cookie.
// Route handlers cannot trust localStorage, so they read this cookie instead.
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
// Creates a Supabase Auth account and syncs the initial session if one is returned.
export async function signUpWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  const result = await supabase.auth.signUp({ email, password });
  const token = result.data?.session?.access_token ?? null;
  await syncAuthCookie(token, result.data?.session?.expires_at ?? null);
  return result;
}

// Signs in through Supabase Auth, then stores the access token for server APIs.
export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  const result = await supabase.auth.signInWithPassword({ email, password });
  const token = result.data?.session?.access_token ?? null;
  await syncAuthCookie(token, result.data?.session?.expires_at ?? null);
  return result;
}

// Signs out from Supabase and clears the app's server-readable session cookie.
export async function signOut() {
  const supabase = getSupabaseClient();
  const result = await supabase.auth.signOut();
  await syncAuthCookie(null);
  return result;
}

// Reads the current authenticated Supabase user from the browser session.
export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

// Keeps Supabase Auth metadata in sync with profile-facing account fields.
export async function updateUserMetadata(metadata: {
  full_name?: string | null;
  avatar_url?: string | null;
}) {
  const supabase = getSupabaseClient();
  return supabase.auth.updateUser({ data: metadata });
}
