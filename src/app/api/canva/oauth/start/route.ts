import { NextRequest, NextResponse } from 'next/server';
import { createCanvaAuthorizationUrl, getCanvaOAuthCookieName } from '@/lib/server/canva';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const returnTo = request.nextUrl.searchParams.get('returnTo') || '/journal';
    const { url, cookie } = createCanvaAuthorizationUrl(returnTo);
    const response = NextResponse.redirect(url);

    response.cookies.set(getCanvaOAuthCookieName(), cookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      maxAge: 10 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start Canva authorization.';
    return NextResponse.redirect(new URL(`/journal?canva=error&message=${encodeURIComponent(message)}`, request.url));
  }
}

