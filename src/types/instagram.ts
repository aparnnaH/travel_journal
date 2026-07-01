export type InstagramMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';

export type InstagramMediaItem = {
  id: string;
  caption?: string;
  mediaType: InstagramMediaType;
  mediaUrl?: string;
  permalink: string;
  thumbnailUrl?: string;
  timestamp?: string;
  username?: string;
};

export type InstagramStatus = {
  configured: boolean;
  connected: boolean;
  authBaseUrl?: string;
  clientId?: string;
  clientIdSource?: string;
  redirectUri?: string;
  scopes?: string;
  paused?: boolean;
  missing: string[];
};
