import type { AuthUser, JournalEntry, ScratchMapState, UserProfile } from '@/types';
import type { FriendsResponse } from '@/types/friends';
import type { ScrapbookPageData } from '@/lib/canvas/scrapbook';
import type { ImportedTripSnapshot } from '@/lib/ai/types';
import { getImportedTripsStorageKey, getScrapbookStorageKey } from '@/lib/ai/storage';

export const DEMO_COOKIE_NAME = 'travel-journal-demo';
export const DEMO_STORAGE_KEY = 'travel-journal:demo-mode';
export const DEMO_JOURNAL_STORAGE_KEY = 'travel-journal:demo-journal-entries';
export const DEMO_JOURNAL_SHARE_STORAGE_KEY = 'travel-journal:demo-journal-shares';
export const DEMO_JOURNAL_COMMENT_STORAGE_KEY = 'travel-journal:demo-journal-comments';
export const DEMO_SHARED_JOURNAL_STORAGE_KEY = 'travel-journal:demo-shared-journal-entries';
export const DEMO_USER_ID = 'demo-local-user';
export const DEMO_SHARE_RECIPIENT_ID = 'demo-share-recipient-aparnna';
export const DEMO_SHARE_RECIPIENT_EMAIL = 'aparnna.demo@traveljournal.app';
export const DEMO_SHARE_RECIPIENT_NAME = 'Aparnna';
const DEMO_PENDING_FRIEND_ID = 'demo-friend-mary-chen';
const DEMO_INDEXED_DB_NAME = 'travel-journal-demo';
const DEMO_INDEXED_DB_STORE = 'demo-shared-journal';
const DEMO_SHARED_JOURNAL_INDEXED_DB_KEY = 'entries';

const demoNow = '2026-06-30T12:00:00.000Z';

