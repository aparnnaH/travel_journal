// Starts the Canva OAuth PKCE flow.
// The route creates a verifier/challenge pair, stores temporary state in an
// HTTP-only cookie, and redirects the browser to Canva.
import { NextRequest, NextResponse } from 'next/server';
import { DEMO_COOKIE_MAX_AGE_SECONDS, DEMO_COOKIE_NAME, isDemoRequestCookie, isLocalHostName } from '@/lib/demoMode';
import { createCanvaAuthorizationUrl, getCanvaOAuthCookieName } from '@/lib/server/canva';
import { checkApiRateLimitForRequest, resolveSameOriginPath } from '@/lib/server/apiSafety';

export const runtime = 'nodejs';

// Redirects to Canva's authorization URL and remembers where to return inside
// the app after OAuth completes.
export async function GET(request: NextRequest) {
  try {
    const isLocalDemoRequest = isLocalHostName(request.nextUrl.hostname);
    const shouldUseDemoCanva = isLocalDemoRequest || isDemoRequestCookie(request.cookies.get(DEMO_COOKIE_NAME)?.value);

    if (shouldUseDemoCanva) {
      const rateLimitError = checkApiRateLimitForRequest('canva-local-oauth', request);

      if (rateLimitError) {
        return rateLimitError;
      }
    }

    const returnTo = resolveSameOriginPath(request.nextUrl.searchParams.get('returnTo'), '/journal');
    const redirectUri = isLocalDemoRequest ? new URL('/api/canva/oauth/callback', request.url).toString() : undefined;
    const { url, cookie } = createCanvaAuthorizationUrl(returnTo, redirectUri);
    const response = NextResponse.redirect(url);

    response.cookies.set(getCanvaOAuthCookieName(), cookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      maxAge: 10 * 60,
      path: '/',
    });

    if (isLocalDemoRequest) {
      response.cookies.set(DEMO_COOKIE_NAME, 'true', {
        httpOnly: false,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:',
        maxAge: DEMO_COOKIE_MAX_AGE_SECONDS,
        path: '/',
      });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start Canva authorization.';
    return NextResponse.redirect(new URL(`/journal?canva=error&message=${encodeURIComponent(message)}`, request.url));
  }
}
