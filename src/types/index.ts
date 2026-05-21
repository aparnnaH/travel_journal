/**
 * User authentication and profile types
 */
export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
  createdAt: string;
}

/**
 * Travel Journal entry types
 */
export interface JournalEntry {
  id: string;
  userId: string;
  countryId: string;
  title: string;
  content: string;
  mood: 'happy' | 'excited' | 'peaceful' | 'nostalgic' | 'reflective';
  tags: string[];
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  url: string;
  alt: string;
  uploadedAt: string;
}

/**
 * Passport stamp types
 */
export interface PassportStamp {
  id: string;
  userId: string;
  countryId: string;
  countryName: string;
  visitDate: string;
  stampImage?: string;
  isCollected: boolean;
  collectedAt?: string;
}

/**
 * Country and scratch map types
 */
export interface Country {
  id: string;
  name: string;
  code: string; // ISO 3166-1 alpha-2
  pathData: string; // SVG path data
  visited: boolean;
  visitedAt?: string;
  journalEntries: JournalEntry[];
  coordinates?: [number, number];
  cities?: Array<{
    id: string;
    name: string;
    region: string;
    visited: boolean;
  }>;
  highlights?: string[];
}

export interface ScratchMapState {
  scratchPercentage: number;
  visitedCountries: string[]; // country IDs
  countryColors: Record<string, string>; // country ID => persisted display color
  countryLabels: Record<string, string>; // country ID => persisted display label
  lastUpdated: string;
}

/**
 * Friend and collaboration types
 */
export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendData: {
    displayName: string;
    avatar?: string;
  };
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
}

export interface SharedJournal {
  id: string;
  journalEntryId: string;
  sharedBy: string;
  sharedWith: string[];
  permission: 'view' | 'comment';
  createdAt: string;
}

/**
 * API response types
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
