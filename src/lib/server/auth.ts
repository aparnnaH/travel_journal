import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { authCookieName } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export type AuthenticatedRouteContext = {
  supabaseAdmin: SupabaseClient;
  user: User;
};

export function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function getAuthenticatedRouteContext(
  request: NextRequest,
  featureName = 'this feature'
): Promise<AuthenticatedRouteContext | NextResponse> {
  const token = request.cookies.get(authCookieName)?.value || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return jsonError(`You need to be signed in to use ${featureName}.`, 401);
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return jsonError('Your session expired. Please sign in again.', 401);
  }

  return { supabaseAdmin, user: data.user };
}

export function isRouteError(context: AuthenticatedRouteContext | NextResponse): context is NextResponse {
  return context instanceof NextResponse;
}
