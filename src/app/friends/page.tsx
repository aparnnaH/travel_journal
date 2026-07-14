// Travel Circle page.
// Lets signed-in users send friend requests, accept/block incoming requests, and
// manage relationships that journal sharing depends on.
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Clock3,
  Compass,
  Globe2,
  LockKeyhole,
  MailPlus,
  MapPinned,
  PlaneTakeoff,
  Send,
  ShieldCheck,
  Sparkles,
  Stamp,
  UserCheck,
  UserMinus,
  UserRoundPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import AppPageSkeleton from '@/components/loading/PageSkeletons';
import StampRenderer from '@/components/stamps/StampRenderer';
import { Button, Card, Input } from '@/components/ui';
import { ATLAS_STAMP_COUNTRIES } from '@/data/stamps/atlasCountries';
import {
  demoLenaSharedJournalEntry,
  DEMO_LENA_SHARE_DISMISSED_STORAGE_KEY,
  DEMO_LENA_SHARE_TRIGGER_STORAGE_KEY,
  DEMO_OUTGOING_FRIEND_ID,
  DEMO_OUTGOING_FRIEND_NAME,
  DEMO_OUTGOING_FRIEND_REQUEST_ID,
  DEMO_REMOVABLE_FRIEND_ID,
  DEMO_SHARE_RECIPIENT_ID,
  DEMO_STARTED_AT_STORAGE_KEY,
  isDemoMode,
  readDemoFriends,
  readDemoSharedJournalEntriesLarge,
  writeDemoFriends,
  writeDemoSharedJournalEntriesLarge,
} from '@/lib/demoMode';
import {
  fetchFriendCountrySnapshots,
  fetchFriends,
  removeFriendship,
  sendFriendRequest,
  updateFriendRequest,
} from '@/lib/friendService';
import { fetchJournalEntries, fetchJournalEntryShares, fetchSharedJournalEntries } from '@/lib/journalService';
import { findCountryStamp } from '@/lib/stamps/matching';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';
import type { JournalEntry } from '@/types';
import type { FriendCountry, FriendCountrySnapshot, FriendsResponse, Friendship } from '@/types/friends';
import type { JournalShareRecipient, SharedJournalEntry } from '@/types/journalSharing';

const emptyFriends: FriendsResponse = {
  friends: [],
  incoming: [],
  outgoing: [],
  blocked: [],
};

const DEMO_LENA_SHARE_DELAY_MS = 12000;

const atlasCountryLookup = new Map<string, string>();

ATLAS_STAMP_COUNTRIES.forEach((country) => {
  atlasCountryLookup.set(country.atlas_id.toLowerCase(), country.name);
  country.aliases?.forEach((alias) => atlasCountryLookup.set(alias.toLowerCase(), country.name));
});

// Uses display name when available and falls back to email.
const getFriendLabel = (friendship: Friendship) =>
  friendship.profile.displayName || friendship.profile.email || 'Travel friend';

// Creates avatar initials for friends without profile images.
const getInitials = (value: string) => {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'TJ';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
};

// Formats friendship dates without crashing on invalid values.
const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const getCountryName = (countryId: string, countryLabels: Record<string, string>) => {
  const explicitLabel = countryLabels[countryId]?.trim();
  if (explicitLabel) return explicitLabel;

  return atlasCountryLookup.get(countryId.toLowerCase()) ?? countryId;
};

const buildCountryList = (visitedCountries: string[], countryLabels: Record<string, string>) =>
  [...new Set(visitedCountries)]
    .map((countryId) => countryId.trim())
    .filter(Boolean)
    .map((countryId) => ({
      id: countryId,
      name: getCountryName(countryId, countryLabels),
    }))
    .sort((first, second) => first.name.localeCompare(second.name));

const compareCountryLists = (yourCountries: FriendCountry[], friendCountries: FriendCountry[]) => {
  const yourCountryMap = new Map(yourCountries.map((country) => [country.id, country]));
  const friendCountryMap = new Map(friendCountries.map((country) => [country.id, country]));

  const sharedCountries = yourCountries.filter((country) => friendCountryMap.has(country.id));
  const onlyYouCountries = yourCountries.filter((country) => !friendCountryMap.has(country.id));
  const onlyFriendCountries = friendCountries.filter((country) => !yourCountryMap.has(country.id));

  return {
    sharedCountries,
    onlyYouCountries,
    onlyFriendCountries,
    nextTripIdeas: onlyFriendCountries.slice(0, 3),
  };
};

type RegionOverlap = {
  region: string;
  sharedCount: number;
  yourCount: number;
  friendCount: number;
};

type TravelTwinBadge = {
  id: 'future-trip' | 'story-swap' | 'neighboring-routes' | 'shared-countries';
  label: string;
  detail: string;
  earnLabel: string;
  imageSrc: string;
  unlocked: boolean;
};

type OwnedSharedJournalEntry = {
  entry: JournalEntry;
  recipients: JournalShareRecipient[];
};

type SharedJournalPreview = {
  id: string;
  title: string;
  countryName: string;
  detail: string;
  sharedAt: string;
  direction: 'from-friend' | 'from-you';
};

type CountrySpreadDrawer = {
  countries: FriendCountry[];
  eyebrow: string;
  title: string;
  variant: 'left' | 'center' | 'right';
};

const getCountryRegion = (country: FriendCountry) => findCountryStamp(country.id, country.name)?.region || 'Travel archive';

const countRegions = (countries: FriendCountry[]) =>
  countries.reduce((regions, country) => {
    const region = getCountryRegion(country);
    regions.set(region, (regions.get(region) ?? 0) + 1);
    return regions;
  }, new Map<string, number>());

const buildRegionOverlap = (
  yourCountries: FriendCountry[],
  friendCountries: FriendCountry[],
  sharedCountries: FriendCountry[]
): RegionOverlap[] => {
  const yourRegions = countRegions(yourCountries);
  const friendRegions = countRegions(friendCountries);
  const sharedRegions = countRegions(sharedCountries);
  const allRegionNames = [...new Set([...yourRegions.keys(), ...friendRegions.keys(), ...sharedRegions.keys()])];

  return allRegionNames
    .map((region) => ({
      region,
      sharedCount: sharedRegions.get(region) ?? 0,
      yourCount: yourRegions.get(region) ?? 0,
      friendCount: friendRegions.get(region) ?? 0,
    }))
    .filter((region) => region.sharedCount > 0 || (region.yourCount > 0 && region.friendCount > 0))
    .sort((first, second) => second.sharedCount - first.sharedCount || second.yourCount + second.friendCount - (first.yourCount + first.friendCount))
    .slice(0, 4);
};