const createDemoCanvaPage = (title: string, subtitle: string, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <rect width="900" height="1200" fill="#fff8ea"/>
      <rect x="58" y="58" width="784" height="1084" rx="34" fill="${color}" opacity="0.18"/>
      <rect x="100" y="118" width="700" height="480" rx="26" fill="#ffffff"/>
      <circle cx="230" cy="270" r="92" fill="${color}" opacity="0.82"/>
      <path d="M100 520 C260 385 390 620 540 470 C650 360 720 420 800 345 L800 598 L100 598 Z" fill="#2f6f6d" opacity="0.88"/>
      <text x="100" y="710" font-family="Georgia, serif" font-size="68" fill="#3d2b0e">${title}</text>
      <text x="104" y="780" font-family="Arial, sans-serif" font-size="32" fill="#6f5a3b">${subtitle}</text>
      <line x1="104" y1="840" x2="796" y2="840" stroke="#b9975b" stroke-width="4" stroke-dasharray="12 16"/>
      <text x="104" y="910" font-family="Arial, sans-serif" font-size="28" fill="#3d2b0e">Saved from Canva Journal Studio</text>
      <text x="104" y="960" font-family="Arial, sans-serif" font-size="24" fill="#6f5a3b">Cover page, photo layout, and story notes stay linked to the entry.</text>
    </svg>`
  )}`;

const demoCanvaPages = [
  createDemoCanvaPage('Kyoto', 'Lantern walk and temple notes', '#9e1b32'),
  createDemoCanvaPage('Arashiyama', 'Bamboo paths, matcha, and quiet rain', '#2f6f6d'),
];

export const demoUser: AuthUser = {
  id: DEMO_USER_ID,
  email: 'demo@traveljournal.app',
  displayName: 'Demo Traveler',
  createdAt: demoNow,
};

export const demoProfile: UserProfile = {
  id: DEMO_USER_ID,
  email: demoUser.email,
  displayName: demoUser.displayName,
  avatar: '',
  createdAt: demoUser.createdAt,
};

export const demoMapState: ScratchMapState = {
  scratchPercentage: 26,
  visitedCountries: ['FR', 'JP', 'IT', 'CA', 'GB', 'US'],
  countryColors: {
    FR: '#4ECFFF',
    JP: '#FF7FB0',
    IT: '#59D98E',
    CA: '#FFD166',
    GB: '#9B8CFF',
    US: '#FF9F6B',
  },
  countryLabels: {
    FR: 'France',
    JP: 'Japan',
    IT: 'Italy',
    CA: 'Canada',
    GB: 'United Kingdom',
    US: 'United States',
  },
  countryCities: {
    FR: [
      { id: 'demo-paris', name: 'Paris', region: 'Ile-de-France', visited: true, coordinates: [2.3522, 48.8566], createdAt: demoNow },
      { id: 'demo-nice', name: 'Nice', region: 'Provence-Alpes-Cote d Azur', visited: true, coordinates: [7.262, 43.7102], createdAt: demoNow },
      { id: 'demo-lyon', name: 'Lyon', region: 'Auvergne-Rhone-Alpes', visited: true, coordinates: [4.8357, 45.764], createdAt: demoNow },
    ],
    JP: [
      { id: 'demo-tokyo', name: 'Tokyo', region: 'Kanto', visited: true, coordinates: [139.6917, 35.6895], createdAt: demoNow },
      { id: 'demo-kyoto', name: 'Kyoto', region: 'Kansai', visited: true, coordinates: [135.7681, 35.0116], createdAt: demoNow },
      { id: 'demo-osaka', name: 'Osaka', region: 'Kansai', visited: true, coordinates: [135.5023, 34.6937], createdAt: demoNow },
    ],
    IT: [
      { id: 'demo-rome', name: 'Rome', region: 'Lazio', visited: true, coordinates: [12.4964, 41.9028], createdAt: demoNow },
      { id: 'demo-florence', name: 'Florence', region: 'Tuscany', visited: true, coordinates: [11.2558, 43.7696], createdAt: demoNow },
    ],
    CA: [{ id: 'demo-montreal', name: 'Montreal', region: 'Quebec', visited: true, coordinates: [-73.5673, 45.5017], createdAt: demoNow }],
    GB: [{ id: 'demo-london', name: 'London', region: 'England', visited: true, coordinates: [-0.1276, 51.5072], createdAt: demoNow }],
    US: [{ id: 'demo-new-york', name: 'New York', region: 'New York', visited: true, coordinates: [-74.006, 40.7128], createdAt: demoNow }],
  },
  lastUpdated: demoNow,
};

export const demoJournalEntries: JournalEntry[] = [
  {
    id: 'demo-journal-explore-paris-with-me',
    userId: DEMO_USER_ID,
    countryId: 'FR',
    title: 'Explore Paris with me',
    content:
      'A soft Paris day built around slow wandering, little cafe stops, and finding pretty corners without rushing. The best part was saving the small moments: a view of the Seine, warm pastries, quiet museum rooms, and an evening walk that made the whole trip feel golden.',
    mood: 'happy',
    tags: ['paris', 'france', 'city walk'],
    photos: [],
    tripStartDate: '2026-04-08',
    tripEndDate: '2026-04-12',
    createdAt: '2026-04-12T18:20:00.000Z',
    updatedAt: '2026-04-12T18:20:00.000Z',
  },
];

export const demoSharedJournalEntries: JournalEntry[] = [];

export const demoFriends: FriendsResponse = {
  friends: [
    {
      id: 'demo-friend-1',
      requesterId: DEMO_USER_ID,
      addresseeId: DEMO_SHARE_RECIPIENT_ID,
      status: 'accepted',
      createdAt: '2026-03-01T12:00:00.000Z',
      respondedAt: '2026-03-01T12:30:00.000Z',
      profile: {
        id: DEMO_SHARE_RECIPIENT_ID,
        email: DEMO_SHARE_RECIPIENT_EMAIL,
        displayName: DEMO_SHARE_RECIPIENT_NAME,
      },
      direction: 'friend',
    },
  ],
  incoming: [
    {
      id: 'demo-friend-request-mary-chen',
      requesterId: DEMO_PENDING_FRIEND_ID,
      addresseeId: DEMO_USER_ID,
      status: 'pending',
      createdAt: '2026-06-28T16:20:00.000Z',
      respondedAt: null,
      profile: {
        id: DEMO_PENDING_FRIEND_ID,
        email: 'mary.chen@example.com',
        displayName: 'Mary Chen',
      },
      direction: 'incoming',
    },
  ],
  outgoing: [],
  blocked: [],
};

export const demoScrapbookPages: ScrapbookPageData[] = [
  {
    id: 'demo-scrapbook-kyoto',
    title: 'Kyoto Lantern Board',
    theme: 'postcard',
    template: 'collage',
    photoTray: [],
    drawings: [
      {
        id: 'demo-stroke-1',
        color: '#8B6035',
        width: 4,
        points: [
          { x: 118, y: 438 },
          { x: 190, y: 420 },
          { x: 268, y: 448 },
          { x: 340, y: 428 },
        ],
      },
    ],
    items: [
      {
        id: 'demo-photo-canva',
        type: 'photo',
        src: demoCanvaPages[0],
        alt: 'Canva-style Kyoto journal cover',
        caption: 'Cover from Canva Journal Studio',
        x: 72,
        y: 76,
        width: 224,
        height: 291,
        rotation: -4,
        zIndex: 1,
      },
      {
        id: 'demo-note-kyoto',
        type: 'note',
        text: 'Best detail: lanterns reflected in the wet stone after dinner.',
        color: '#fff2a8',
        x: 342,
        y: 96,
        width: 230,
        height: 170,
        rotation: 3,
        zIndex: 2,
      },
      {
        id: 'demo-ticket-kyoto',
        type: 'decoration',
        kind: 'ticket',
        label: 'HND - KYOTO',
        color: '#ffd8b5',
        x: 380,
        y: 312,
        width: 190,
        height: 76,
        rotation: -7,
        zIndex: 3,
      },
    ],
  },
];

export const demoImportedTrips: ImportedTripSnapshot[] = [
  {
    id: 'demo-import-japan-spring',
    title: 'Japan Spring Route',
    summary: 'Tokyo food notes, Kyoto temples, Osaka market stops, and one saved lantern-walk memory for the journal.',
    importedAt: '2026-05-10T22:00:00.000Z',
    primaryCountryId: 'JP',
    primaryCountryName: 'Japan',
    passportStampIds: ['japan'],
    tags: ['spring', 'temples', 'food', 'rail'],
    mood: 'peaceful',
    dayCount: 7,
    locationNames: ['Tokyo', 'Kyoto', 'Arashiyama', 'Osaka', 'Nara'],
  },
];

export function isDemoUserId(userId?: string | null) {
  return userId === DEMO_USER_ID;
}

export function isDemoMode() {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(DEMO_STORAGE_KEY) === 'true' || document.cookie.includes(`${DEMO_COOKIE_NAME}=true`);
}

export function isLocalHostName(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

export function isLocalDemoHost() {
  if (typeof window === 'undefined') return false;

  return isLocalHostName(window.location.hostname);
}

export function enableDemoMode() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEMO_STORAGE_KEY);
  window.sessionStorage.setItem(DEMO_STORAGE_KEY, 'true');
  document.cookie = `${DEMO_COOKIE_NAME}=true; path=/; SameSite=Lax`;
}

