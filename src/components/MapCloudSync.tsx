'use client';

import { useEffect, useRef } from 'react';
import { fetchCloudMapState, saveCloudMapState } from '@/lib/mapStateService';
import { useAuthStore } from '@/store/authStore';
import {
  createEmptyMapState,
  selectPersistedMapState,
  useMapStore,
} from '@/store/mapStore';
import type { ScratchMapState } from '@/types';

const localOwnerKey = 'travel-journal-map-owner';
const syncDebounceMs = 900;

function hasMapContent(state: ScratchMapState) {
  return (
    state.visitedCountries.length > 0 ||
    Object.keys(state.countryColors).length > 0 ||
    Object.keys(state.countryLabels).length > 0 ||
    Object.values(state.countryCities ?? {}).some((cities) => cities.length > 0)
  );
}

function getTime(value?: string) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getLocalOwner() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(localOwnerKey);
}

function setLocalOwner(userId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localOwnerKey, userId);
}

async function waitForMapHydration() {
  if (useMapStore.persist.hasHydrated()) return;

  await new Promise<void>((resolve) => {
    const unsubscribe = useMapStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

export default function MapCloudSync() {
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isApplyingRemoteRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAuthLoading || !user) return;

    let isCancelled = false;
    let unsubscribeFromMap: (() => void) | undefined;

    const saveSnapshot = async (snapshot: ScratchMapState) => {
      try {
        await saveCloudMapState(user.id, snapshot);
        setLocalOwner(user.id);
      } catch (error) {
        console.warn('Unable to sync map state to Supabase.', error);
      }
    };

    const scheduleSave = () => {
      if (isApplyingRemoteRef.current) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const snapshot = selectPersistedMapState(useMapStore.getState());
        void saveSnapshot(snapshot);
      }, syncDebounceMs);
    };

    const startSync = async () => {
      await waitForMapHydration();
      if (isCancelled) return;

      try {
        const localState = selectPersistedMapState(useMapStore.getState());
        const remoteState = await fetchCloudMapState(user.id);
        if (isCancelled) return;

        const localHasContent = hasMapContent(localState);
        const localOwner = getLocalOwner();

        if (remoteState) {
          if (
            localHasContent &&
            (localOwner === user.id || !localOwner) &&
            getTime(localState.lastUpdated) > getTime(remoteState.lastUpdated)
          ) {
            await saveSnapshot(localState);
          } else {
            isApplyingRemoteRef.current = true;
            useMapStore.getState().replaceMapState(remoteState);
            setLocalOwner(user.id);
            queueMicrotask(() => {
              isApplyingRemoteRef.current = false;
            });
          }
        } else if (localHasContent && (localOwner === user.id || !localOwner)) {
          await saveSnapshot(localState);
        } else if (localOwner && localOwner !== user.id) {
          isApplyingRemoteRef.current = true;
          useMapStore.getState().replaceMapState(createEmptyMapState());
          setLocalOwner(user.id);
          queueMicrotask(() => {
            isApplyingRemoteRef.current = false;
          });
        }
      } catch (error) {
        console.warn('Unable to load map state from Supabase.', error);
      }

      if (isCancelled) return;
      unsubscribeFromMap = useMapStore.subscribe(scheduleSave);
    };

    void startSync();

    return () => {
      isCancelled = true;
      unsubscribeFromMap?.();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isAuthLoading, user]);

  return null;
}
