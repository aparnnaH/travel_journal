import { NextResponse } from 'next/server';
import { instagramService } from '@/services/instagram';

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const oauthUrl = process.env.INSTAGRAM_OAUTH_URL || 'https://www.instagram.com/oauth/authorize';
  const scopes = process.env.INSTAGRAM_OAUTH_SCOPES || 'instagram_business_basic';

  const checks: Array<{ id: string; ok: boolean; message: string }> = [
    {
      id: 'app_id_present',
      ok: hasValue(appId),
      message: hasValue(appId)
        ? 'NEXT_PUBLIC_INSTAGRAM_APP_ID is set.'
        : 'NEXT_PUBLIC_INSTAGRAM_APP_ID is missing.',
    },
    {
      id: 'app_secret_present',
      ok: hasValue(appSecret),
      message: hasValue(appSecret)
        ? 'INSTAGRAM_APP_SECRET is set.'
        : 'INSTAGRAM_APP_SECRET is missing.',
    },
    {
      id: 'redirect_uri_present',
      ok: hasValue(redirectUri),
      message: hasValue(redirectUri)
        ? 'NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI is set.'
        : 'NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI is missing.',
    },
    {
      id: 'app_url_present',
      ok: hasValue(appUrl),
      message: hasValue(appUrl)
        ? 'NEXT_PUBLIC_APP_URL is set.'
        : 'NEXT_PUBLIC_APP_URL is missing.',
    },
    {
      id: 'redirect_matches_app_url',
      ok: hasValue(appUrl) && hasValue(redirectUri) && redirectUri!.startsWith(appUrl!),
      message:
        hasValue(appUrl) && hasValue(redirectUri) && redirectUri!.startsWith(appUrl!)
          ? 'Redirect URI starts with NEXT_PUBLIC_APP_URL.'
          : 'Redirect URI does not start with NEXT_PUBLIC_APP_URL.',
    },
    {
      id: 'oauth_host_valid',
      ok:
        oauthUrl.startsWith('https://www.instagram.com/oauth/authorize') ||
        oauthUrl.startsWith('https://api.instagram.com/oauth/authorize'),
      message:
        oauthUrl.startsWith('https://www.instagram.com/oauth/authorize') ||
        oauthUrl.startsWith('https://api.instagram.com/oauth/authorize')
          ? 'OAuth authorize URL host looks valid.'
          : 'OAuth authorize URL host is unexpected.',
    },
  ];

  const sampleAuthUrl = instagramService.getAuthorizationUrl('diagnostic_state_value');
  const parsed = new URL(sampleAuthUrl);

  return NextResponse.json({
    success: true,
    checks,
    summary: {
      ready: checks.every((item) => item.ok),
      oauthHost: parsed.host,
      scope: parsed.searchParams.get('scope'),
      redirectUri: parsed.searchParams.get('redirect_uri'),
      appIdLength: appId?.length || 0,
      appSecretLength: appSecret?.length || 0,
      appIdPrefix: appId ? appId.slice(0, 4) : '',
      appIdSuffix: appId ? appId.slice(-4) : '',
      oauthConfiguredScopes: scopes,
    },
  });
}

