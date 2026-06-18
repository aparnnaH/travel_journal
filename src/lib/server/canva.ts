import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanvaDesign, CanvaExportJob } from '@/types/canva';

const CANVA_API_BASE_URL = 'https://api.canva.com/rest/v1';
const CANVA_AUTHORIZE_URL = 'https://www.canva.com/api/oauth/authorize';
const CANVA_OAUTH_COOKIE = 'canva-oauth';
const CANVA_FOLDER_SCOPES = ['folder:read', 'folder:write'];
const CANVA_SCOPES = [
  'profile:read',
  'design:meta:read',
  'design:content:read',
  'design:content:write',
  ...CANVA_FOLDER_SCOPES,
];
const TRAVEL_JOURNAL_FOLDER_NAME = 'Travel Journal';

type CanvaConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  returnUrl?: string;
};

type CanvaOAuthCookie = {
  state: string;
  codeVerifier: string;
  returnTo: string;
};

type CanvaTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope?: string;
};

type CanvaConnectionRow = {
  user_id: string;
  canva_user_id?: string | null;
  canva_team_id?: string | null;
  travel_journal_folder_id?: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: string;
  scopes?: string[] | null;
};

type CanvaFolder = {
  id: string;
  name: string;
  created_at?: number;
  updated_at?: number;
  thumbnail?: {
    width: number;
    height: number;
    url: string;
  };
};

type CanvaUserProfile = {
  profile?: {
    user_id?: string;
    team_id?: string;
  };
};

type Jwk = JsonWebKey & {
  kid?: string;
  alg?: string;
};

export function getCanvaOAuthCookieName() {
  return CANVA_OAUTH_COOKIE;
}

export function getCanvaConfig(): CanvaConfig {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  const redirectUri = process.env.CANVA_REDIRECT_URI;
  const returnUrl = process.env.CANVA_RETURN_URL;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Canva is not configured. Set CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, and CANVA_REDIRECT_URI.');
  }

  return { clientId, clientSecret, redirectUri, returnUrl };
}

export function encodeCanvaOAuthCookie(value: CanvaOAuthCookie) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeCanvaOAuthCookie(value?: string): CanvaOAuthCookie | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as CanvaOAuthCookie;
  } catch {
    return null;
  }
}

export function createCanvaAuthorizationUrl(returnTo: string) {
  const config = getCanvaConfig();
  const codeVerifier = crypto.randomBytes(96).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(48).toString('base64url');
  const url = new URL(CANVA_AUTHORIZE_URL);

  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scope', CANVA_SCOPES.join(' '));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('state', state);
  url.searchParams.set('redirect_uri', config.redirectUri);

  return {
    url,
    cookie: encodeCanvaOAuthCookie({ state, codeVerifier, returnTo }),
  };
}

export async function exchangeCanvaAuthorizationCode(code: string, codeVerifier: string) {
  const config = getCanvaConfig();
  return requestCanvaToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: config.redirectUri,
    })
  );
}

async function refreshCanvaToken(refreshToken: string) {
  return requestCanvaToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
  );
}

async function requestCanvaToken(body: URLSearchParams): Promise<CanvaTokenResponse> {
  const config = getCanvaConfig();
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`, 'utf8').toString('base64');
  const response = await fetch(`${CANVA_API_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Canva authorization failed.');
  }

  return data as CanvaTokenResponse;
}

function getEncryptionKey() {
  const config = getCanvaConfig();
  return crypto
    .createHash('sha256')
    .update(process.env.CANVA_TOKEN_ENCRYPTION_KEY || config.clientSecret)
    .digest();
}