const getRegionOverlapCount = (region: RegionOverlap) =>
  region.sharedCount > 0 ? region.sharedCount : Math.min(region.yourCount, region.friendCount);

const buildTravelCircleBadges = (
  comparison: ReturnType<typeof compareCountryLists>,
  regionOverlap: RegionOverlap[],
  sharedJournalPreviews: SharedJournalPreview[]
): TravelTwinBadge[] => {
  const hasSharedCountry = comparison.sharedCountries.length > 0;
  const hasSharedRegion = regionOverlap.some((region) => region.sharedCount > 0);
  const hasJournalExchange =
    sharedJournalPreviews.some((preview) => preview.direction === 'from-friend') &&
    sharedJournalPreviews.some((preview) => preview.direction === 'from-you');
  const hasCountriesToCompare =
    (comparison.sharedCountries.length + comparison.onlyYouCountries.length > 0) &&
    (comparison.sharedCountries.length + comparison.onlyFriendCountries.length > 0);

  return [
    {
      id: 'future-trip',
      label: 'Ready to compare',
      detail: 'Your maps can start building friend-specific travel ideas.',
      earnLabel: 'Unlocked when both maps have countries to compare.',
      imageSrc: '/images/travel-circle/badges/ready-to-compare.png',
      unlocked: hasCountriesToCompare,
    },
    {
      id: 'story-swap',
      label: 'Journal exchange',
      detail: 'You and your friend have shared travel stories in your journals.',
      earnLabel: 'Unlock by sharing journal entries back and forth with this friend.',
      imageSrc: '/images/travel-circle/badges/journal-exchange.png',
      unlocked: hasJournalExchange,
    },
    {
      id: 'neighboring-routes',
      label: 'Neighboring routes',
      detail: 'Your maps cross paths in familiar regions.',
      earnLabel: 'Unlock by sharing a country or overlapping in the same region.',
      imageSrc: '/images/travel-circle/badges/neighboring-routes.png',
      unlocked: hasSharedCountry || hasSharedRegion,
    },
    {
      id: 'shared-countries',
      label: 'Shared countries',
      detail: 'Your maps overlap in multiple places.',
      earnLabel: 'Unlock by sharing at least 3 mapped countries.',
      imageSrc: '/images/travel-circle/badges/shared-countries.png',
      unlocked: comparison.sharedCountries.length >= 3,
    },
  ];
};

const getEntryCountryId = (entry: JournalEntry | SharedJournalEntry) => entry.countryId || ('country_id' in entry ? entry.country_id : '') || '';

const isMatchingShareRecipient = (recipient: JournalShareRecipient, friend: FriendCountrySnapshot['friend']) =>
  recipient.id === friend.id || recipient.email.toLowerCase() === friend.email.toLowerCase();

const buildSharedJournalPreviews = ({
  countryLabels,
  friend,
  inboundEntries,
  outboundEntries,
}: {
  countryLabels: Record<string, string>;
  friend: FriendCountrySnapshot['friend'] | null;
  inboundEntries: SharedJournalEntry[];
  outboundEntries: OwnedSharedJournalEntry[];
}): SharedJournalPreview[] => {
  if (!friend) return [];

  const inboundPreviews = inboundEntries
    .filter((entry) => entry.sharedBy.id === friend.id || entry.sharedBy.email.toLowerCase() === friend.email.toLowerCase())
    .map<SharedJournalPreview>((entry) => {
      const countryId = getEntryCountryId(entry);

      return {
        id: `inbound-${entry.id}`,
        title: entry.title,
        countryName: countryId ? getCountryName(countryId, countryLabels) : 'Travel story',
        detail: `Shared by ${friend.displayName || friend.email}`,
        sharedAt: entry.sharedAt || entry.updatedAt || entry.createdAt,
        direction: 'from-friend',
      };
    });

  const outboundPreviews = outboundEntries
    .filter(({ recipients }) => recipients.some((recipient) => isMatchingShareRecipient(recipient, friend)))
    .map<SharedJournalPreview>(({ entry, recipients }) => {
      const countryId = getEntryCountryId(entry);
      const matchingRecipient = recipients.find((recipient) => isMatchingShareRecipient(recipient, friend));

      return {
        id: `outbound-${entry.id}`,
        title: entry.title,
        countryName: countryId ? getCountryName(countryId, countryLabels) : 'Travel story',
        detail: `Shared with ${friend.displayName || friend.email}`,
        sharedAt: matchingRecipient?.sharedAt || entry.updatedAt || entry.createdAt,
        direction: 'from-you',
      };
    });

  return [...inboundPreviews, ...outboundPreviews]
    .sort((first, second) => Date.parse(second.sharedAt) - Date.parse(first.sharedAt))
    .slice(0, 4);
};

const fetchSharedJournalContext = async () => {
  const [ownedResponse, inboundResponse] = await Promise.all([
    fetchJournalEntries({ limit: 50, summary: true }),
    fetchSharedJournalEntries({ limit: 50, summary: true }),
  ]);

  const ownedEntries = ownedResponse.success ? ownedResponse.data ?? [] : [];
  const shareResponses = await Promise.all(
    ownedEntries.map(async (entry) => ({
      entry,
      response: await fetchJournalEntryShares(entry.id),
    }))
  );
  const outboundEntries = shareResponses
    .filter(({ response }) => response.success)
    .map<OwnedSharedJournalEntry>(({ entry, response }) => ({
      entry,
      recipients: response.data ?? [],
    }))
    .filter((item) => item.recipients.length > 0);

  return {
    inboundEntries: inboundResponse.success ? inboundResponse.data ?? [] : [],
    outboundEntries,
    error: ownedResponse.success && inboundResponse.success
      ? null
      : inboundResponse.error || ownedResponse.error || 'Unable to load shared journal previews.',
  };
};

