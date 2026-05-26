import { NextRequest, NextResponse } from 'next/server';
import { instagramService } from '@/services/instagram';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

const instagramStateCookie = 'instagram-oauth-state';

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

function redirectToJournal(request: NextRequest, params: Record<string, string>) {
  const redirectUrl = new URL('/journal', getAppUrl(request));

  for (const [key, value] of Object.entries(params)) {
    redirectUrl.searchParams.set(key, value);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete(instagramStateCookie);
  return response;
}

/**
 * Instagram OAuth callback.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const errorCode = request.nextUrl.searchParams.get('error');
    const errorMessage = request.nextUrl.searchParams.get('error_reason');
    const expectedState = request.cookies.get(instagramStateCookie)?.value;

    if (errorCode) {
      return redirectToJournal(request, {
        instagram_error: `${errorCode}: ${errorMessage || 'Unknown error'}`,
      });
    }

    if (!code) {
      return redirectToJournal(request, {
        instagram_error: 'Missing authorization code',
      });
    }

    if (!state || !expectedState || state !== expectedState) {
      return redirectToJournal(request, {
        instagram_error: 'Invalid Instagram authorization state',
      });
    }

    const { user } = await getAuthenticatedUser();

    if (!user) {
      return redirectToJournal(request, {
        instagram_error: 'User context not found',
      });
    }

    const tokenResponse = await instagramService.exchangeCodeForToken(code);
    const longLivedToken = await instagramService.getLongLivedToken(tokenResponse.access_token);
    const userProfile = await instagramService.getUserProfile(longLivedToken.access_token);

    const { data: existingConnection, error: lookupError } = await supabaseAdmin
      .from('instagram_connections')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`Failed to check Instagram connection: ${lookupError.message}`);
    }

    const connectionData = {
      access_token: longLivedToken.access_token,
      instagram_user_id: userProfile.id,
      instagram_username: userProfile.username,
      updated_at: new Date().toISOString(),
    };

    if (existingConnection) {
      const { error } = await supabaseAdmin
        .from('instagram_connections')
        .update(connectionData)
        .eq('id', existingConnection.id);

      if (error) {
        throw new Error(`Failed to update Instagram connection: ${error.message}`);
      }
    } else {
      const { error } = await supabaseAdmin.from('instagram_connections').insert({
        user_id: user.id,
        ...connectionData,
        connected_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Failed to create Instagram connection: ${error.message}`);
      }
    }

    return redirectToJournal(request, { instagram_connected: 'true' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Instagram OAuth callback error:', error);

    return redirectToJournal(request, { instagram_error: errorMessage });
  }
}

