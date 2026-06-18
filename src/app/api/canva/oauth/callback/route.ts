import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';
import {
  decodeCanvaOAuthCookie,
  exchangeCanvaAuthorizationCode,
  getCanvaOAuthCookieName,
  saveCanvaConnection,
} from '@/lib/server/canva';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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
    const context = await getAuthenticatedRouteContext(request, 'Canva');

    if (isRouteError(context)) {
      return redirectToJournal('auth-required', 'Please sign in before connecting Canva.');
    }

    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const oauthCookie = decodeCanvaOAuthCookie(request.cookies.get(getCanvaOAuthCookieName())?.value);

    if (!code || !state || !oauthCookie || oauthCookie.state !== state) {
      return redirectToJournal('error', 'Canva authorization could not be verified.');
    }

    const token = await exchangeCanvaAuthorizationCode(code, oauthCookie.codeVerifier);
    await saveCanvaConnection(context.supabaseAdmin, context.user.id, token);

    const returnUrl = new URL(oauthCookie.returnTo || '/journal', request.url);
    returnUrl.searchParams.set('canva', 'connected');
    const response = NextResponse.redirect(returnUrl);
    response.cookies.delete(getCanvaOAuthCookieName());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not connect Canva.';
    return redirectToJournal('error', message);
  }
}

