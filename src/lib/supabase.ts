import { createClient } from '@supabase/supabase-js';

/**
 * Initialize Supabase client
 * Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * in your .env.local file
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables not set. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const authCookieName = 'sb-access-token';

export function setAuthCookie(token: string | null) {
  if (typeof document === 'undefined') {
    return;
  }

  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  if (token) {
    document.cookie = `${authCookieName}=${encodeURIComponent(token)}; path=/; SameSite=Lax; max-age=3600${secureFlag}`;
  } else {
    document.cookie = `${authCookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`;
  }
}

// Auth helpers (client-side)
export async function signUpWithEmail(email: string, password: string) {
  const result = await supabase.auth.signUp({ email, password });
  const token = result.data?.session?.access_token ?? null;
  setAuthCookie(token);
  return result;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await supabase.auth.signInWithPassword({ email, password });
  const token = result.data?.session?.access_token ?? null;
  setAuthCookie(token);
  return result;
}

export async function signOut() {
  const result = await supabase.auth.signOut();
  setAuthCookie(null);
  return result;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function updateUserMetadata(metadata: {
  full_name?: string | null;
  avatar_url?: string | null;
}) {
  return supabase.auth.updateUser({ data: metadata });
}