export function seedDemoLocalContext(options?: { reset?: boolean }) {
  if (typeof window === 'undefined') return;

  const shouldReset = options?.reset === true;

  if (shouldReset || !window.sessionStorage.getItem(DEMO_JOURNAL_STORAGE_KEY)) {
    writeDemoJournalEntries(demoJournalEntries);
  }

  if (shouldReset || !window.sessionStorage.getItem(DEMO_JOURNAL_SHARE_STORAGE_KEY)) {
    writeDemoJournalShares(createDefaultDemoJournalShares(demoJournalEntries));
  }

  if (!window.localStorage.getItem(DEMO_SHARED_JOURNAL_STORAGE_KEY)) {
    writeDemoSharedJournalEntries(demoSharedJournalEntries);
  }

  const scrapbookStorageKey = getScrapbookStorageKey(DEMO_USER_ID);
  if (shouldReset || !window.localStorage.getItem(scrapbookStorageKey)) {
    window.localStorage.setItem(
      scrapbookStorageKey,
      JSON.stringify({
        activePageId: demoScrapbookPages[0]?.id,
        pages: demoScrapbookPages,
      })
    );
  }

  const importedTripsStorageKey = getImportedTripsStorageKey(DEMO_USER_ID);
  if (shouldReset || !window.localStorage.getItem(importedTripsStorageKey)) {
    window.localStorage.setItem(importedTripsStorageKey, JSON.stringify(demoImportedTrips));
  }
}

