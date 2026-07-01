import type { AuthUser, JournalEntry, ScratchMapState, UserProfile } from '@/types';
import type { FriendsResponse } from '@/types/friends';
import type { ScrapbookPageData } from '@/lib/canvas/scrapbook';
import type { ImportedTripSnapshot } from '@/lib/ai/types';
import { getImportedTripsStorageKey, getScrapbookStorageKey } from '@/lib/ai/storage';

export const DEMO_COOKIE_NAME = 'travel-journal-demo';
export const DEMO_STORAGE_KEY = 'travel-journal:demo-mode';
export const DEMO_JOURNAL_STORAGE_KEY = 'travel-journal:demo-journal-entries';
export const DEMO_USER_ID = 'demo-local-user';

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
    id: 'demo-journal-canva-kyoto',
    userId: DEMO_USER_ID,
    countryId: 'JP',
    title: 'Canva Pages: Kyoto Lantern Walk',
    content:
      'This entry shows how a finished Canva journal page can stay attached to the story. The cover page holds the lantern walk, and the second page keeps the quieter bamboo-path notes for the scrapbook archive.',
    mood: 'reflective',
    tags: ['canva', 'kyoto', 'scrapbook'],
    photos: [],
    canvaDesignId: 'demo-canva-kyoto',
    canvaDesignTitle: 'Kyoto Lantern Walk',
    canvaDesignEditUrl: 'https://www.canva.com/design/demo-kyoto-lantern-walk',
    canvaPages: demoCanvaPages,
    canvaPageCount: demoCanvaPages.length,
    coverPhoto: demoCanvaPages[0],
    coverPageIndex: 0,
    tripStartDate: '2026-05-03',
    tripEndDate: '2026-05-10',
    createdAt: '2026-05-11T15:10:00.000Z',
    updatedAt: '2026-05-11T15:10:00.000Z',
  },
  {
    id: 'demo-journal-paris',
    userId: DEMO_USER_ID,
    countryId: 'FR',
    title: 'Paris in Soft Rain',
    content:
      'Morning started with a slow walk along the Seine, a paper cup of coffee, and museum plans that happily turned into wandering. The best memory was finding a tiny bookshop near the river and writing postcards before dinner.',
    mood: 'nostalgic',
    tags: ['paris', 'museum', 'postcards'],
    photos: [],
    tripStartDate: '2026-04-08',
    tripEndDate: '2026-04-12',
    createdAt: '2026-04-12T18:20:00.000Z',
    updatedAt: '2026-04-12T18:20:00.000Z',
  },
  {
    id: 'demo-journal-kyoto',
    userId: DEMO_USER_ID,
    countryId: 'JP',
    title: 'Lanterns After Dinner',
    content:
      'Kyoto felt quiet and bright at the same time. We followed lantern-lit streets after dinner, saved a few temple notes for the scrapbook, and marked Kyoto and Tokyo on the map before calling it a night.',
    mood: 'peaceful',
    tags: ['kyoto', 'temples', 'night walk'],
    photos: [],
    tripStartDate: '2026-05-03',
    tripEndDate: '2026-05-10',
    createdAt: '2026-05-10T21:15:00.000Z',
    updatedAt: '2026-05-10T21:15:00.000Z',
  },
  {
    id: 'demo-journal-rome',
    userId: DEMO_USER_ID,
    countryId: 'IT',
    title: 'Rome, One Long Golden Hour',
    content:
      'The whole afternoon felt like golden hour: espresso, old stone streets, and a last-minute pasta reservation that became the highlight of the trip. I saved this as the trip cover memory.',
    mood: 'happy',
    tags: ['rome', 'food', 'golden hour'],
    photos: [],
    tripStartDate: '2026-03-16',
    tripEndDate: '2026-03-20',
    createdAt: '2026-03-20T19:45:00.000Z',
    updatedAt: '2026-03-20T19:45:00.000Z',
  },
];

export const demoFriends: FriendsResponse = {
  friends: [
    {
      id: 'demo-friend-1',
      requesterId: DEMO_USER_ID,
      addresseeId: 'demo-friend-maya',
      status: 'accepted',
      createdAt: '2026-03-01T12:00:00.000Z',
      respondedAt: '2026-03-01T12:30:00.000Z',
      profile: {
        id: 'demo-friend-maya',
        email: 'maya@example.com',
        displayName: 'Maya Chen',
      },
      direction: 'friend',
    },
  ],
  incoming: [],
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
  window.sessionStorage.removeItem(DEMO_JOURNAL_STORAGE_KEY);
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

export function isDemoRequestCookie(cookieValue?: string | null) {
  return cookieValue === 'true';
}