function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split('.');

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error('Stored Canva token is invalid.');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export async function saveCanvaConnection(supabaseAdmin: SupabaseClient, userId: string, token: CanvaTokenResponse) {
  const profile = await requestCanva<CanvaUserProfile>('/users/me/profile', token.access_token);
  const expiresAt = new Date(Date.now() + Math.max(60, token.expires_in - 60) * 1000).toISOString();
  const scopes = token.scope?.split(/\s+/).filter(Boolean) || CANVA_SCOPES;

  const { error } = await supabaseAdmin.from('canva_connections').upsert(
    {
      user_id: userId,
      canva_user_id: profile.profile?.user_id ?? null,
      canva_team_id: profile.profile?.team_id ?? null,
      access_token_encrypted: encryptSecret(token.access_token),
      refresh_token_encrypted: encryptSecret(token.refresh_token),
      expires_at: expiresAt,
      scopes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function loadCanvaConnection(supabaseAdmin: SupabaseClient, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('canva_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as CanvaConnectionRow | null;
}

function getMissingCanvaScopes(connection: CanvaConnectionRow, scopes: string[]) {
  const grantedScopes = new Set(connection.scopes ?? []);
  return scopes.filter((scope) => !grantedScopes.has(scope));
}

export async function getValidCanvaAccessToken(supabaseAdmin: SupabaseClient, userId: string) {
  const connection = await loadCanvaConnection(supabaseAdmin, userId);

  if (!connection) {
    throw new Error('Canva is not connected yet.');
  }

  if (new Date(connection.expires_at).getTime() > Date.now() + 60_000) {
    return decryptSecret(connection.access_token_encrypted);
  }

  const refreshed = await refreshCanvaToken(decryptSecret(connection.refresh_token_encrypted));
  await saveCanvaConnection(supabaseAdmin, userId, refreshed);
  return refreshed.access_token;
}

export async function requestCanva<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...init.headers,
  };

  const response = await fetch(`${CANVA_API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data?.message || 'Canva request failed.');
  }

  return data as T;
}

export async function listCanvaDesigns(accessToken: string, query?: string) {
  const url = new URL(`${CANVA_API_BASE_URL}/designs`);
  url.searchParams.set('sort_by', 'modified_descending');
  url.searchParams.set('limit', '24');

  if (query?.trim()) {
    url.searchParams.set('query', query.trim());
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Could not load Canva designs.');
  }

  return data as { items: CanvaDesign[]; continuation?: string };
}

export async function createCanvaDesign(accessToken: string, title: string) {
  return requestCanva<{ design: CanvaDesign }>('/designs', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      type: 'type_and_asset',
      design_type: {
        type: 'custom',
        width: 1600,
        height: 1200,
      },
      title,
    }),
  });
}

export async function createCanvaFolder(accessToken: string, name: string, parentFolderId = 'root') {
  return requestCanva<{ folder?: CanvaFolder }>('/folders', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name,
      parent_folder_id: parentFolderId,
    }),
  });
}

export async function moveCanvaFolderItem(accessToken: string, itemId: string, toFolderId: string) {
  return requestCanva('/folders/move', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      item_id: itemId,
      to_folder_id: toFolderId,
    }),
  });
}

export async function organizeCanvaDesignInTravelJournalFolder(
  supabaseAdmin: SupabaseClient,
  userId: string,
  accessToken: string,
  designId: string
) {
  const connection = await loadCanvaConnection(supabaseAdmin, userId);

  if (!connection) {
    return { warning: 'Canva is not connected yet.' };
  }

  const missingFolderScopes = getMissingCanvaScopes(connection, CANVA_FOLDER_SCOPES);

  if (missingFolderScopes.length > 0) {
    return {
      warning: 'Reconnect Canva to organize new Travel Journal designs into a Canva folder.',
    };
  }

  let folderId = connection.travel_journal_folder_id ?? null;

  if (!folderId) {
    const folderResponse = await createCanvaFolder(accessToken, TRAVEL_JOURNAL_FOLDER_NAME);
    folderId = folderResponse.folder?.id ?? null;

    if (!folderId) {
      return { warning: 'Canva created the design, but did not return a Travel Journal folder id.' };
    }

    const { error } = await supabaseAdmin
      .from('canva_connections')
      .update({
        travel_journal_folder_id: folderId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      return {
        folderId,
        warning: 'Run supabase/canva_folders.sql so the app can remember the Canva Travel Journal folder.',
      };
    }
  }

  await moveCanvaFolderItem(accessToken, designId, folderId);
  return { folderId };
}

export async function createCanvaExportJob(accessToken: string, designId: string, format: 'png' | 'jpg' | 'pdf' = 'png') {
  return requestCanva<{ job: CanvaExportJob }>('/exports', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      design_id: designId,
      format:
        format === 'jpg'
          ? { type: 'jpg', quality: 90, export_quality: 'regular' }
          : format === 'pdf'
            ? { type: 'pdf', export_quality: 'regular' }
            : { type: 'png', export_quality: 'regular', lossless: true },
    }),
  });
}

export async function getCanvaExportJob(accessToken: string, exportId: string) {
  return requestCanva<{ job: CanvaExportJob }>(`/exports/${encodeURIComponent(exportId)}`, accessToken);
}

export async function downloadExportUrlsAsDataUrls(urls: string[]) {
  return Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Could not download exported Canva page.');
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    })
  );
}

function decodeJwtPart(value: string) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export async function verifyCanvaReturnJwt(token: string) {
  const [headerValue, payloadValue, signatureValue] = token.split('.');

  if (!headerValue || !payloadValue || !signatureValue) {
    throw new Error('Invalid Canva return token.');
  }

  const config = getCanvaConfig();
  const header = decodeJwtPart(headerValue) as { alg?: string; kid?: string };
  const payload = decodeJwtPart(payloadValue) as {
    aud?: string;
    exp?: number;
    type?: string;
    design_id?: string;
    correlation_state?: string;
    sub?: string;
    team_id?: string;
  };

  if (payload.aud !== config.clientId || payload.type !== 'rti' || !payload.exp || payload.exp * 1000 < Date.now()) {
    throw new Error('Canva return token failed validation.');
  }

  const keys = await requestCanva<{ keys?: Jwk[] }>('/connect/keys', '');
  const jwk = keys.keys?.find((key) => key.kid === header.kid) || keys.keys?.[0];

  if (!jwk) {
    throw new Error('Could not load Canva signing keys.');
  }

  const verifier = header.alg === 'ES256' ? 'sha256' : 'RSA-SHA256';
  const valid = crypto.verify(
    verifier,
    Buffer.from(`${headerValue}.${payloadValue}`),
    crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' }),
    Buffer.from(signatureValue, 'base64url')
  );

  if (!valid) {
    throw new Error('Canva return token signature is invalid.');
  }

  return payload;
}
