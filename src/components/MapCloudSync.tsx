// Synchronizes local scratch-map state with Supabase.
// The map must feel instant locally, so Zustand/localStorage remains the fast
// path while this component reconciles and saves cloud state for signed-in users.
'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

// A blank local store should not overwrite a useful remote map.
function hasMapContent(state: ScratchMapState) {
  return (
    state.visitedCountries.length > 0 ||
    Object.keys(state.countryColors).length > 0 ||
    Object.keys(state.countryLabels).length > 0 ||
    Object.values(state.countryCities ?? {}).some((cities) => cities.length > 0)
  );
}

// Safely compares timestamps that may be missing or malformed.
function getTime(value?: string) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

// Tracks which user last owned the local map snapshot. This prevents one user's
// local map from being uploaded into another user's account on shared devices.
function getLocalOwner() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(localOwnerKey);
}

// Records the signed-in user that the current local map belongs to.
function setLocalOwner(userId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localOwnerKey, userId);
}

// Zustand persistence hydrates asynchronously. Cloud reconciliation waits for
// localStorage first so it compares the real local snapshot, not the empty default.
async function waitForMapHydration() {
  if (useMapStore.persist.hasHydrated()) return;

  await new Promise<void>((resolve) => {
    const unsubscribe = useMapStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

// Mounted by AuthProvider so map syncing is available across the app, not only
// while the user is on /map.
export default function MapCloudSync() {
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isApplyingRemoteRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncIssue, setSyncIssue] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading || !user) return;

    let isCancelled = false;
    let unsubscribeFromMap: (() => void) | undefined;

    // Persists the current local map snapshot to Supabase and records local
    // ownership after a successful save.
    const saveSnapshot = async (snapshot: ScratchMapState) => {
      try {
        await saveCloudMapState(user.id, snapshot);
        setLocalOwner(user.id);
        setSyncIssue(null);
      } catch (error) {
        console.warn('Unable to sync map state to Supabase.', error);
        setSyncIssue('Map changes are saved on this device, but cloud sync is not available right now.');
      }
    };

    // Debounces Zustand updates because map interactions can produce bursts of
    // color/label/country changes.
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

    // Reconciliation chooses the newer meaningful state. Local newer content can
    // seed the cloud; otherwise remote state replaces the local store.
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
        setSyncIssue('Map cloud sync could not load. Your local map is still available on this device.');
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

  if (!syncIssue) {
    return null;
  }

  return (
    // Sync issues are non-blocking: the local map still works, but the user gets
    // a clear notice that cloud persistence is unavailable.
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm text-ink shadow-lg"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      <p className="leading-5">{syncIssue}</p>
      <button
        type="button"
        onClick={() => setSyncIssue(null)}
        className="ml-1 rounded-md p-1 text-ink/60 transition hover:bg-cream hover:text-ink"
        aria-label="Dismiss map sync notice"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