export function disableDemoMode() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEMO_STORAGE_KEY);
  window.sessionStorage.removeItem(DEMO_STORAGE_KEY);
  window.localStorage.removeItem(getScrapbookStorageKey(DEMO_USER_ID));
  window.localStorage.removeItem(getImportedTripsStorageKey(DEMO_USER_ID));
  window.localStorage.removeItem(DEMO_SHARED_JOURNAL_STORAGE_KEY);
  window.sessionStorage.removeItem(DEMO_JOURNAL_STORAGE_KEY);
  window.sessionStorage.removeItem(DEMO_JOURNAL_SHARE_STORAGE_KEY);
  window.sessionStorage.removeItem(DEMO_JOURNAL_COMMENT_STORAGE_KEY);
  document.cookie = `${DEMO_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function readDemoJournalEntries() {
  if (typeof window === 'undefined') return demoJournalEntries;

  const storedEntries = window.sessionStorage.getItem(DEMO_JOURNAL_STORAGE_KEY);
  if (!storedEntries) return demoJournalEntries;

  try {
    const parsedEntries = JSON.parse(storedEntries);
    return Array.isArray(parsedEntries) ? (parsedEntries as JournalEntry[]) : demoJournalEntries;
  } catch {
    return demoJournalEntries;
  }
}

export function writeDemoJournalEntries(entries: JournalEntry[]) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(DEMO_JOURNAL_STORAGE_KEY, JSON.stringify(entries));
}

export type DemoJournalShares = Record<string, string[]>;

export function createDefaultDemoJournalShares(entries: JournalEntry[]): DemoJournalShares {
  return Object.fromEntries(entries.map((entry) => [entry.id, [DEMO_SHARE_RECIPIENT_ID]]));
}

export function readDemoJournalShares() {
  if (typeof window === 'undefined') return createDefaultDemoJournalShares(demoJournalEntries);

  const storedShares = window.sessionStorage.getItem(DEMO_JOURNAL_SHARE_STORAGE_KEY);
  if (!storedShares) return createDefaultDemoJournalShares(readDemoJournalEntries());

  try {
    const parsedShares = JSON.parse(storedShares);
    return parsedShares && typeof parsedShares === 'object' && !Array.isArray(parsedShares)
      ? (parsedShares as DemoJournalShares)
      : createDefaultDemoJournalShares(readDemoJournalEntries());
  } catch {
    return createDefaultDemoJournalShares(readDemoJournalEntries());
  }
}

export function writeDemoJournalShares(shares: DemoJournalShares) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(DEMO_JOURNAL_SHARE_STORAGE_KEY, JSON.stringify(shares));
}

export function readDemoJournalComments() {
  if (typeof window === 'undefined') return {};

  const storedComments = window.sessionStorage.getItem(DEMO_JOURNAL_COMMENT_STORAGE_KEY);
  if (!storedComments) return {};

  try {
    const parsedComments = JSON.parse(storedComments);
    return parsedComments && typeof parsedComments === 'object' && !Array.isArray(parsedComments)
      ? (parsedComments as Record<string, import('@/types/journalComments').JournalComment[]>)
      : {};
  } catch {
    return {};
  }
}

export function writeDemoJournalComments(comments: Record<string, import('@/types/journalComments').JournalComment[]>) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(DEMO_JOURNAL_COMMENT_STORAGE_KEY, JSON.stringify(comments));
}

export function readDemoSharedJournalEntries() {
  if (typeof window === 'undefined') return demoSharedJournalEntries;

  const storedEntries = window.localStorage.getItem(DEMO_SHARED_JOURNAL_STORAGE_KEY);
  if (!storedEntries) return demoSharedJournalEntries;

  try {
    const parsedEntries = JSON.parse(storedEntries);
    return Array.isArray(parsedEntries) ? (parsedEntries as JournalEntry[]) : demoSharedJournalEntries;
  } catch {
    return demoSharedJournalEntries;
  }
}

export function writeDemoSharedJournalEntries(entries: JournalEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEMO_SHARED_JOURNAL_STORAGE_KEY, JSON.stringify(entries));
}

function openDemoIndexedDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available.'));
      return;
    }

    const request = window.indexedDB.open(DEMO_INDEXED_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DEMO_INDEXED_DB_STORE)) {
        database.createObjectStore(DEMO_INDEXED_DB_STORE);
      }
    };
    request.onerror = () => reject(request.error ?? new Error('Could not open demo storage.'));
    request.onsuccess = () => resolve(request.result);
  });
}

export async function readDemoSharedJournalEntriesLarge() {
  if (typeof window === 'undefined') return demoSharedJournalEntries;

  try {
    const database = await openDemoIndexedDb();
    return await new Promise<JournalEntry[]>((resolve, reject) => {
      const transaction = database.transaction(DEMO_INDEXED_DB_STORE, 'readonly');
      const store = transaction.objectStore(DEMO_INDEXED_DB_STORE);
      const request = store.get(DEMO_SHARED_JOURNAL_INDEXED_DB_KEY);

      request.onerror = () => reject(request.error ?? new Error('Could not read demo shared entries.'));
      request.onsuccess = () => {
        const entries = request.result;
        resolve(Array.isArray(entries) ? (entries as JournalEntry[]) : readDemoSharedJournalEntries());
      };
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error('Could not read demo shared entries.'));
      };
    });
  } catch {
    return readDemoSharedJournalEntries();
  }
}

export async function writeDemoSharedJournalEntriesLarge(entries: JournalEntry[]) {
  const database = await openDemoIndexedDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(DEMO_INDEXED_DB_STORE, 'readwrite');
    const store = transaction.objectStore(DEMO_INDEXED_DB_STORE);
    const request = store.put(entries, DEMO_SHARED_JOURNAL_INDEXED_DB_KEY);

    request.onerror = () => reject(request.error ?? new Error('Could not save demo shared entries.'));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Could not save demo shared entries.'));
    };
  });
}

export function isDemoRequestCookie(cookieValue?: string | null) {
  return cookieValue === 'true';
}
