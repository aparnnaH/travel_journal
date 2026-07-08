// Travel Circle page.
// Lets signed-in users send friend requests, accept/block incoming requests, and
// manage relationships that journal sharing depends on.
'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import { DEMO_SHARE_RECIPIENT_ID } from '@/lib/demoMode';
import {
  fetchFriendCountrySnapshots,
  fetchFriends,
  removeFriendship,
  sendFriendRequest,
  updateFriendRequest,
} from '@/lib/friendService';
import { fetchJournalEntries } from '@/lib/journalService';
import { findCountryStamp } from '@/lib/stamps/matching';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';
import type { JournalEntry } from '@/types';
import type { FriendCountry, FriendCountrySnapshot, FriendsResponse, Friendship } from '@/types/friends';
import type { CountryStamp } from '@/types/stamps';

const emptyFriends: FriendsResponse = {
  friends: [],
  incoming: [],
  outgoing: [],
  blocked: [],
};

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
  label: string;
  detail: string;
};

type JournalGap = {
  countryId: string;
  countryName: string;
  stamp: CountryStamp;
};

const formatCountryList = (countries: FriendCountry[]) => {
  if (countries.length === 0) return '';
  if (countries.length === 1) return countries[0].name;
  if (countries.length === 2) return `${countries[0].name} and ${countries[1].name}`;

  return `${countries[0].name}, ${countries[1].name}, and ${countries[2].name}`;
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

const buildTravelTwinBadge = (
  comparison: ReturnType<typeof compareCountryLists>,
  regionOverlap: RegionOverlap[]
): TravelTwinBadge => {
  if (comparison.sharedCountries.length >= 3) {
    return {
      label: 'Shared Stamp Spark',
      detail: 'You already have several countries in common.',
    };
  }

  if (comparison.sharedCountries.length > 0 || regionOverlap.some((region) => region.sharedCount > 0)) {
    return {
      label: 'Neighboring Routes',
      detail: 'Your maps cross paths in familiar places.',
    };
  }

  if (comparison.onlyFriendCountries.length > 0 && comparison.onlyYouCountries.length > 0) {
    return {
      label: 'Story Swap Pair',
      detail: 'You each have stamps the other can ask about.',
    };
  }

  return {
    label: 'Future Trip Energy',
    detail: 'Your maps are ready for new shared stamps.',
  };
};

const buildTravelCircleHighlights = (
  comparison: ReturnType<typeof compareCountryLists>,
  selectedFriendName: string
) => {
  const highlights: string[] = [];
  const sharedRegion = buildRegionOverlap(
    [...comparison.sharedCountries, ...comparison.onlyYouCountries],
    [...comparison.sharedCountries, ...comparison.onlyFriendCountries],
    comparison.sharedCountries
  )[0];

  if (comparison.sharedCountries.length > 0) {
    highlights.push(
      `You both have ${formatCountryList(comparison.sharedCountries.slice(0, 3))} in your passport spread.`
    );
  } else if (sharedRegion) {
    highlights.push(`Your maps both touch ${sharedRegion.region}, even without a shared country yet.`);
  } else {
    highlights.push('Your maps are mostly different right now, which gives you more stories to trade.');
  }

  if (comparison.onlyFriendCountries.length > 0) {
    highlights.push(`Ask ${selectedFriendName} about ${formatCountryList(comparison.onlyFriendCountries.slice(0, 3))}.`);
  }

  if (comparison.onlyYouCountries.length > 0) {
    highlights.push(`You can recommend ${formatCountryList(comparison.onlyYouCountries.slice(0, 3))}.`);
  }

  return highlights.slice(0, 3);
};

const buildJournalGaps = (
  visitedCountries: string[],
  countryLabels: Record<string, string>,
  journalEntries: JournalEntry[]
): JournalGap[] => {
  const journalStampIds = new Set<string>();

  journalEntries.forEach((entry) => {
    const countryId = entry.countryId?.trim();
    if (!countryId) return;

    const stamp = findCountryStamp(countryId, countryLabels[countryId] || countryId);
    if (stamp) {
      journalStampIds.add(stamp.id);
    }
  });

  return [...new Set(visitedCountries)]
    .map((countryId) => {
      const countryName = getCountryName(countryId, countryLabels);
      const stamp = findCountryStamp(countryId, countryName);

      if (!stamp || journalStampIds.has(stamp.id)) {
        return null;
      }

      return {
        countryId,
        countryName,
        stamp,
      };
    })
    .filter((gap): gap is JournalGap => Boolean(gap))
    .slice(0, 4);
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
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalGapsError, setJournalGapsError] = useState<string | null>(null);
  const [isJournalGapsLoading, setIsJournalGapsLoading] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Friendship | null>(null);

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
      setIsJournalGapsLoading(true);
      const [response, countryResponse, journalResponse] = await Promise.all([
        fetchFriends(),
        fetchFriendCountrySnapshots(),
        fetchJournalEntries({ limit: 200, summary: true }),
      ]);
      setLoading(false);
      setCompareLoading(false);
      setIsJournalGapsLoading(false);

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

      if (journalResponse.success) {
        setJournalEntries(journalResponse.data ?? []);
        setJournalGapsError(null);
      } else {
        setJournalEntries([]);
        setJournalGapsError(journalResponse.error || 'Unable to load journal coverage.');
      }
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
  const selectedCountrySnapshot = useMemo(
    () =>
      friendCountrySnapshots.find((snapshot) => snapshot.friend.id === selectedCompareFriendId) ??
      friendCountrySnapshots[0] ??
      null,
    [friendCountrySnapshots, selectedCompareFriendId]
  );
  const countryComparison = useMemo(() => {
    if (!selectedCountrySnapshot) return null;

    return compareCountryLists(yourCompareCountries, selectedCountrySnapshot.visitedCountries);
  }, [selectedCountrySnapshot, yourCompareCountries]);
  const journalGaps = useMemo(
    () => buildJournalGaps(visitedCountries, countryLabels, journalEntries),
    [countryLabels, journalEntries, visitedCountries]
  );

  if (isLoading || !user) {
    return <AppPageSkeleton variant="friends" />;
  }

  const refreshFriends = async () => {
    const [response, countryResponse, journalResponse] = await Promise.all([
      fetchFriends(),
      fetchFriendCountrySnapshots(),
      fetchJournalEntries({ limit: 200, summary: true }),
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

    if (journalResponse.success) {
      setJournalEntries(journalResponse.data ?? []);
      setJournalGapsError(null);
    } else {
      setJournalGapsError(journalResponse.error || 'Unable to load journal coverage.');
    }
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
                  <p className="mt-3 text-6xl font-serif font-semibold">{friendsData.friends.length}</p>
                  <p className="mt-4 text-sm leading-6 text-cream/74">
                    {friendsData.friends.length > 0
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
                  <p className="mt-2 text-3xl font-semibold text-ink">{loading ? '...' : stat.value}</p>
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
            isJournalGapsLoading={isJournalGapsLoading}
            journalGaps={journalGaps}
            journalGapsError={journalGapsError}
            onOpenJournal={() => router.push('/journal')}
            onOpenMap={() => router.push('/map')}
            onOpenPassport={(stampId) => router.push(`/passport?stamp=${encodeURIComponent(stampId)}`)}
            selectedFriendId={selectedCountrySnapshot?.friend.id ?? null}
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
  isJournalGapsLoading,
  journalGaps,
  journalGapsError,
  onOpenJournal,
  onOpenMap,
  onOpenPassport,
  onSelectFriend,
  selectedFriendId,
  yourCountryCount,
}: {
  compareError: string | null;
  compareLoading: boolean;
  countryComparison: ReturnType<typeof compareCountryLists> | null;
  friendSnapshots: FriendCountrySnapshot[];
  isJournalGapsLoading: boolean;
  journalGaps: JournalGap[];
  journalGapsError: string | null;
  onOpenJournal: () => void;
  onOpenMap: () => void;
  onOpenPassport: (stampId: string) => void;
  onSelectFriend: (friendId: string) => void;
  selectedFriendId: string | null;
  yourCountryCount: number;
}) {
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
  const travelCircleHighlights = countryComparison ? buildTravelCircleHighlights(countryComparison, selectedFriendName) : [];
  const travelTwinBadge = countryComparison ? buildTravelTwinBadge(countryComparison, regionOverlap) : null;

  return (
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
                  {travelTwinBadge ? (
                    <div className="mt-3 inline-flex max-w-full items-start gap-3 rounded-lg border border-gold/24 bg-[#F8F1E4] px-3 py-2 text-left shadow-sm">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold text-ink">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{travelTwinBadge.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-ink/62">{travelTwinBadge.detail}</span>
                      </span>
                    </div>
                  ) : null}
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
                    <div className="absolute inset-y-4 left-1/2 hidden w-px -translate-x-1/2 bg-gold/28 lg:block" aria-hidden="true" />
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.82fr)_minmax(0,1fr)]">
                      <CountryListPanel
                        icon={Sparkles}
                        title="Your discoveries"
                        eyebrow="Places you can tell them about"
                        count={countryComparison.onlyYouCountries.length}
                        countries={countryComparison.onlyYouCountries}
                        emptyCopy="No solo discoveries yet."
                        variant="left"
                      />
                      <CountryListPanel
                        icon={Stamp}
                        title="Places you both know"
                        eyebrow="Shared stamp area"
                        count={countryComparison.sharedCountries.length}
                        countries={countryComparison.sharedCountries}
                        emptyCopy="No shared countries yet."
                        variant="center"
                      />
                      <CountryListPanel
                        icon={MapPinned}
                        title="Their discoveries"
                        eyebrow="Places they can tell you about"
                        count={countryComparison.onlyFriendCountries.length}
                        countries={countryComparison.onlyFriendCountries}
                        emptyCopy="No friend-only discoveries yet."
                        variant="right"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
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
                          {regionOverlap.map((region) => (
                            <div key={region.region} className="rounded-lg border border-gold/12 bg-cream/40 px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="min-w-0 truncate text-sm font-semibold text-ink">{region.region}</p>
                                <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-ink/46">
                                  {region.sharedCount > 0 ? `${region.sharedCount} shared` : 'same region'}
                                </p>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                                <div
                                  className="h-full rounded-full bg-gold"
                                  style={{
                                    width: `${Math.max(
                                      18,
                                      Math.min(100, (region.sharedCount / Math.max(region.yourCount, region.friendCount, 1)) * 100)
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm leading-6 text-ink/62">
                          Add more country stamps to reveal region overlap.
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border border-gold/20 bg-[#FFFDF7] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">Travel Circle highlights</p>
                          <p className="mt-1 text-lg font-serif font-semibold text-ink">What your maps suggest</p>
                        </div>
                        <Compass className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                      </div>
                      <div className="mt-4 space-y-2">
                        {travelCircleHighlights.map((highlight) => (
                          <p key={highlight} className="rounded-lg border border-gold/12 bg-cream/40 px-3 py-2 text-sm leading-6 text-ink/72">
                            {highlight}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <FriendTripIdeasCard
                      comparison={countryComparison}
                      friendName={selectedFriendName}
                      onOpenMap={onOpenMap}
                      onOpenPassport={onOpenPassport}
                    />
                    <JournalGapsCard
                      error={journalGapsError}
                      gaps={journalGaps}
                      isLoading={isJournalGapsLoading}
                      onOpenJournal={onOpenJournal}
                    />
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
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function FriendTripIdeasCard({
  comparison,
  friendName,
  onOpenMap,
  onOpenPassport,
}: {
  comparison: ReturnType<typeof compareCountryLists>;
  friendName: string;
  onOpenMap: () => void;
  onOpenPassport: (stampId: string) => void;
}) {
  const tripIdeas = comparison.onlyFriendCountries.slice(0, 3);

  return (
    <div className="rounded-lg border border-gold/20 bg-white/90 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">Friend trip ideas</p>
          <p className="mt-1 text-lg font-serif font-semibold text-ink">Ask about their map</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F8F1E4] text-gold-deep">
          <PlaneTakeoff className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {tripIdeas.length > 0 ? (
        <div className="mt-4 space-y-2">
          {tripIdeas.map((country) => {
            const stamp = findCountryStamp(country.id, country.name);

            return (
              <div key={country.id} className="rounded-lg border border-gold/16 bg-[#FFF8EA] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{country.name}</p>
                    <p className="mt-1 text-xs leading-5 text-ink/58">{friendName} has this country on their map.</p>
                  </div>
                  {stamp ? (
                    <span className="shrink-0 rounded-full border border-gold/20 bg-cream px-2 py-1 text-xs font-semibold text-ink/55">
                      {stamp.region}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={onOpenMap} className="gap-2">
                    <MapPinned className="h-4 w-4" aria-hidden="true" />
                    Map
                  </Button>
                  {stamp ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => onOpenPassport(stamp.id)} className="gap-2">
                      <Stamp className="h-4 w-4" aria-hidden="true" />
                      Passport
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={PlaneTakeoff}
          title="No friend-only countries yet"
          description="When this friend has mapped countries you have not visited, trip ideas will appear here."
          compact
        />
      )}
    </div>
  );
}

function JournalGapsCard({
  error,
  gaps,
  isLoading,
  onOpenJournal,
}: {
  error: string | null;
  gaps: JournalGap[];
  isLoading: boolean;
  onOpenJournal: () => void;
}) {
  return (
    <div className="rounded-lg border border-gold/20 bg-white/90 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">Journal gaps</p>
          <p className="mt-1 text-lg font-serif font-semibold text-ink">Stamped, not written</p>
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
      ) : gaps.length > 0 ? (
        <div className="mt-4 space-y-2">
          {gaps.map((gap) => (
            <div key={`${gap.countryId}-${gap.stamp.id}`} className="rounded-lg border border-gold/16 bg-[#FFF8EA] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{gap.countryName}</p>
                  <p className="mt-1 text-xs leading-5 text-ink/58">
                    {gap.countryName} has a stamp but no story yet.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-gold/20 bg-cream px-2 py-1 text-xs font-semibold text-ink/55">
                  {gap.stamp.region}
                </span>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={onOpenJournal} className="mt-3 gap-2">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Write story
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No journal gaps"
          description="Every mapped stamp currently has a journal story attached."
          compact
        />
      )}
    </div>
  );
}

function CountryListPanel({
  count,
  countries,
  emptyCopy,
  eyebrow,
  icon: Icon,
  title,
  variant,
}: {
  count: number;
  countries: FriendCountry[];
  emptyCopy: string;
  eyebrow: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
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
        className={`absolute inset-3 rounded-lg border ${
          isCenter ? 'border-dashed border-gold/34' : 'border-gold/10'
        }`}
        aria-hidden="true"
      />
      <div className="absolute -bottom-10 -right-8 h-28 w-28 rounded-full border border-gold/12" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
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
        <div className="mt-4 flex flex-wrap gap-2">
          {countries.slice(0, 8).map((country) => (
            <CountryPassportStamp key={country.id} country={country} featured={isCenter} />
          ))}
          {countries.length > 8 ? (
            <span className="rounded-md border border-dashed border-gold/28 bg-white/80 px-3 py-2 text-xs font-semibold text-ink/58">
              +{countries.length - 8} more
            </span>
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
      className={`relative inline-flex min-h-20 min-w-[96px] flex-col justify-between overflow-hidden rounded-md border px-3 py-2 text-left ${
        featured
          ? 'border-gold/48 bg-[#F8F1E4] text-ink shadow-[0_8px_18px_rgba(61,43,14,0.12)]'
          : 'border-gold/30 bg-white/80 text-ink/76 shadow-sm'
      }`}
    >
      <span className="absolute inset-1 rounded border border-dashed border-current/24" aria-hidden="true" />
      <span className="absolute -right-5 -top-5 h-16 w-16 rounded-full border border-current/14" aria-hidden="true" />
      <span className="relative flex items-center justify-between gap-3">
        <span className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-current/56">Passport</span>
        <span className="text-base leading-none" aria-hidden="true">TJ</span>
      </span>
      <span className="relative mt-2 flex items-end justify-between gap-3">
        <span className="text-3xl font-serif font-semibold leading-none">{countryCode}</span>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-current/40 text-[0.52rem] font-bold uppercase tracking-[0.08em]">
          Visited
        </span>
      </span>
      <span className="relative mt-2 flex items-center justify-between gap-3 border-t border-dashed border-current/20 pt-2 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-current/58">
        <span className="truncate">Travel archive</span>
        <span className="shrink-0">TJ</span>
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
