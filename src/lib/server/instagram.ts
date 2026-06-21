import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { InstagramMediaItem, InstagramStatus } from '@/types/instagram';

export const instagramTokenCookieName = 'instagram-access-token';
export const instagramStateCookieName = 'instagram-oauth-state';

type InstagramTokenCookie = {
  accessToken: string;
  appUserId: string;
  instagramUserId: string;
  expiresAt: number;
};

type InstagramApiMedia = {
  id?: string;
  caption?: string;
  media_type?: InstagramMediaItem['mediaType'];
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  username?: string;
};

const INSTAGRAM_AUTH_BASE_URL = 'https://www.instagram.com/oauth/authorize';
const INSTAGRAM_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const INSTAGRAM_LONG_LIVED_TOKEN_URL = 'https://graph.instagram.com/access_token';
const INSTAGRAM_MEDIA_URL = 'https://graph.instagram.com/me/media';
const DEFAULT_INSTAGRAM_SCOPES = ['instagram_business_basic'];
const TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 55;
const STATE_COOKIE_MAX_AGE_SECONDS = 60 * 10;

function getInstagramClientId() {
  return process.env.INSTAGRAM_CLIENT_ID || process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '';
}

function getInstagramClientSecret() {
  return process.env.INSTAGRAM_CLIENT_SECRET || process.env.INSTAGRAM_APP_SECRET || '';
}

export function getInstagramRedirectUri(request: NextRequest) {
  return process.env.INSTAGRAM_REDIRECT_URI || process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI || new URL('/api/instagram/oauth/callback', request.url).toString();
}

export function getInstagramStatus(request: NextRequest, appUserId?: string): InstagramStatus {
  const missing = [
    ['INSTAGRAM_CLIENT_ID or NEXT_PUBLIC_INSTAGRAM_APP_ID', getInstagramClientId()],
    ['INSTAGRAM_CLIENT_SECRET or INSTAGRAM_APP_SECRET', getInstagramClientSecret()],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  return {
    configured: missing.length === 0,
    connected: Boolean(getInstagramTokenCookie(request, appUserId)),
    redirectUri: getInstagramRedirectUri(request),
    missing,
  };
}

export function buildInstagramAuthorizationUrl({
  request,
  state,
}: {
  request: NextRequest;
  state: string;
}) {
  const url = new URL(INSTAGRAM_AUTH_BASE_URL);
  url.searchParams.set('client_id', getInstagramClientId());
  url.searchParams.set('redirect_uri', getInstagramRedirectUri(request));
  url.searchParams.set('scope', process.env.INSTAGRAM_SCOPES || DEFAULT_INSTAGRAM_SCOPES.join(','));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('enable_fb_login', '0');
  url.searchParams.set('force_authentication', '1');
  return url;
}

export function setInstagramStateCookie(response: NextResponse, nonce: string) {
  response.cookies.set(instagramStateCookieName, nonce, {
    httpOnly: true,
    maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function clearInstagramStateCookie(response: NextResponse) {
  response.cookies.delete(instagramStateCookieName);
}

export function createInstagramState(userId: string, returnTo: string) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = Buffer.from(JSON.stringify({ nonce, userId, returnTo }), 'utf8').toString('base64url');
  return { nonce, payload };
}

export function parseInstagramState(value: string | null) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>;

    if (typeof parsed.nonce !== 'string' || typeof parsed.userId !== 'string') {
      return null;
    }

    return {
      nonce: parsed.nonce,
      userId: parsed.userId,
      returnTo: typeof parsed.returnTo === 'string' ? parsed.returnTo : undefined,
    };
  } catch {
    return null;
  }
}

function getEncryptionKey() {
  const secret = getInstagramClientSecret() || process.env.SUPABASE_SERVICE_ROLE_KEY || 'travel-journal-instagram-dev';
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptTokenCookie(value: InstagramTokenCookie) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

function decryptTokenCookie(value: string): InstagramTokenCookie | null {
  try {
    const payload = Buffer.from(value, 'base64url');
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const parsed = JSON.parse(decrypted) as InstagramTokenCookie;

    if (!parsed.accessToken || !parsed.appUserId || !parsed.instagramUserId || parsed.expiresAt <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getInstagramTokenCookie(request: NextRequest, appUserId?: string) {
  const rawCookie = request.cookies.get(instagramTokenCookieName)?.value;
  const tokenCookie = rawCookie ? decryptTokenCookie(rawCookie) : null;

  if (!tokenCookie || (appUserId && tokenCookie.appUserId !== appUserId)) {
    return null;
  }

  return tokenCookie;
}

export function setInstagramTokenCookie(response: NextResponse, value: InstagramTokenCookie) {
  response.cookies.set(instagramTokenCookieName, encryptTokenCookie(value), {
    httpOnly: true,
    maxAge: TOKEN_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function exchangeInstagramCode(request: NextRequest, code: string) {
  const body = new URLSearchParams();
  body.set('client_id', getInstagramClientId());
  body.set('client_secret', getInstagramClientSecret());
  body.set('grant_type', 'authorization_code');
  body.set('redirect_uri', getInstagramRedirectUri(request));
  body.set('code', code);

  const shortTokenResponse = await fetch(INSTAGRAM_TOKEN_URL, {
    method: 'POST',
    body,
  });
  const shortTokenPayload = await shortTokenResponse.json();

  if (!shortTokenResponse.ok || !shortTokenPayload.access_token || !shortTokenPayload.user_id) {
    throw new Error(shortTokenPayload.error_message || 'Instagram did not return an access token.');
  }

  const longTokenUrl = new URL(INSTAGRAM_LONG_LIVED_TOKEN_URL);
  longTokenUrl.searchParams.set('grant_type', 'ig_exchange_token');
  longTokenUrl.searchParams.set('client_secret', getInstagramClientSecret());
  longTokenUrl.searchParams.set('access_token', shortTokenPayload.access_token);

  const longTokenResponse = await fetch(longTokenUrl);
  const longTokenPayload = await longTokenResponse.json();

  if (!longTokenResponse.ok || !longTokenPayload.access_token) {
    throw new Error(longTokenPayload.error?.message || 'Instagram token exchange failed.');
  }

  const expiresInMs = Number(longTokenPayload.expires_in || TOKEN_COOKIE_MAX_AGE_SECONDS) * 1000;
  return {
    accessToken: String(longTokenPayload.access_token),
    instagramUserId: String(shortTokenPayload.user_id),
    expiresAt: Date.now() + expiresInMs,
  };
}

export async function fetchInstagramMediaItems(accessToken: string) {
  const url = new URL(INSTAGRAM_MEDIA_URL);
  url.searchParams.set(
    'fields',
    'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username'
  );
  url.searchParams.set('limit', '24');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message || 'Could not load Instagram media.');
  }

  return ((payload.data || []) as InstagramApiMedia[])
    .filter((item) => item.id && item.permalink)
    .map((item) => ({
      id: item.id as string,
      caption: item.caption,
      mediaType: item.media_type || 'IMAGE',
      mediaUrl: item.media_url,
      permalink: item.permalink as string,
      thumbnailUrl: item.thumbnail_url,
      timestamp: item.timestamp,
      username: item.username,
    }));
}
