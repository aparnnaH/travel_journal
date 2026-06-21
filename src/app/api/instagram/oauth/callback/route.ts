// Completes Instagram OAuth and returns to the journal workspace.
import { NextRequest, NextResponse } from 'next/server';
import {
  clearInstagramStateCookie,
  exchangeInstagramCode,
  parseInstagramState,
  setInstagramTokenCookie,
  instagramStateCookieName,
} from '@/lib/server/instagram';

function redirectWithMessage(request: NextRequest, path: string, type: 'connected' | 'error', message?: string) {
  const url = new URL(path, request.url);
  url.searchParams.set('instagram', type);

  if (message) {
    url.searchParams.set('message', message);
  }

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error_description') || request.nextUrl.searchParams.get('error');
  const state = parseInstagramState(request.nextUrl.searchParams.get('state'));
  const expectedNonce = request.cookies.get(instagramStateCookieName)?.value;
  const returnTo = state?.returnTo || '/journal';

  if (error) {
    const response = redirectWithMessage(request, returnTo, 'error', error);
    clearInstagramStateCookie(response);
    return response;
  }

  if (!code || !state || !expectedNonce || state.nonce !== expectedNonce) {
    const response = redirectWithMessage(request, returnTo, 'error', 'Instagram sign-in could not be verified.');
    clearInstagramStateCookie(response);
    return response;
  }

  try {
    const token = await exchangeInstagramCode(request, code);
    const response = redirectWithMessage(request, returnTo, 'connected');
    setInstagramTokenCookie(response, {
      ...token,
      appUserId: state.userId,
    });
    clearInstagramStateCookie(response);
    return response;
  } catch (exchangeError) {
    const response = redirectWithMessage(
      request,
      returnTo,
      'error',
      exchangeError instanceof Error ? exchangeError.message : 'Instagram connection failed.'
    );
    clearInstagramStateCookie(response);
    return response;
  }
}
