// Persistent scratch-map state.
// This Zustand store is the client source of truth for visited countries,
// country colors/labels, city pins, and scratch progress. Other features such
// as passport, journal country linking, Travel Audit, and AI context read it.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CountryCity, ScratchMapState } from '@/types';

interface MapStore extends ScratchMapState {
  setScratchPercentage: (percentage: number) => void;
  addVisitedCountry: (countryId: string) => void;
  removeVisitedCountry: (countryId: string) => void;
  setVisitedCountries: (countries: string[]) => void;
  replaceMapState: (state: ScratchMapState) => void;
  setCountryColor: (countryId: string, color: string) => void;
  clearCountryColor: (countryId: string) => void;
  setCountryLabel: (countryId: string, label: string) => void;
  clearCountryLabel: (countryId: string) => void;
  addCountryCity: (countryId: string, city: CountryCity) => void;
  removeCountryCity: (countryId: string, cityId: string) => void;
  reset: () => void;
}

// Creates the baseline shape used for first load, reset, and remote replacement.
export function createEmptyMapState(): ScratchMapState {
  return {
    scratchPercentage: 0,
    visitedCountries: [],
    countryColors: {},
    countryLabels: {},
    countryCities: {},
    lastUpdated: new Date().toISOString(),
  };
}

// Strips store actions and keeps only the data that should be persisted or
// synced to Supabase.
export function selectPersistedMapState(state: ScratchMapState): ScratchMapState {
  return {
    scratchPercentage: state.scratchPercentage,
    visitedCountries: state.visitedCountries,
    countryColors: state.countryColors,
    countryLabels: state.countryLabels,
    countryCities: state.countryCities ?? {},
    lastUpdated: state.lastUpdated,
  };
}

const initialState = createEmptyMapState();

// Zustand persistence touches localStorage in the browser. During SSR/build,
// this no-op storage avoids accessing window before it exists.
const storage = createJSONStorage<ScratchMapState>(() => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    } as unknown as Storage;
  }

  return window.localStorage;
});

// The store is persisted under travel-journal-map so map progress survives
// refreshes even before cloud sync is available.
export const useMapStore = create<MapStore>()(
  persist<MapStore, [], [], ScratchMapState>(
    (set) => ({
      ...initialState,
      setScratchPercentage: (scratchPercentage) =>
        set({
          scratchPercentage,
          lastUpdated: new Date().toISOString(),
        }),
      // Set semantics avoid duplicate visited-country entries when a user
      // clicks the same atlas country multiple times.
      addVisitedCountry: (countryId) =>
        set((state) => ({
          visitedCountries: [...new Set([...state.visitedCountries, countryId])],
          lastUpdated: new Date().toISOString(),
        })),
      // Removing a country also clears display metadata tied to that country so
      // stale colors, labels, or city pins do not linger.
      removeVisitedCountry: (countryId) =>
        set((state) => ({
          visitedCountries: state.visitedCountries.filter((id) => id !== countryId),
          countryColors: Object.fromEntries(
            Object.entries(state.countryColors).filter(([id]) => id !== countryId)
          ),
          countryLabels: Object.fromEntries(
            Object.entries(state.countryLabels).filter(([id]) => id !== countryId)
          ),
          countryCities: Object.fromEntries(
            Object.entries(state.countryCities ?? {}).filter(([id]) => id !== countryId)
          ),
          lastUpdated: new Date().toISOString(),
        })),
      setVisitedCountries: (visitedCountries) =>
        set({
          visitedCountries,
          lastUpdated: new Date().toISOString(),
        }),
      // Used by cloud sync to apply a remote snapshot while preserving the full
      // current store shape.
      replaceMapState: (mapState) =>
        set({
          ...createEmptyMapState(),
          ...selectPersistedMapState(mapState),
        }),
      setCountryColor: (countryId, color) =>
        set((state) => ({
          countryColors: {
            ...state.countryColors,
            [countryId]: color,
          },
          lastUpdated: new Date().toISOString(),
        })),
      clearCountryColor: (countryId) =>
        set((state) => ({
          countryColors: Object.fromEntries(
            Object.entries(state.countryColors).filter(([id]) => id !== countryId)
          ),
          lastUpdated: new Date().toISOString(),
        })),
      setCountryLabel: (countryId, label) =>
        set((state) => ({
          countryLabels: {
            ...state.countryLabels,
            [countryId]: label,
          },
          lastUpdated: new Date().toISOString(),
        })),
      clearCountryLabel: (countryId) =>
        set((state) => ({
          countryLabels: Object.fromEntries(
            Object.entries(state.countryLabels).filter(([id]) => id !== countryId)
          ),
          lastUpdated: new Date().toISOString(),
        })),
      // City pins are keyed by country and de-duplicated by city id.
      addCountryCity: (countryId, city) =>
        set((state) => {
          const countryCities = state.countryCities ?? {};
          const existingCities = countryCities[countryId] ?? [];
          const nextCities = [
            ...existingCities.filter((existingCity) => existingCity.id !== city.id),
            city,
          ];

          return {
            countryCities: {
              ...countryCities,
              [countryId]: nextCities,
            },
            lastUpdated: new Date().toISOString(),
          };
        }),
      removeCountryCity: (countryId, cityId) =>
        set((state) => {
          const countryCities = state.countryCities ?? {};
          const nextCities = (countryCities[countryId] ?? []).filter((city) => city.id !== cityId);

          return {
            countryCities: {
              ...countryCities,
              [countryId]: nextCities,
            },
            lastUpdated: new Date().toISOString(),
          };
        }),
      reset: () => set(createEmptyMapState()),
    }),
    {
      name: 'travel-journal-map',
      storage,
      partialize: (state) => selectPersistedMapState(state),
    }
  )
);
