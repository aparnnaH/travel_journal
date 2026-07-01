// Clears browser-scoped demo cookies that client code cannot remove directly.
import { NextResponse } from 'next/server';
import { DEMO_COOKIE_NAME } from '@/lib/demoMode';
import { getCanvaLocalConnectionCookieName, getCanvaOAuthCookieName } from '@/lib/server/canva';

export const runtime = 'nodejs';

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.delete(DEMO_COOKIE_NAME);
  response.cookies.delete(getCanvaLocalConnectionCookieName());
  response.cookies.delete(getCanvaOAuthCookieName());

  return response;
}
