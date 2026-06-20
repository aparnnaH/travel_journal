// Session-cookie route for bridging Supabase browser auth to server APIs.
// The browser gets an access token from Supabase; this route verifies it and
// stores it in an HTTP-only cookie that route handlers can trust.
import { NextRequest, NextResponse } from 'next/server';
import { authCookieName } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

type SessionRequestBody = {
  token?: string;
  expiresAt?: number | null;
};

// Caps the cookie lifetime so stale tokens are not kept indefinitely, while
// still respecting the Supabase token expiration when provided.
const getSessionMaxAge = (expiresAt?: number | null) => {
  if (!expiresAt) return 60 * 60;

  const secondsRemaining = Math.floor(expiresAt - Date.now() / 1000);
  return Math.max(60, Math.min(secondsRemaining, 60 * 60));
};

// Validates a Supabase access token and writes it to the app session cookie.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as SessionRequestBody;
  const token = typeof body.token === 'string' ? body.token.trim() : '';

  if (!token) {
    return NextResponse.json({ success: false, error: 'Missing session token.' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return NextResponse.json({ success: false, error: 'Invalid session token.' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(authCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    maxAge: getSessionMaxAge(body.expiresAt),
    path: '/',
  });

  return response;
}

// Clears the app session cookie during sign-out or auth initialization failure.
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set(authCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    maxAge: 0,
    path: '/',
  });

  return response;
}
