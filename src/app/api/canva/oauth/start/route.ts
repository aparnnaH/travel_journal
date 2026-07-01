// Starts the Canva OAuth PKCE flow.
// The route creates a verifier/challenge pair, stores temporary state in an
// HTTP-only cookie, and redirects the browser to Canva.
import { NextRequest, NextResponse } from 'next/server';
import { DEMO_COOKIE_NAME, isDemoRequestCookie } from '@/lib/demoMode';
import { createCanvaAuthorizationUrl, getCanvaOAuthCookieName } from '@/lib/server/canva';
import { checkApiRateLimitForRequest, resolveSameOriginPath } from '@/lib/server/apiSafety';

export const runtime = 'nodejs';

// Redirects to Canva's authorization URL and remembers where to return inside
// the app after OAuth completes.
export async function GET(request: NextRequest) {
  try {
    if (isDemoRequestCookie(request.cookies.get(DEMO_COOKIE_NAME)?.value)) {
      const rateLimitError = checkApiRateLimitForRequest('canva-local-oauth', request);

      if (rateLimitError) {
        return rateLimitError;
      }
    }

    const returnTo = resolveSameOriginPath(request.nextUrl.searchParams.get('returnTo'), '/journal');
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
