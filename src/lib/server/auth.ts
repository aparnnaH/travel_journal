// Shared authentication helper for protected App Router route handlers.
// It converts the app's HTTP-only session cookie or Authorization header into a
// verified Supabase user plus the privileged admin client.
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { DEMO_COOKIE_NAME, isDemoRequestCookie } from '@/lib/demoMode';
import { authCookieName } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export type AuthenticatedRouteContext = {
  supabaseAdmin: SupabaseClient;
  user: User;
};

// Standard error envelope used by protected route handlers.
export function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

// Validates the request session and returns the route context used by API
// handlers. This keeps token parsing and expired-session messages consistent.
export async function getAuthenticatedRouteContext(
  request: NextRequest,
  featureName = 'this feature'
): Promise<AuthenticatedRouteContext | NextResponse> {
  if (isDemoRequestCookie(request.cookies.get(DEMO_COOKIE_NAME)?.value)) {
    return jsonError('Demo mode does not write to cloud services.', 403);
  }

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

// Type guard that lets handlers return early when auth failed.
export function isRouteError(context: AuthenticatedRouteContext | NextResponse): context is NextResponse {
  return context instanceof NextResponse;
}
