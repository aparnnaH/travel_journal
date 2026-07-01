// Handles the return from Canva OAuth.
// This validates both the signed-in app user and the short-lived OAuth state
// cookie before exchanging the code and storing encrypted Canva tokens.
import { NextRequest, NextResponse } from 'next/server';
import { DEMO_COOKIE_NAME, isDemoRequestCookie, isLocalHostName } from '@/lib/demoMode';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';
import { checkApiRateLimitForRequest, resolveSameOriginPath } from '@/lib/server/apiSafety';
import { rejectSeededDemoCloudWrite } from '@/lib/server/demoCloudGuard';
import {
  createCanvaLocalConnectionCookie,
  decodeCanvaOAuthCookie,
  exchangeCanvaAuthorizationCode,
  getCanvaOAuthCookieName,
  saveCanvaConnection,
  setCanvaLocalConnectionCookie,
} from '@/lib/server/canva';

export const runtime = 'nodejs';

// Completes the OAuth code exchange and returns the user to the journal page.
export async function GET(request: NextRequest) {
  // Centralizes callback redirects so both success and failure clean up the
  // temporary OAuth cookie.
  const redirectToJournal = (status: string, message?: string) => {
    const url = new URL('/journal', request.url);
    url.searchParams.set('canva', status);

    if (message) {
      url.searchParams.set('message', message);
    }

    const response = NextResponse.redirect(url);
    response.cookies.delete(getCanvaOAuthCookieName());
    return response;
  };

  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const oauthCookie = decodeCanvaOAuthCookie(request.cookies.get(getCanvaOAuthCookieName())?.value);

    if (!code || !state || !oauthCookie || oauthCookie.state !== state) {
      return redirectToJournal('error', 'Canva authorization could not be verified.');
    }

    const token = await exchangeCanvaAuthorizationCode(code, oauthCookie.codeVerifier, oauthCookie.redirectUri);
    const returnUrl = new URL(resolveSameOriginPath(oauthCookie.returnTo, '/journal'), request.url);
    const isLocalDemoRequest = isLocalHostName(request.nextUrl.hostname);

    if (isLocalDemoRequest || isDemoRequestCookie(request.cookies.get(DEMO_COOKIE_NAME)?.value)) {
      const rateLimitError = checkApiRateLimitForRequest('canva-local-oauth', request);

      if (rateLimitError) {
        return rateLimitError;
      }

      returnUrl.searchParams.set('canva', 'connected-local');
      const response = NextResponse.redirect(returnUrl);
      response.cookies.delete(getCanvaOAuthCookieName());
      response.cookies.set(DEMO_COOKIE_NAME, 'true', {
        httpOnly: false,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:',
        path: '/',
      });
      setCanvaLocalConnectionCookie(response, request, createCanvaLocalConnectionCookie(token));
      return response;
    }

    const context = await getAuthenticatedRouteContext(request, 'Canva');

    if (isRouteError(context)) {
      return redirectToJournal('auth-required', 'Please sign in before connecting Canva.');
    }

    const demoWriteError = rejectSeededDemoCloudWrite(context.user);
    if (demoWriteError) {
      return redirectToJournal('read-only-demo', 'The seeded demo traveler is read-only.');
    }

    await saveCanvaConnection(context.supabaseAdmin, context.user.id, token);

    returnUrl.searchParams.set('canva', 'connected');
    const response = NextResponse.redirect(returnUrl);
    response.cookies.delete(getCanvaOAuthCookieName());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not connect Canva.';
    return redirectToJournal('error', message);
  }
}
