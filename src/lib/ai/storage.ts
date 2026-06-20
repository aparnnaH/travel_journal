// Browser storage helpers for AI companion context.
// The companion reads local scrapbook/import data in addition to Supabase-backed
// journal entries, so these helpers keep localStorage parsing defensive.
import { normalizeScrapbookPage } from '@/lib/canvas/scrapbook';
import type { ScrapbookPageData } from '@/lib/canvas/scrapbook';
import type { ParsedTripDraft } from '@/types/trips';
import type { ImportedTripSnapshot } from '@/lib/ai/types';

const SCRAPBOOK_PREFIX = 'travel-journal-scrapbook:';
const IMPORTED_TRIPS_PREFIX = 'travel-journal-imported-trips:';
const MAX_IMPORTED_TRIPS = 48;

type StoredScrapbookPayload = {
  activePageId?: string;
  pages?: Array<Partial<ScrapbookPageData>>;
};

// Guards localStorage access so the same module can be imported by code that may
// run during server rendering.
const isBrowser = () => typeof window !== 'undefined';

// User-scoped keys prevent one signed-in user's local scrapbook/import cache
// from appearing in another user's companion context on the same browser.
export const getScrapbookStorageKey = (userId: string) => `${SCRAPBOOK_PREFIX}${userId}`;
export const getImportedTripsStorageKey = (userId: string) => `${IMPORTED_TRIPS_PREFIX}${userId}`;

// Reduces a full parsed trip into the compact shape the AI companion needs for
// memory summaries and prompt suggestions.
export const toImportedTripSnapshot = (trip: ParsedTripDraft): ImportedTripSnapshot => ({
  id: trip.id,
  title: trip.title,
  summary: trip.summary,
  importedAt: trip.importedAt,
  primaryCountryId: trip.primaryCountryId,
  primaryCountryName: trip.primaryCountryName,
  passportStampIds: trip.passportStampIds,
  tags: trip.tags,
  mood: trip.mood,
  dayCount: trip.timeline.length,
  locationNames: trip.locations.slice(0, 10).map((location) => location.name),
});

// Reads scrapbook pages from localStorage and normalizes partial/legacy page
// data before returning it to companion or journal UI code.
export const readScrapbookPagesFromStorage = (userId: string): ScrapbookPageData[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getScrapbookStorageKey(userId));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StoredScrapbookPayload;

    if (!Array.isArray(parsed.pages)) {
      return [];
    }

    return parsed.pages.map((page, index) => normalizeScrapbookPage(page, index + 1));
  } catch {
    return [];
  }
};

// Reads imported trip snapshots, filters malformed values, and sorts newest
// first so recency-based AI context is predictable.
export const readImportedTripsFromStorage = (userId: string): ImportedTripSnapshot[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getImportedTripsStorageKey(userId));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ImportedTripSnapshot[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((trip) => Boolean(trip?.id && trip?.title))
      .sort((first, second) => {
        const firstTime = new Date(first.importedAt).getTime();
        const secondTime = new Date(second.importedAt).getTime();
        return secondTime - firstTime;
      });
  } catch {
    return [];
  }
};

// Adds or replaces one imported trip snapshot while capping localStorage size.
// This keeps repeated imports from duplicating the same trip in AI context.
export const appendImportedTripToStorage = (userId: string, trip: ParsedTripDraft | ImportedTripSnapshot) => {
  if (!isBrowser()) {
    return;
  }

  const nextSnapshot: ImportedTripSnapshot =
    'dayCount' in trip && 'locationNames' in trip ? trip : toImportedTripSnapshot(trip);

  const currentTrips = readImportedTripsFromStorage(userId);
  const filteredTrips = currentTrips.filter((item) => item.id !== nextSnapshot.id);
  const mergedTrips = [nextSnapshot, ...filteredTrips].slice(0, MAX_IMPORTED_TRIPS);

  window.localStorage.setItem(getImportedTripsStorageKey(userId), JSON.stringify(mergedTrips));
};
