// Signed-in dashboard page.
// This page composes small summaries from map state, journal entries, and
// friends so users have a command center after login.
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Compass,
  GitCompare,
  MapPinned,
  PenLine,
  Sparkles,
  Stamp,
  Tags,
  UsersRound,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import AppPageSkeleton from '@/components/loading/PageSkeletons';
import { Button, Card } from '@/components/ui';
import { fetchFriends, updateFriendRequest } from '@/lib/friendService';
import { fetchJournalEntries } from '@/lib/journalService';
import { placeholderCountries } from '@/lib/placeholderData';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';
import { ATLAS_STAMP_COUNTRIES } from '@/data/stamps/atlasCountries';
import type { JournalEntry } from '@/types';
import type { FriendsResponse, Friendship } from '@/types/friends';

type DashboardJournalEntry = JournalEntry & {
  country_id?: string;
  created_at?: string;
  updated_at?: string;
};

type DashboardAction = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone: string;
};

const countryNameLookup = new Map(placeholderCountries.map((country) => [country.id, country.name]));
const atlasCountryLookup = new Map(ATLAS_STAMP_COUNTRIES.map((country) => [country.atlas_id, country]));
const emptyFriends: FriendsResponse = {
  friends: [],
  incoming: [],
  outgoing: [],
  blocked: [],
};

// Dashboard entries may include both normalized and database field names, so
// these helpers keep rendering logic tolerant of either shape.
const getEntryDate = (entry: DashboardJournalEntry) => entry.createdAt || entry.created_at || new Date().toISOString();
const getEntryCountry = (entry: DashboardJournalEntry) => entry.countryId || entry.country_id || '';
const getFriendLabel = (friendship: Friendship) =>
  friendship.profile.displayName || friendship.profile.email || 'Travel friend';

