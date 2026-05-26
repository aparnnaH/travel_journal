import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { instagramService } from '@/services/instagram';
import { getAuthenticatedUser } from '@/lib/serverAuth';

const instagramStateCookie = 'instagram-oauth-state';

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const { user } = await getAuthenticatedUser();
  const appUrl = getAppUrl(request);

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?instagram_error=Authentication required`);
  }

  const state = randomBytes(24).toString('hex');
  const authorizationUrl = instagramService.getAuthorizationUrl(state);
  const parsedUrl = new URL(authorizationUrl);

  console.info('Instagram OAuth start config', {
    host: parsedUrl.host,
    redirect_uri: parsedUrl.searchParams.get('redirect_uri'),
    client_id_present: Boolean(parsedUrl.searchParams.get('client_id')),
    scope: parsedUrl.searchParams.get('scope'),
  });

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set(instagramStateCookie, state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: '/',
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
  });

  return response;
}
