import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CountryCity, ScratchMapState } from '@/types';

interface MapStore extends ScratchMapState {
  setScratchPercentage: (percentage: number) => void;
  addVisitedCountry: (countryId: string) => void;
  removeVisitedCountry: (countryId: string) => void;
  setVisitedCountries: (countries: string[]) => void;
  setCountryColor: (countryId: string, color: string) => void;
  clearCountryColor: (countryId: string) => void;
  setCountryLabel: (countryId: string, label: string) => void;
  clearCountryLabel: (countryId: string) => void;
  addCountryCity: (countryId: string, city: CountryCity) => void;
  removeCountryCity: (countryId: string, cityId: string) => void;
  reset: () => void;
}

const initialState: ScratchMapState = {
  scratchPercentage: 0,
  visitedCountries: [],
  countryColors: {},
  countryLabels: {},
  countryCities: {},
  lastUpdated: new Date().toISOString(),
};

const storage = createJSONStorage(() => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    } as unknown as Storage;
  }

  return window.localStorage;
});

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      ...initialState,
      setScratchPercentage: (scratchPercentage) =>
        set({
          scratchPercentage,
          lastUpdated: new Date().toISOString(),
        }),
      addVisitedCountry: (countryId) =>
        set((state) => ({
          visitedCountries: [...new Set([...state.visitedCountries, countryId])],
          lastUpdated: new Date().toISOString(),
        })),
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
      reset: () => set(initialState),
    }),
    {
      name: 'travel-journal-map',
      storage,
    }
  )
);
