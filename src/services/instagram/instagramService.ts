import type { InstagramMedia, InstagramUser, ExternalMedia } from '@/types';

/**
 * Instagram Graph API Service
 * Handles authentication, media fetching, and token management
 */

const INSTAGRAM_API_VERSION = process.env.INSTAGRAM_API_VERSION || 'v23.0';
const INSTAGRAM_GRAPH_API_URL = `https://graph.instagram.com/${INSTAGRAM_API_VERSION}`;
const INSTAGRAM_OAUTH_URL =
  process.env.INSTAGRAM_OAUTH_URL || 'https://www.instagram.com/oauth/authorize';
const INSTAGRAM_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const INSTAGRAM_LONG_LIVED_TOKEN_URL = 'https://graph.instagram.com/access_token';

interface InstagramTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  user_id?: string | number;
}

interface InstagramMediaResponse {
  data: Array<{
    id: string;
    caption?: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_url?: string;
    permalink: string;
    timestamp: string;
    thumbnail_url?: string;
  }>;
  paging?: {
    cursors?: {
      after?: string;
      before?: string;
    };
    next?: string;
    previous?: string;
  };
}

interface InstagramUserResponse {
  id?: string;
  user_id?: string | number;
  username: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
}

class InstagramService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '';
    this.clientSecret = process.env.INSTAGRAM_APP_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI || '';

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      console.warn('Instagram configuration incomplete. Some features may not work.');
    }
  }

  /**
   * Generate Instagram OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const scope =
      process.env.INSTAGRAM_OAUTH_SCOPES || 'instagram_business_basic';
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope,
      response_type: 'code',
      state,
    });

    const enableFacebookLogin = process.env.INSTAGRAM_ENABLE_FB_LOGIN;
    const forceAuthentication = process.env.INSTAGRAM_FORCE_AUTHENTICATION;

    if (enableFacebookLogin) {
      params.set('enable_fb_login', enableFacebookLogin);
    }

    if (forceAuthentication) {
      params.set('force_authentication', forceAuthentication);
    }

    return `${INSTAGRAM_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<InstagramTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code,
    });

    const response = await fetch(INSTAGRAM_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to exchange code: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Get long-lived access token from short-lived token
   */
  async getLongLivedToken(shortLivedToken: string): Promise<InstagramTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.clientSecret,
      access_token: shortLivedToken,
    });

    const response = await fetch(`${INSTAGRAM_LONG_LIVED_TOKEN_URL}?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(`Failed to get long-lived token: ${error?.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Fetch Instagram user profile information
   */
  async getUserProfile(accessToken: string): Promise<InstagramUser> {
    const params = new URLSearchParams({
      fields: 'id,user_id,username,account_type',
      access_token: accessToken,
    });

    const response = await fetch(`${INSTAGRAM_GRAPH_API_URL}/me?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const data: InstagramUserResponse = await response.json();

    const id = data.user_id?.toString() || data.id || '';

    return {
      id,
      username: data.username,
      name: data.name || data.username,
      profilePictureUrl: data.profile_picture_url,
    };
  }

  /**
   * Fetch Instagram media for a user
   */
  async getUserMedia(
    accessToken: string,
    userId: string,
    limit: number = 20,
    after?: string
  ): Promise<{ media: InstagramMedia[]; nextCursor?: string }> {
    const params = new URLSearchParams({
      fields:
        'id,caption,media_type,media_url,permalink,timestamp,thumbnail_url',
      limit: limit.toString(),
      access_token: accessToken,
    });

    if (after) {
      params.append('after', after);
    }

    const response = await fetch(
      `${INSTAGRAM_GRAPH_API_URL}/${userId}/media?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Instagram media');
    }

    const data: InstagramMediaResponse = await response.json();

    const media = data.data.map((item) => ({
      id: item.id,
      caption: item.caption,
      mediaType: item.media_type,
      mediaUrl: item.media_url,
      permalink: item.permalink,
      timestamp: item.timestamp,
      thumbnailUrl: item.thumbnail_url,
    }));

    return {
      media,
      nextCursor: data.paging?.cursors?.after,
    };
  }

  /**
   * Convert Instagram media to ExternalMedia format
   */
  convertToExternalMedia(instagramMedia: InstagramMedia): ExternalMedia {
    return {
      id: instagramMedia.id,
      externalMediaId: instagramMedia.id,
      sourcePlatform: 'instagram',
      mediaUrl: instagramMedia.mediaUrl || instagramMedia.thumbnailUrl || '',
      permalink: instagramMedia.permalink,
      caption: instagramMedia.caption,
      timestamp: instagramMedia.timestamp,
      mediaType: instagramMedia.mediaType,
      importedAt: new Date().toISOString(),
    };
  }

  /**
   * Validate if access token is still valid
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${INSTAGRAM_GRAPH_API_URL}/me?fields=id&access_token=${accessToken}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const instagramService = new InstagramService();