// Formats timestamps defensively because dashboard cards should not crash on
// missing or invalid dates.
const formatDate = (value?: string) => {
  if (!value) {
    return 'No date yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date pending';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

// Resolves country ids from local placeholder data first, then atlas data, then
// falls back to the raw id.
const formatCountryName = (countryId: string) => countryNameLookup.get(countryId) || atlasCountryLookup.get(countryId)?.name || countryId || 'Unplaced';
// Creates compact visual labels for country badges.
const getCountryInitials = (countryName: string) => {
  const words = countryName.match(/[A-Za-z]+/g) ?? [];

  if (words.length > 1) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  return countryName.slice(0, 2).toUpperCase();
};

// Builds a small badge label for visited-country summaries.
const formatCountryBadge = (countryId: string) => {
  const atlasCountry = atlasCountryLookup.get(countryId);
  const alphaAlias = atlasCountry?.aliases?.find((alias) => /^[A-Z]{2,3}$/.test(alias));

  return alphaAlias || (atlasCountry ? getCountryInitials(atlasCountry.name) : countryId);
};

// Loads dashboard data after auth is ready and redirects anonymous users away
// from this protected page.
export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const visitedCountries = useMapStore((state) => state.visitedCountries);
  const scratchPercentage = useMapStore((state) => state.scratchPercentage);
  const countryLabels = useMapStore((state) => state.countryLabels);
  const countryCities = useMapStore((state) => state.countryCities);
  const lastMapUpdated = useMapStore((state) => state.lastUpdated);
  const router = useRouter();
  const [journalEntries, setJournalEntries] = useState<DashboardJournalEntry[]>([]);
  const [friendsData, setFriendsData] = useState<FriendsResponse>(emptyFriends);
  const [acceptingFriendshipId, setAcceptingFriendshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Protected client pages use the auth store populated by AuthProvider.
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!user) {
      return;
    }

    // Journal and friend summaries are fetched on the client because this page
    // is an interactive dashboard that depends on the signed-in session.
    const loadJournal = async () => {
      setLoading(true);
      const response = await fetchJournalEntries();
      setLoading(false);
      if (response.success && response.data) {
        setJournalEntries(response.data as DashboardJournalEntry[]);
      }
    };

    const loadFriends = async () => {
      const response = await fetchFriends();
      if (response.success && response.data) {
        setFriendsData(response.data);
      }
    };

    loadJournal();
    loadFriends();
  }, [router, user, isLoading]);

  // Derived dashboard stats are memoized so rendering can reuse the same
  // calculations until journal/city data changes.
  const dashboardStats = useMemo(() => {
    const journalCountries = new Set(journalEntries.map(getEntryCountry).filter(Boolean));
    const allTags = journalEntries.flatMap((entry) => entry.tags ?? []);
    const uniqueTags = [...new Set(allTags)];
    const tagCounts = allTags.reduce<Record<string, number>>((acc, tag) => {
      acc[tag] = (acc[tag] ?? 0) + 1;
      return acc;
    }, {});
    const topTags = Object.entries(tagCounts)
      .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
      .slice(0, 5)
      .map(([tag]) => tag);
    const cityCount = Object.values(countryCities ?? {}).reduce((total, cities) => total + cities.length, 0);
    const sortedEntries = [...journalEntries].sort(
      (first, second) => new Date(getEntryDate(second)).getTime() - new Date(getEntryDate(first)).getTime()
    );
    const moodCounts = journalEntries.reduce<Record<string, number>>((acc, entry) => {
      if (entry.mood) {
        acc[entry.mood] = (acc[entry.mood] ?? 0) + 1;
      }
      return acc;
    }, {});
    const favoriteMood = Object.entries(moodCounts).sort(([, firstCount], [, secondCount]) => secondCount - firstCount)[0]?.[0];

    return {
      cityCount,
      favoriteMood,
      journalCountries: journalCountries.size,
      latestEntry: sortedEntries[0],
      recentEntries: sortedEntries.slice(0, 3),
      topTags,
      uniqueTags: uniqueTags.length,
    };
  }, [countryCities, journalEntries]);

  // Shows the most recently added visited countries as quick visual context.
  const visitedCountryCards = useMemo(
    () =>
      visitedCountries
        .slice(-5)
        .reverse()
        .map((countryId) => ({
          id: countryId,
          label: countryLabels[countryId] || formatCountryName(countryId),
          badge: formatCountryBadge(countryId),
          cityCount: countryCities[countryId]?.length ?? 0,
        })),
    [countryCities, countryLabels, visitedCountries]
  );

  const revealProgress = Math.max(0, Math.min(100, Math.round(scratchPercentage)));
  const archiveScore = visitedCountries.length + journalEntries.length + dashboardStats.cityCount;
  const dashboardDisplayName = user?.displayName?.trim();
  const profileCardName = dashboardDisplayName || user?.email || 'Add your name';
  const profileName = dashboardDisplayName || user?.email || 'Traveler';
  const nextRevealMilestone = Math.min(100, Math.max(10, Math.ceil((revealProgress + 1) / 10) * 10));
  const friendCount = friendsData.friends.length;
  const totalPendingFriends = friendsData.incoming.length + friendsData.outgoing.length;
  const pendingApprovals = friendsData.incoming.slice(0, 2);

  // Reloads friendship groups after accepting a request.
  const refreshFriends = async () => {
    const response = await fetchFriends();
    if (response.success && response.data) {
      setFriendsData(response.data);
    }
  };

  // Accepts a pending friend request and then refreshes the dashboard summary.
  const acceptFriendRequest = async (friendshipId: string) => {
    setAcceptingFriendshipId(friendshipId);
    const response = await updateFriendRequest(friendshipId, 'accept');
    setAcceptingFriendshipId(null);

    if (response.success) {
      await refreshFriends();
    }
  };

  const nextActions: DashboardAction[] = [
    {
      title: journalEntries.length > 0 ? 'Write another memory' : 'Start your first entry',
      description: 'Capture the moment while the details are still warm.',
      href: '/journal',
      icon: PenLine,
      tone: 'bg-[#EAF0F6] text-[#27516F] border-[#AFC5D6]',
    },
    {
      title: visitedCountries.length > 0 ? 'Refine the atlas' : 'Mark your first country',
      description: 'Add countries, labels, colors, and city pins.',
      href: '/map',
      icon: MapPinned,
      tone: 'bg-[#E8F1EA] text-[#315F43] border-[#A7C6AD]',
    },
    {
      title: 'Travel Circle',
      description: 'Invite friends and manage shared journal access.',
      href: '/friends',
      icon: UsersRound,
      tone: 'bg-[#F3E6D8] text-[#71481F] border-[#D9B98C]',
    },
    {
      title: 'Travel Audit',
      description: 'Check map coverage, passport stamps, and locked goals.',
      href: '/compare',
      icon: GitCompare,
      tone: 'bg-[#F8E6D8] text-[#884E29] border-[#DEB595]',
    },
    {
      title: 'Ask for a story thread',
      description: 'Turn scattered memories into a stronger draft.',
      href: '/companion',
      icon: Sparkles,
      tone: 'bg-[#F6E8EE] text-[#7A3E59] border-[#D9B0C1]',
    },
  ];

  if (isLoading || !user) {
    return <AppPageSkeleton variant="dashboard" />;
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Dashboard"
        description="Your travel archive at a glance: map progress, journal momentum, and the next useful thing to do."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push('/journal')} className="gap-2">
              <PenLine className="h-4 w-4" aria-hidden="true" />
              New entry
            </Button>
            <Button variant="secondary" onClick={() => router.push('/map')} className="gap-2">
              <MapPinned className="h-4 w-4" aria-hidden="true" />
              Update map
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
            <Card className="overflow-hidden border-gold/30 bg-[#fff8ea] p-0" variant="elevated">
              <div className="grid min-h-[320px] gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex flex-col justify-between gap-8 p-6 sm:p-8">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                      <Compass className="h-4 w-4" aria-hidden="true" />
                      Travel command center
                    </div>
                    <h2 className="mt-5 max-w-3xl text-4xl font-serif font-semibold leading-tight text-ink sm:text-5xl">
                      Welcome back, {profileName}.
                    </h2>
                    <p className="mt-4 max-w-2xl text-lg leading-7 text-ink/72">
                      You have {visitedCountries.length} mapped countr{visitedCountries.length === 1 ? 'y' : 'ies'},{' '}
                      {journalEntries.length} journal entr{journalEntries.length === 1 ? 'y' : 'ies'}, and{' '}
                      {dashboardStats.cityCount} saved city pin{dashboardStats.cityCount === 1 ? '' : 's'}.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-gold/20 bg-white/72 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">Archive score</p>
                      <p className="mt-2 text-3xl font-semibold text-ink">{archiveScore}</p>
                    </div>
                    <div className="rounded-lg border border-gold/20 bg-white/72 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">Last story</p>
                      <p className="mt-2 text-lg font-semibold text-ink">
                        {dashboardStats.latestEntry ? formatDate(getEntryDate(dashboardStats.latestEntry)) : 'Not started'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gold/20 bg-white/72 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">Map updated</p>
                      <p className="mt-2 text-lg font-semibold text-ink">{formatDate(lastMapUpdated)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-3">
                    <div className="rounded-lg border border-gold/18 bg-white/58 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        Journal momentum
                      </div>
                      <p className="mt-3 text-sm leading-6 text-ink/68">
                        {dashboardStats.latestEntry
                          ? `Last saved story: ${dashboardStats.latestEntry.title}.`
                          : 'Start with one place, one moment, and one detail you want to keep.'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gold/18 bg-white/58 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                        <Tags className="h-4 w-4" aria-hidden="true" />
                        Top tags
                      </div>
                      {dashboardStats.topTags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {dashboardStats.topTags.slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full border border-gold/20 bg-cream/65 px-2.5 py-1 text-xs font-semibold text-ink/65">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-ink/68">Tags will appear here as your journal grows.</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-gold/18 bg-white/58 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                        <UsersRound className="h-4 w-4" aria-hidden="true" />
                        Pending approvals
                      </div>
                      <div className="mt-3 flex items-end gap-3">
                        <p className="text-3xl font-semibold text-ink">{friendsData.incoming.length}</p>
                        <p className="pb-1 text-sm text-ink/62">
                          request{friendsData.incoming.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink/68">
                        {friendsData.incoming.length > 0
                          ? 'Approve travelers waiting to join your circle.'
                          : totalPendingFriends > 0
                            ? `${friendsData.outgoing.length} sent invite${friendsData.outgoing.length === 1 ? '' : 's'} waiting.`
                            : 'No approvals waiting right now.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gold/18 bg-white/62 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">Friend requests</p>
                        <p className="mt-1 text-sm leading-6 text-ink/68">
                          {pendingApprovals.length > 0
                            ? 'Review pending approvals without leaving the dashboard.'
                            : 'Open Friends to invite someone or manage your travel circle.'}
                        </p>
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={() => router.push('/friends')} className="gap-2 self-start sm:self-auto">
                        View all
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>

                    {pendingApprovals.length > 0 ? (
                      <div className="mt-3 grid gap-2">
                        {pendingApprovals.map((friendship) => (
                          <div
                            key={friendship.id}
                            className="flex flex-col gap-3 rounded-lg border border-gold/16 bg-cream/45 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">{getFriendLabel(friendship)}</p>
                              <p className="truncate text-xs text-ink/58">{friendship.profile.email}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => acceptFriendRequest(friendship.id)}
                              disabled={acceptingFriendshipId === friendship.id}
                              className="self-start sm:self-auto"
                            >
                              {acceptingFriendshipId === friendship.id ? 'Accepting' : 'Accept'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-gold/20 bg-[#1F3328] p-6 text-cream lg:border-l lg:border-t-0">
                  <div className="flex h-full flex-col justify-between gap-8">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cream/64">Atlas reveal</p>
                      <p className="mt-3 text-6xl font-serif font-semibold">{revealProgress}%</p>
                      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/18">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${revealProgress}%` }} />
                      </div>
                      <p className="mt-4 text-sm leading-6 text-cream/74">
                        {visitedCountries.length > 0
                          ? `${visitedCountries.length} country stamps are anchoring the map.`
                          : 'Your atlas is ready for its first marked country.'}
                      </p>
                      <div className="mt-6 grid gap-3 text-sm">
                        <div className="rounded-lg border border-white/12 bg-white/8 p-3">
                          <p className="text-cream/56">Mapped countries</p>
                          <p className="mt-1 text-2xl font-semibold">{visitedCountries.length}</p>
                        </div>
                        <div className="rounded-lg border border-white/12 bg-white/8 p-3">
                          <p className="text-cream/56">Next reveal mark</p>
                          <p className="mt-1 text-2xl font-semibold">
                            {revealProgress >= 100 ? 'Complete' : `${nextRevealMilestone}%`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => router.push('/passport')}
                      className="w-full gap-2 border-gold bg-cream text-ink hover:bg-gold hover:text-ink hover:shadow-md-soft"
                    >
                      <Stamp className="h-4 w-4" aria-hidden="true" />
                      View passport
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col justify-between gap-5 bg-white/88">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Next best moves</p>
                <h2 className="mt-2 text-2xl font-serif font-semibold text-ink">Keep the archive moving</h2>
              </div>
              <div className="space-y-3">
                {nextActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.href}
                      type="button"
                      onClick={() => router.push(action.href)}
                      className="group flex w-full items-center gap-3 rounded-lg border border-gold/18 bg-cream/42 p-3 text-left transition hover:border-gold/45 hover:bg-cream"
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${action.tone}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{action.title}</span>
                        <span className="mt-0.5 block text-sm leading-5 text-ink/62">{action.description}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-ink/45 transition group-hover:translate-x-1 group-hover:text-ink" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={UserRound}
              label="Profile"
              value={profileCardName}
              detail={dashboardDisplayName ? 'Display name' : 'Profile details'}
              tone="bg-[#F3E6D8] text-[#71481F]"
              onClick={() => router.push('/profile')}
            />
            <MetricCard
              icon={MapPinned}
              label="Map progress"
              value={String(visitedCountries.length)}
              detail="Visited countries"
              tone="bg-[#E8F1EA] text-[#315F43]"
              onClick={() => router.push('/map')}
            />
            <MetricCard
              icon={BookOpen}
              label="Journal count"
              value={loading ? '...' : String(journalEntries.length)}
              detail={`${dashboardStats.journalCountries} countr${dashboardStats.journalCountries === 1 ? 'y' : 'ies'} represented`}
              tone="bg-[#EAF0F6] text-[#27516F]"
              onClick={() => router.push('/journal')}
            />
            <MetricCard
              icon={UsersRound}
              label="Travel Circle"
              value={String(friendCount)}
              detail={`${friendCount === 1 ? 'friend' : 'friends'} in your circle`}
              tone="bg-[#F6E8EE] text-[#7A3E59]"
              onClick={() => router.push('/friends')}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <Card className="bg-white/90">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Recent journal</p>
                  <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Latest saved stories</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/journal')} className="gap-2 self-start sm:self-auto">
                  Open journal
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {dashboardStats.recentEntries.length > 0 ? (
                <div className="space-y-3">
                  {dashboardStats.recentEntries.map((entry) => (
                    <article key={entry.id} className="rounded-lg border border-gold/16 bg-cream/36 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-semibold text-ink">{entry.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/68">{entry.content}</p>
                        </div>
                        <time className="shrink-0 text-sm font-semibold text-ink/55" dateTime={getEntryDate(entry)}>
                          {formatDate(getEntryDate(entry))}
                        </time>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink/62">
                        <span className="rounded-full border border-gold/20 bg-white px-2.5 py-1">
                          {formatCountryName(getEntryCountry(entry))}
                        </span>
                        {entry.mood ? (
                          <span className="rounded-full border border-gold/20 bg-white px-2.5 py-1">{entry.mood}</span>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gold/30 bg-cream/40 p-6 text-ink/65">
                  <p className="font-semibold text-ink">No journal entries yet.</p>
                  <p className="mt-2 text-sm leading-6">Start with one place, one moment, and one detail you do not want to lose.</p>
                </div>
              )}
            </Card>

            <div className="space-y-6">
              <Card className="bg-[#F8F1E4]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Visited list</p>
                    <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Recent map marks</h2>
                  </div>
                  <MapPinned className="h-6 w-6 text-gold-deep" aria-hidden="true" />
                </div>
                {visitedCountryCards.length > 0 ? (
                  <div className="space-y-2">
                    {visitedCountryCards.map((country) => (
                      <div key={country.id} className="flex items-center justify-between gap-3 rounded-lg border border-gold/16 bg-white/70 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{country.label}</p>
                          <p className="text-sm text-ink/58">
                            {country.cityCount} city pin{country.cityCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-ink/58">{country.badge}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-gold/30 bg-white/60 p-4 text-sm leading-6 text-ink/62">
                    Your first visited country will appear here.
                  </p>
                )}
              </Card>

              <Card className="bg-white/90">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Travel rhythm</p>
                    <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Story texture</h2>
                  </div>
                  <Tags className="h-6 w-6 text-gold-deep" aria-hidden="true" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-lg border border-gold/16 bg-cream/36 p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink/52">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      Mood
                    </p>
                    <p className="mt-2 text-xl font-semibold capitalize text-ink">{dashboardStats.favoriteMood ?? 'Unwritten'}</p>
                  </div>
                  <div className="rounded-lg border border-gold/16 bg-cream/36 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/52">Tags</p>
                    {dashboardStats.topTags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {dashboardStats.topTags.map((tag) => (
                          <span key={tag} className="rounded-full border border-gold/22 bg-white px-2.5 py-1 text-sm font-semibold text-ink/68">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-ink/62">Tags from saved entries will collect here.</p>
                    )}
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
                      {dashboardStats.uniqueTags} unique tag{dashboardStats.uniqueTags === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        </div>
      </PageShell>
    </div>
  );
}

// Reusable metric tile for dashboard stats.
function MetricCard({
  detail,
  icon: Icon,
  label,
  onClick,
  tone,
  value,
}: {
  detail: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
  tone: string;
  value: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-3xl border border-gold/20 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-gold/45 hover:shadow-md-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <ArrowRight className="h-4 w-4 text-ink/40 transition group-hover:translate-x-1 group-hover:text-ink" aria-hidden="true" />
      </div>
      <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-ink/52">{label}</p>
      <p className="mt-2 truncate text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 truncate text-sm text-ink/62">{detail}</p>
    </button>
  );
}
