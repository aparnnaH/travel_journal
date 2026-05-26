import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const authCookieName = 'sb-access-token';

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookieName)?.value;

  if (!accessToken) {
    return { user: null, error: 'Authentication required' };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data.user) {
    return { user: null, error: 'Invalid or expired session' };
  }

  return { user: data.user, error: null };
}