// Protected page that loads grouped friendship data through the friends service.
export default function FriendsPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const visitedCountries = useMapStore((state) => state.visitedCountries);
  const countryLabels = useMapStore((state) => state.countryLabels);
  const router = useRouter();
  const [friendsData, setFriendsData] = useState<FriendsResponse>(emptyFriends);
  const [friendCountrySnapshots, setFriendCountrySnapshots] = useState<FriendCountrySnapshot[]>([]);
  const [selectedCompareFriendId, setSelectedCompareFriendId] = useState<string | null>(null);
  const [initialCompareFriendId] = useState(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('friendId')
  );
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [inboundSharedEntries, setInboundSharedEntries] = useState<SharedJournalEntry[]>([]);
  const [outboundSharedEntries, setOutboundSharedEntries] = useState<OwnedSharedJournalEntry[]>([]);
  const [sharedJournalsError, setSharedJournalsError] = useState<string | null>(null);
  const [isSharedJournalsLoading, setIsSharedJournalsLoading] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Friendship | null>(null);
  const [demoShareNotice, setDemoShareNotice] = useState<{ entryId: string; friendName: string; title: string } | null>(null);
  const demoShareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Redirect anonymous users and fetch Travel Circle data for signed-in users.
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!user) {
      return;
    }

    const loadFriends = async () => {
      setLoading(true);
      setCompareLoading(true);
      setIsSharedJournalsLoading(true);
      const [response, countryResponse, sharedJournalContext] = await Promise.all([
        fetchFriends(),
        fetchFriendCountrySnapshots(),
        fetchSharedJournalContext(),
      ]);
      setLoading(false);
      setCompareLoading(false);
      setIsSharedJournalsLoading(false);

      if (response.success && response.data) {
        setFriendsData(response.data);
        setError(null);
      } else {
        setError(response.error || 'Unable to load friends.');
      }

      if (countryResponse.success && countryResponse.data) {
        setFriendCountrySnapshots(countryResponse.data.friends);
        setCompareError(null);
      } else {
        setCompareError(countryResponse.error || 'Unable to load country comparisons.');
      }

      setInboundSharedEntries(sharedJournalContext.inboundEntries);
      setOutboundSharedEntries(sharedJournalContext.outboundEntries);
      setSharedJournalsError(sharedJournalContext.error);
    };

    loadFriends();
  }, [router, user, isLoading]);

  const totalPending = friendsData.incoming.length + friendsData.outgoing.length;
  const heroLabel = user?.displayName || user?.email || 'Traveler';
  const stats = useMemo(
    () => [
      {
        label: 'Friends',
        value: friendsData.friends.length,
        detail: 'Accepted travel circle',
        icon: UsersRound,
        tone: 'bg-[#E8F1EA] text-[#315F43]',
      },
      {
        label: 'Incoming',
        value: friendsData.incoming.length,
        detail: 'Requests to review',
        icon: UserRoundPlus,
        tone: 'bg-[#F3E6D8] text-[#71481F]',
      },
      {
        label: 'Pending',
        value: totalPending,
        detail: 'Open friend requests',
        icon: Clock3,
        tone: 'bg-[#EAF0F6] text-[#27516F]',
      },
    ],
    [friendsData.friends.length, friendsData.incoming.length, totalPending]
  );
  const yourCompareCountries = useMemo(
    () => buildCountryList(visitedCountries, countryLabels),
    [countryLabels, visitedCountries]
  );
  const defaultCompareFriendId = useMemo(() => {
    if (friendCountrySnapshots.length === 0) return null;

    return isDemoMode() && friendCountrySnapshots.some((snapshot) => snapshot.friend.id === DEMO_REMOVABLE_FRIEND_ID)
      ? DEMO_REMOVABLE_FRIEND_ID
      : friendCountrySnapshots[0]?.friend.id ?? null;
  }, [friendCountrySnapshots]);
  const effectiveSelectedCompareFriendId = useMemo(() => {
    const requestedFriendId = selectedCompareFriendId ?? initialCompareFriendId;
    if (!requestedFriendId) return defaultCompareFriendId;

    return friendCountrySnapshots.some((snapshot) => snapshot.friend.id === requestedFriendId)
      ? requestedFriendId
      : defaultCompareFriendId;
  }, [defaultCompareFriendId, friendCountrySnapshots, initialCompareFriendId, selectedCompareFriendId]);
  const selectedCountrySnapshot = useMemo(
    () =>
      friendCountrySnapshots.find((snapshot) => snapshot.friend.id === effectiveSelectedCompareFriendId) ??
      friendCountrySnapshots[0] ??
      null,
    [effectiveSelectedCompareFriendId, friendCountrySnapshots]
  );
  const countryComparison = useMemo(() => {
    if (!selectedCountrySnapshot) return null;

    return compareCountryLists(yourCompareCountries, selectedCountrySnapshot.visitedCountries);
  }, [selectedCountrySnapshot, yourCompareCountries]);
  const sharedJournalPreviews = useMemo(
    () =>
      buildSharedJournalPreviews({
        countryLabels,
        friend: selectedCountrySnapshot?.friend ?? null,
        inboundEntries: inboundSharedEntries,
        outboundEntries: outboundSharedEntries,
      }),
    [countryLabels, inboundSharedEntries, outboundSharedEntries, selectedCountrySnapshot?.friend]
  );

  useEffect(() => {
    if (!user || loading || !isDemoMode()) {
      return;
    }

    const hasDismissedNotice = window.sessionStorage.getItem(DEMO_LENA_SHARE_DISMISSED_STORAGE_KEY) === 'true';
    if (hasDismissedNotice) {
      return;
    }

    const hasTriggeredShare = window.sessionStorage.getItem(DEMO_LENA_SHARE_TRIGGER_STORAGE_KEY) === 'true';
    const lenaInvite = friendsData.outgoing.find(
      (friendship) => friendship.id === DEMO_OUTGOING_FRIEND_REQUEST_ID || friendship.profile.id === DEMO_OUTGOING_FRIEND_ID
    );
    const lenaAccepted = friendsData.friends.some((friendship) => friendship.profile.id === DEMO_OUTGOING_FRIEND_ID);

    if (hasTriggeredShare && lenaAccepted) {
      void readDemoSharedJournalEntriesLarge().then((entries) => {
        if (entries.some((entry) => entry.id === demoLenaSharedJournalEntry.id)) {
          setDemoShareNotice({
            entryId: demoLenaSharedJournalEntry.id,
            friendName: DEMO_OUTGOING_FRIEND_NAME,
            title: demoLenaSharedJournalEntry.title,
          });
        }
      });
      return;
    }

    if (!lenaInvite || hasTriggeredShare || demoShareTimerRef.current) {
      return;
    }

    const demoStartedAt = Number(window.sessionStorage.getItem(DEMO_STARTED_AT_STORAGE_KEY));
    const elapsedDemoTime = Number.isFinite(demoStartedAt) ? Date.now() - demoStartedAt : 0;
    const remainingDelay = Math.max(0, DEMO_LENA_SHARE_DELAY_MS - elapsedDemoTime);

    demoShareTimerRef.current = setTimeout(() => {
      demoShareTimerRef.current = null;
      window.sessionStorage.setItem(DEMO_LENA_SHARE_TRIGGER_STORAGE_KEY, 'true');

      void (async () => {
        const currentFriends = readDemoFriends();
        const currentInvite =
          currentFriends.outgoing.find(
            (friendship) => friendship.id === DEMO_OUTGOING_FRIEND_REQUEST_ID || friendship.profile.id === DEMO_OUTGOING_FRIEND_ID
          ) ?? lenaInvite;
        const acceptedFriendship: Friendship = {
          ...currentInvite,
          status: 'accepted',
          respondedAt: new Date().toISOString(),
          direction: 'friend',
          blockedBy: null,
        };
        const nextFriends: FriendsResponse = {
          ...currentFriends,
          outgoing: currentFriends.outgoing.filter((friendship) => friendship.id !== currentInvite.id),
          friends: [
            acceptedFriendship,
            ...currentFriends.friends.filter((friendship) => friendship.profile.id !== DEMO_OUTGOING_FRIEND_ID),
          ],
        };
        writeDemoFriends(nextFriends);

        const currentSharedEntries = await readDemoSharedJournalEntriesLarge();
        const nextSharedEntries = currentSharedEntries.some((entry) => entry.id === demoLenaSharedJournalEntry.id)
          ? currentSharedEntries
          : [demoLenaSharedJournalEntry, ...currentSharedEntries];
        await writeDemoSharedJournalEntriesLarge(nextSharedEntries);

        const [countryResponse, sharedJournalContext] = await Promise.all([
          fetchFriendCountrySnapshots(),
          fetchSharedJournalContext(),
        ]);
        setFriendsData(nextFriends);
        if (countryResponse.success && countryResponse.data) {
          setFriendCountrySnapshots(countryResponse.data.friends);
          setCompareError(null);
        }
        setInboundSharedEntries(sharedJournalContext.inboundEntries);
        setOutboundSharedEntries(sharedJournalContext.outboundEntries);
        setSharedJournalsError(sharedJournalContext.error);
        setMessage(`${DEMO_OUTGOING_FRIEND_NAME} accepted your invite.`);
        setDemoShareNotice({
          entryId: demoLenaSharedJournalEntry.id,
          friendName: DEMO_OUTGOING_FRIEND_NAME,
          title: demoLenaSharedJournalEntry.title,
        });
      })();
    }, remainingDelay);
  }, [friendsData.friends, friendsData.outgoing, loading, user]);

  useEffect(() => {
    return () => {
      if (demoShareTimerRef.current) {
        clearTimeout(demoShareTimerRef.current);
      }
    };
  }, []);

  if (isLoading || !user) {
    return <AppPageSkeleton variant="friends" />;
  }

  const refreshFriends = async () => {
    const [response, countryResponse, sharedJournalContext] = await Promise.all([
      fetchFriends(),
      fetchFriendCountrySnapshots(),
      fetchSharedJournalContext(),
    ]);

    if (response.success && response.data) {
      setFriendsData(response.data);
    }

    if (countryResponse.success && countryResponse.data) {
      setFriendCountrySnapshots(countryResponse.data.friends);
      setCompareError(null);
    } else if (!countryResponse.success) {
      setCompareError(countryResponse.error || 'Unable to load country comparisons.');
    }

    setInboundSharedEntries(sharedJournalContext.inboundEntries);
    setOutboundSharedEntries(sharedJournalContext.outboundEntries);
    setSharedJournalsError(sharedJournalContext.error);
  };

  const handleSendRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const response = await sendFriendRequest(email);
    setSubmitting(false);

    if (!response.success) {
      setError(response.error || 'Unable to send friend request.');
      return;
    }

    setEmail('');
    setMessage('Friend request sent.');
    await refreshFriends();
  };

  const handleAccept = async (friendshipId: string) => {
    setError(null);
    setMessage(null);
    const response = await updateFriendRequest(friendshipId, 'accept');

    if (!response.success) {
      setError(response.error || 'Unable to accept request.');
      return;
    }

    setMessage('Friend request accepted.');
    await refreshFriends();
  };

  const handleRemove = async (friendshipId: string, successCopy = 'Friendship updated.') => {
    setError(null);
    setMessage(null);
    const response = await removeFriendship(friendshipId);

    if (!response.success) {
      setError(response.error || 'Unable to update friendship.');
      return;
    }

    setMessage(successCopy);
    setPendingRemoval(null);
    await refreshFriends();
  };

  const requestFriendRemoval = (friendship: Friendship) => {
    setError(null);
    setMessage(null);
    setPendingRemoval(friendship);
  };

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      {demoShareNotice ? (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl rounded-2xl border border-gold/30 bg-white p-4 shadow-2xl sm:left-auto sm:right-6 sm:w-[420px]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F1EA] text-[#315F43]">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{demoShareNotice.friendName} shared a journal entry with you.</p>
              <p className="mt-1 text-sm leading-6 text-ink/68">
                <span aria-hidden="true">&ldquo;</span>
                {demoShareNotice.title}
                <span aria-hidden="true">&rdquo;</span> is ready in All Entries.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    window.sessionStorage.setItem(DEMO_LENA_SHARE_DISMISSED_STORAGE_KEY, 'true');
                    setDemoShareNotice(null);
                    router.push(`/journal/entries?sharedEntryId=${encodeURIComponent(demoShareNotice.entryId)}`);
                  }}
                >
                  See entry
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    window.sessionStorage.setItem(DEMO_LENA_SHARE_DISMISSED_STORAGE_KEY, 'true');
                    setDemoShareNotice(null);
                  }}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <PageShell
        title="Friends"
        description="Build a private travel circle for requests now, and shared journals next."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => router.push('/dashboard')} className="gap-2">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Button>
            <Button onClick={() => router.push('/profile')} className="gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Profile
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <Card className="overflow-hidden border-gold/30 bg-[#fff8ea] p-0" variant="elevated">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="p-6 sm:p-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                    <UsersRound className="h-4 w-4" aria-hidden="true" />
                    Travel circle
                  </div>
                  <h2 className="mt-5 max-w-2xl text-4xl font-serif font-semibold leading-tight text-ink sm:text-5xl">
                    Invite friends into your travel archive, {heroLabel}.
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-7 text-ink/72">
                    Friend requests are private for now. Once your circle is ready, shared journals and travel memories can
                    build on this list.
                  </p>
                </div>
                <div className="border-t border-gold/20 bg-[#21382B] p-6 text-cream lg:border-l lg:border-t-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cream/64">Circle size</p>
                  <p className="mt-3 text-6xl font-serif font-semibold">{loading ? '-' : friendsData.friends.length}</p>
                  <p className="mt-4 text-sm leading-6 text-cream/74">
                    {loading
                      ? 'Accepted travel circle.'
                      : friendsData.friends.length > 0
                      ? 'Accepted friends are ready for future sharing.'
                      : 'Start by sending one friend request.'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-white/90">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Add friend</p>
                <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Send an invite</h2>
              </div>
              <form onSubmit={handleSendRequest} className="space-y-4">
                <Input
                  label="Friend email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="friend@example.com"
                  helperText="Use the email attached to their Travel Journal profile."
                />
                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                ) : null}
                {message ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {message}
                  </p>
                ) : null}
                <Button type="submit" isLoading={submitting} className="w-full gap-2">
                  <MailPlus className="h-4 w-4" aria-hidden="true" />
                  Send request
                </Button>
              </form>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-3xl border border-gold/20 bg-white p-5 shadow-soft">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.tone}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-ink/52">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-ink">{loading ? '-' : stat.value}</p>
                  <p className="mt-1 text-sm text-ink/62">{stat.detail}</p>
                </div>
              );
            })}
          </section>

          <CountryCompareSection
            compareError={compareError}
            compareLoading={compareLoading}
            countryComparison={countryComparison}
            friendSnapshots={friendCountrySnapshots}
            onOpenJournal={() => router.push('/journal')}
            selectedFriendId={effectiveSelectedCompareFriendId}
            sharedJournalPreviews={sharedJournalPreviews}
            sharedJournalsError={sharedJournalsError}
            sharedJournalsLoading={isSharedJournalsLoading}
            onSelectFriend={setSelectedCompareFriendId}
            yourCountryCount={yourCompareCountries.length}
          />

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <Card className="bg-white/90">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Friends</p>
                  <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Your travel circle</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refreshFriends()} className="gap-2 self-start sm:self-auto">
                  Refresh
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {pendingRemoval ? (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-ink">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="font-semibold">Remove {getFriendLabel(pendingRemoval)} from your Travel Circle?</p>
                        <p className="mt-1 leading-6 text-ink/72">
                          You would need to send a new friend request and have them accept it again. Shared entries from
                          this friend will also be removed.
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPendingRemoval(null)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => handleRemove(pendingRemoval.id, 'Friend removed.')}
                      >
                        <UserMinus className="h-4 w-4" aria-hidden="true" />
                        Remove friend
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {friendsData.friends.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {friendsData.friends.map((friendship) => (
                    <FriendCard
                      key={friendship.id}
                      friendship={friendship}
                      actionLabel="Remove friend"
                      actionIcon={UserMinus}
                      actionDisabled={friendship.profile.id === DEMO_SHARE_RECIPIENT_ID}
                      onAction={() => requestFriendRemoval(friendship)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={UsersRound}
                  title="No friends yet"
                  description="Send an invite by email to start building your travel circle."
                />
              )}
            </Card>

            <div className="space-y-6">
              <Card className="bg-[#F8F1E4]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Incoming</p>
                    <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Requests</h2>
                  </div>
                  <UserRoundPlus className="h-6 w-6 text-gold-deep" aria-hidden="true" />
                </div>
                {friendsData.incoming.length > 0 ? (
                  <div className="space-y-3">
                    {friendsData.incoming.map((friendship) => (
                      <FriendCard
                        key={friendship.id}
                        friendship={friendship}
                        actionLabel="Accept"
                        actionIcon={UserCheck}
                        onAction={() => handleAccept(friendship.id)}
                        secondaryActionLabel="Decline"
                        secondaryActionIcon={X}
                        onSecondaryAction={() => handleRemove(friendship.id, 'Request declined.')}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={UserCheck} title="No requests" description="New friend requests will appear here." compact />
                )}
              </Card>

              <Card className="bg-white/90">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Outgoing</p>
                    <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Sent invites</h2>
                  </div>
                  <Send className="h-6 w-6 text-gold-deep" aria-hidden="true" />
                </div>
                {friendsData.outgoing.length > 0 ? (
                  <div className="space-y-3">
                    {friendsData.outgoing.map((friendship) => (
                      <FriendCard
                        key={friendship.id}
                        friendship={friendship}
                        actionLabel="Cancel"
                        actionIcon={X}
                        onAction={() => handleRemove(friendship.id, 'Request canceled.')}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Clock3} title="No sent invites" description="Pending invites you send will appear here." compact />
                )}
              </Card>
            </div>
          </section>
        </div>
      </PageShell>
    </div>
  );
}

function CountryCompareSection({
  compareError,
  compareLoading,
  countryComparison,
  friendSnapshots,
  onOpenJournal,
  onSelectFriend,
  selectedFriendId,
  sharedJournalPreviews,
  sharedJournalsError,
  sharedJournalsLoading,
  yourCountryCount,
}: {
  compareError: string | null;
  compareLoading: boolean;
  countryComparison: ReturnType<typeof compareCountryLists> | null;
  friendSnapshots: FriendCountrySnapshot[];
  onOpenJournal: () => void;
  onSelectFriend: (friendId: string) => void;
  selectedFriendId: string | null;
  sharedJournalPreviews: SharedJournalPreview[];
  sharedJournalsError: string | null;
  sharedJournalsLoading: boolean;
  yourCountryCount: number;
}) {
  const [countryDrawer, setCountryDrawer] = useState<CountrySpreadDrawer | null>(null);
  const selectedSnapshot = friendSnapshots.find((snapshot) => snapshot.friend.id === selectedFriendId) ?? null;
  const selectedFriendName = selectedSnapshot?.friend.displayName || selectedSnapshot?.friend.email || 'your friend';
  const nextDestination = countryComparison?.nextTripIdeas[0] ?? null;
  const regionOverlap = countryComparison
    ? buildRegionOverlap(
        [...countryComparison.sharedCountries, ...countryComparison.onlyYouCountries],
        [...countryComparison.sharedCountries, ...countryComparison.onlyFriendCountries],
        countryComparison.sharedCountries
      )
    : [];
  const travelCircleBadges = countryComparison
    ? buildTravelCircleBadges(countryComparison, regionOverlap, sharedJournalPreviews)
    : [];

  return (
    <>
      <Card className="overflow-hidden border-gold/28 bg-[#FFF8EA] p-0 shadow-soft">
        <div className="grid gap-0 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="relative overflow-hidden border-b border-gold/18 bg-[#20362B] p-6 text-cream xl:border-b-0 xl:border-r">
          <div className="absolute right-[-46px] top-[-46px] h-32 w-32 rounded-full border border-cream/10" aria-hidden="true" />
          <div className="absolute bottom-5 right-5 text-[6.5rem] font-serif font-semibold leading-none text-cream/[0.04]" aria-hidden="true">
            TJ
          </div>
          <div className="relative flex h-11 w-11 items-center justify-center rounded-lg bg-cream/12 text-cream">
            <Globe2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="relative mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-cream/64">Friends compare</p>
          <h2 className="relative mt-2 text-3xl font-serif font-semibold leading-tight">Shared discovery, country by country.</h2>
          <p className="relative mt-4 text-sm leading-6 text-cream/74">
            Compare country-level travel overlap with accepted friends. Journals, photos, cities, stamps, and timestamps stay private.
          </p>
          <div className="relative mt-5 flex items-center gap-2 rounded-lg border border-cream/14 bg-cream/8 px-3 py-2 text-xs font-semibold text-cream/78">
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            Country names only
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {compareError ? (
            <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{compareError}</p>
          ) : null}

          {compareLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-36 animate-pulse rounded-lg bg-cream" />
              ))}
            </div>
          ) : friendSnapshots.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No country comparisons yet"
              description="Accepted friends with mapped countries will appear here."
            />
          ) : yourCountryCount === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="Mark your first country"
              description="Your country list stays on your map until there is something to compare."
            />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Passport spread</p>
                  <h3 className="mt-1 text-2xl font-serif font-semibold text-ink">
                    You and {selectedFriendName}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {friendSnapshots.map((snapshot) => {
                    const label = snapshot.friend.displayName || snapshot.friend.email || 'Friend';
                    const isSelected = snapshot.friend.id === selectedFriendId;

                    return (
                      <button
                        key={snapshot.friend.id}
                        type="button"
                        onClick={() => onSelectFriend(snapshot.friend.id)}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          isSelected
                            ? 'border-gold bg-gold text-ink'
                            : 'border-gold/24 bg-cream/50 text-ink/72 hover:border-gold/50 hover:text-ink'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedSnapshot && selectedSnapshot.visitedCountries.length === 0 ? (
                <EmptyState
                  icon={Globe2}
                  title="No mapped countries for this friend"
                  description="When they mark countries on their map, country-only overlap will appear here."
                  compact
                />
              ) : countryComparison ? (
                <div className="space-y-4">
                  <div className="relative rounded-lg border border-gold/24 bg-[#EAD8B8] p-3 shadow-inner">
                    <div className="pointer-events-none absolute inset-y-4 left-1/2 hidden w-px -translate-x-1/2 bg-gold/28 lg:block" aria-hidden="true" />
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.82fr)_minmax(0,1fr)]">
                      <CountryListPanel
                        icon={Sparkles}
                        title="Your discoveries"
                        eyebrow="Places you can tell them about"
                        count={countryComparison.onlyYouCountries.length}
                        countries={countryComparison.onlyYouCountries}
                        emptyCopy="No solo discoveries yet."
                        onViewAll={setCountryDrawer}
                        variant="left"
                      />
                      <CountryListPanel
                        icon={Stamp}
                        title="Places you both know"
                        eyebrow="Shared stamp area"
                        count={countryComparison.sharedCountries.length}
                        countries={countryComparison.sharedCountries}
                        emptyCopy="No shared countries yet."
                        onViewAll={setCountryDrawer}
                        variant="center"
                      />
                      <CountryListPanel
                        icon={MapPinned}
                        title="Their discoveries"
                        eyebrow="Places they can tell you about"
                        count={countryComparison.onlyFriendCountries.length}
                        countries={countryComparison.onlyFriendCountries}
                        emptyCopy="No friend-only discoveries yet."
                        onViewAll={setCountryDrawer}
                        variant="right"
                      />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-gold/24 bg-white shadow-soft">
                    <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_190px]">
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
                          <PlaneTakeoff className="h-4 w-4" aria-hidden="true" />
                          Next destination
                        </div>
                        <p className="mt-2 text-2xl font-serif font-semibold text-ink">
                          {nextDestination ? nextDestination.name : 'Keep exploring together'}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-ink/62">
                          {nextDestination
                            ? `${selectedFriendName} has this on their country map, so it is a gentle place to ask about next.`
                            : 'Your country lists already overlap here. Add more mapped countries to uncover fresh ideas.'}
                        </p>
                      </div>
                      <div className="relative border-t border-dashed border-gold/34 bg-[#F8F1E4] p-4 md:border-l md:border-t-0">
                        <div className="absolute bottom-3 right-3 h-12 w-12 rounded-full border border-dashed border-gold/42" aria-hidden="true" />
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/44">Boarding pass</p>
                        <p className="mt-3 text-sm font-semibold text-ink">TRAVEL CIRCLE</p>
                        <p className="mt-1 text-xs text-ink/56">Country-only compare</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-lg border border-gold/20 bg-white/90 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">Region overlap</p>
                          <p className="mt-1 text-lg font-serif font-semibold text-ink">Shared map zones</p>
                        </div>
                        <Globe2 className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                      </div>
                      {regionOverlap.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {regionOverlap.map((region) => {
                            const overlapCount = getRegionOverlapCount(region);

                            return (
                              <div key={region.region} className="rounded-lg border border-gold/12 bg-cream/40 px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="min-w-0 truncate text-sm font-semibold text-ink">{region.region}</p>
                                  <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-ink/46">
                                    {overlapCount} overlap
                                  </p>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                                  <div
                                    className="h-full rounded-full bg-gold"
                                    style={{
                                      width: `${Math.max(
                                        18,
                                        Math.min(100, (overlapCount / Math.max(region.yourCount, region.friendCount, 1)) * 100)
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm leading-6 text-ink/62">
                          Add more country stamps to reveal region overlap.
                        </p>
                      )}
                    </div>

                  </div>

                  <div className="grid gap-4">
                    <SharedJournalsCard
                      entries={sharedJournalPreviews}
                      error={sharedJournalsError}
                      isLoading={sharedJournalsLoading}
                      onOpenJournal={onOpenJournal}
                      selectedFriendName={selectedFriendName}
                    />
                  </div>

                  <div className="rounded-lg border border-gold/20 bg-white/90 p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
                      Travel circle badges
                    </div>
                    <TravelCircleBadgeProgress
                      key={selectedFriendId ?? 'friend-badges'}
                      badges={travelCircleBadges}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
        </div>
      </Card>
      {countryDrawer ? (
        <CountrySpreadDrawer drawer={countryDrawer} onClose={() => setCountryDrawer(null)} />
      ) : null}
    </>
  );
}

function CountrySpreadDrawer({
  drawer,
  onClose,
}: {
  drawer: CountrySpreadDrawer;
  onClose: () => void;
}) {
  const isCenter = drawer.variant === 'center';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/45 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <aside
        aria-label={`${drawer.title} countries`}
        aria-modal="true"
        className="h-full w-full max-w-[520px] overflow-y-auto bg-[#FFF8EA] shadow-[-18px_0_40px_rgba(61,43,14,0.24)]"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`sticky top-0 z-10 border-b border-gold/20 px-5 py-4 ${isCenter ? 'bg-[#FFFDF7]' : 'bg-[#FFF8EA]'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">{drawer.eyebrow}</p>
              <h3 className="mt-1 text-2xl font-serif font-semibold text-ink">{drawer.title}</h3>
              <p className="mt-1 text-sm text-ink/58">
                {drawer.countries.length} countr{drawer.countries.length === 1 ? 'y' : 'ies'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gold/24 bg-white text-ink transition hover:border-gold/50 hover:text-gold-deep"
              aria-label="Close country list"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
          {drawer.countries.map((country) => (
            <div key={country.id} className="rounded-lg border border-gold/18 bg-white/82 p-2 shadow-sm">
              <CountryPassportStamp country={country} featured={isCenter} />
              <p className="mt-2 truncate text-sm font-semibold text-ink" title={country.name}>
                {country.name}
              </p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function SharedJournalsCard({
  entries,
  error,
  isLoading,
  onOpenJournal,
  selectedFriendName,
}: {
  entries: SharedJournalPreview[];
  error: string | null;
  isLoading: boolean;
  onOpenJournal: () => void;
  selectedFriendName: string;
}) {
  return (
    <div className="rounded-lg border border-gold/20 bg-white/90 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">Shared journals</p>
          <p className="mt-1 text-lg font-serif font-semibold text-ink">Stories in this circle</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F1EA] text-[#315F43]">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>
      ) : null}

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-lg bg-cream/60" />
          ))}
        </div>
      ) : entries.length > 0 ? (
        <div className="mt-4 space-y-2">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={onOpenJournal}
              className="group w-full rounded-lg border border-gold/16 bg-[#FFF8EA] p-3 text-left transition hover:border-gold/45 hover:bg-cream/70"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{entry.title}</p>
                  <p className="mt-1 truncate text-xs leading-5 text-ink/58">{entry.countryName}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink/42">{entry.detail}</p>
                </div>
                <span className="shrink-0 rounded-full border border-gold/20 bg-cream px-2 py-1 text-xs font-semibold text-ink/55">
                  {entry.direction === 'from-you' ? 'You shared' : 'Shared with you'}
                </span>
              </div>
              <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-gold-deep transition group-hover:translate-x-1">
                Open journal
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No shared journals yet"
          description={`Share an entry with ${selectedFriendName}, or open one they share with you, and it will preview here.`}
          compact
        />
      )}
    </div>
  );
}

function TravelCircleBadgeProgress({ badges }: { badges: TravelTwinBadge[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="rounded-lg border border-gold/20 bg-white/90 p-4">
      <div className="mt-3 flex flex-col gap-2 md:flex-row md:flex-wrap xl:flex-nowrap">
        {badges
          .slice()
          .sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
          .map((badge) => (
            <div
              key={badge.id}
              className={`rounded-2xl border px-3 py-4 xl:flex-1 ${
                badge.unlocked
                  ? 'border-[#315F43] bg-[#E8F1EA] shadow-sm shadow-[#315F43]/10'
                  : 'border-gold/20 bg-[#FCF8EE] text-ink/60'
              }`}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <span
                  className={`relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[1.75rem] p-3 ${
                    badge.unlocked ? 'bg-white shadow-sm shadow-[#315F43]/10' : 'bg-[#ECECEC]'
                  }`}
                >
                  <span className={`absolute inset-0 rounded-[1.75rem] ${badge.unlocked ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,223,102,0.18),_transparent_60%)]' : ''}`} />
                  <Image
                    src={badge.imageSrc}
                    alt={`${badge.label} badge`}
                    width={128}
                    height={128}
                    className={`h-full w-full rounded-[1.25rem] object-contain ${badge.unlocked ? '' : 'grayscale'}`}
                  />
                </span>
                <span className="text-sm font-semibold text-ink">{badge.label}</span>
                {badge.unlocked ? (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#315F43]/80">
                    Accomplished
                  </span>
                ) : null}
                <span className={`text-xs leading-5 ${badge.unlocked ? 'text-ink/70' : 'text-ink/55'}`}>
                  {badge.unlocked ? badge.detail : badge.earnLabel}
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function CountryListPanel({
  count,
  countries,
  emptyCopy,
  eyebrow,
  icon: Icon,
  onViewAll,
  title,
  variant,
}: {
  count: number;
  countries: FriendCountry[];
  emptyCopy: string;
  eyebrow: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onViewAll: (drawer: CountrySpreadDrawer) => void;
  title: string;
  variant: 'left' | 'center' | 'right';
}) {
  const isCenter = variant === 'center';

  return (
    <div
      className={`relative min-h-[250px] overflow-hidden rounded-lg border p-4 ${
        isCenter
          ? 'border-gold/42 bg-[#FFFDF7] shadow-[0_12px_30px_rgba(61,43,14,0.14)]'
          : 'border-gold/18 bg-[#FFF8EA] shadow-sm'
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-3 rounded-lg border ${
          isCenter ? 'border-dashed border-gold/34' : 'border-gold/10'
        }`}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full border border-gold/12" aria-hidden="true" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">{eyebrow}</p>
          <p className="mt-1 text-lg font-serif font-semibold text-ink">{title}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/42">
            {count} countr{count === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            isCenter ? 'bg-gold text-ink' : 'bg-white text-gold-deep'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      {countries.length > 0 ? (
        <div className="relative z-10 mt-4 flex flex-wrap gap-2">
          {countries.slice(0, 8).map((country) => (
            <CountryPassportStamp key={country.id} country={country} featured={isCenter} />
          ))}
          {countries.length > 8 ? (
            <button
              type="button"
              onClick={() => onViewAll({ countries, eyebrow, title, variant })}
              className={`group flex h-[142px] w-[112px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gold/30 bg-white/80 px-3 py-3 text-center text-ink/62 transition hover:border-gold/60 hover:bg-white hover:text-ink ${
                isCenter ? 'shadow-[0_12px_24px_rgba(61,43,14,0.12)]' : 'shadow-sm'
              }`}
              title={`View all ${countries.length} countries`}
            >
              <span className="text-2xl font-serif font-semibold text-ink">+{countries.length - 8}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.12em]">more</span>
              <Stamp className="h-4 w-4 text-gold-deep transition group-hover:scale-110" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink/58">{emptyCopy}</p>
      )}
    </div>
  );
}

function CountryPassportStamp({ country, featured = false }: { country: FriendCountry; featured?: boolean }) {
  const stamp = findCountryStamp(country.id, country.name);

  if (stamp) {
    return (
      <span
        aria-label={`${country.name} passport stamp`}
        title={country.name}
        className={`block h-[142px] w-[112px] overflow-hidden rounded-lg ${
          featured ? 'shadow-[0_12px_24px_rgba(61,43,14,0.18)]' : 'shadow-sm'
        }`}
      >
        <span className="block origin-top-left scale-[0.59]">
          <StampRenderer stamp={stamp} />
        </span>
      </span>
    );
  }

  const countryCode =
    country.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || country.id.slice(0, 2).toUpperCase();

  return (
    <span
      aria-label={`${country.name} passport stamp`}
      title={country.name}
      className={`relative block h-[142px] w-[112px] overflow-hidden rounded-lg ${
        featured ? 'shadow-[0_12px_24px_rgba(61,43,14,0.18)]' : 'shadow-sm'
      }`}
    >
      <Image
        className="h-full w-full object-cover"
        src="/stamps/countries/placeholder.png"
        alt=""
        aria-hidden="true"
        width={1024}
        height={1024}
        unoptimized
        draggable={false}
      />
      <span className="absolute inset-0 bg-gradient-to-b from-cream/20 via-transparent to-ink/58" aria-hidden="true" />
      <span className="absolute inset-x-2 top-2 flex items-center justify-between gap-2 text-[0.55rem] font-bold uppercase tracking-[0.12em] text-ink/58">
        <span>Pending</span>
        <span>{countryCode}</span>
      </span>
      <span className="absolute inset-x-2 bottom-2 rounded bg-cream/88 px-2 py-1.5 text-center shadow-sm">
        <span className="block truncate text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-gold-deep">Placeholder</span>
        <span className="block truncate text-xs font-serif font-semibold leading-tight text-ink">{country.name}</span>
      </span>
    </span>
  );
}

// Displays either a profile image or initials for a friendship row.
function FriendAvatar({ friendship }: { friendship: Friendship }) {
  const label = getFriendLabel(friendship);
  const avatarUrl = friendship.profile.avatar?.trim();

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gold/20 bg-cream text-sm font-semibold text-gold-deep">
      {avatarUrl ? (
        <span
          role="img"
          aria-label={`${label} avatar`}
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${avatarUrl})` }}
        />
      ) : (
        <span aria-hidden="true">{getInitials(label)}</span>
      )}
    </span>
  );
}

// Reusable card for accepted, incoming, outgoing, and blocked friendships.
function FriendCard({
  actionIcon: ActionIcon,
  actionDisabled = false,
  actionDisabledLabel,
  actionLabel,
  friendship,
  onAction,
  onSecondaryAction,
  secondaryActionIcon: SecondaryActionIcon,
  secondaryActionLabel,
}: {
  actionIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  actionDisabled?: boolean;
  actionDisabledLabel?: string;
  actionLabel: string;
  friendship: Friendship;
  onAction: () => void;
  onSecondaryAction?: () => void;
  secondaryActionIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  secondaryActionLabel?: string;
}) {
  const label = getFriendLabel(friendship);

  return (
    <article className="rounded-lg border border-gold/16 bg-cream/36 p-3">
      <div className="flex items-start gap-3">
        <FriendAvatar friendship={friendship} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-ink">{label}</h3>
          <p className="truncate text-sm text-ink/62">{friendship.profile.email}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/42">
            {friendship.status} / {formatDate(friendship.createdAt)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onAction} disabled={actionDisabled} className="gap-2">
          <ActionIcon className="h-4 w-4" aria-hidden="true" />
          {actionDisabled && actionDisabledLabel ? actionDisabledLabel : actionLabel}
        </Button>
        {onSecondaryAction && SecondaryActionIcon && secondaryActionLabel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onSecondaryAction} className="gap-2">
            <SecondaryActionIcon className="h-4 w-4" aria-hidden="true" />
            {secondaryActionLabel}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

// Shared empty state for friend-list sections.
function EmptyState({
  compact = false,
  description,
  icon: Icon,
  title,
}: {
  compact?: boolean;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
}) {
  return (
    <div className={`rounded-lg border border-dashed border-gold/30 bg-white/60 ${compact ? 'p-4' : 'p-6'} text-ink/65`}>
      <Icon className="h-5 w-5 text-gold-deep" aria-hidden="true" />
      <p className="mt-3 font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6">{description}</p>
    </div>
  );
}
