// Travel Audit page.
// Compares countries marked on the map with passport stamp metadata and
// country-only friend overlap.
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Compass,
  LockKeyhole,
  MapPinned,
  Stamp,
  TicketCheck,
  UsersRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import AppPageSkeleton from '@/components/loading/PageSkeletons';
import StampRenderer from '@/components/stamps/StampRenderer';
import { Button, Card } from '@/components/ui';
import { ATLAS_STAMP_COUNTRIES } from '@/data/stamps/atlasCountries';
import { fetchFriendCountrySnapshots } from '@/lib/friendService';
import { fetchJournalEntries } from '@/lib/journalService';
import { findCountryStamp } from '@/lib/stamps/matching';
import { comparePassportStampsToMap } from '@/lib/stamps/passportMapComparison';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';
import type { JournalEntry } from '@/types';
import type { FriendCountry, FriendCountrySnapshot } from '@/types/friends';
import type { CountryStamp } from '@/types/stamps';

const atlasCountryLookup = new Map<string, string>();

ATLAS_STAMP_COUNTRIES.forEach((country) => {
  atlasCountryLookup.set(country.atlas_id.toLowerCase(), country.name);
  country.aliases?.forEach((alias) => atlasCountryLookup.set(alias.toLowerCase(), country.name));
});

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

  return {
    sharedCountries: yourCountries.filter((country) => friendCountryMap.has(country.id)),
    onlyYouCountries: yourCountries.filter((country) => !friendCountryMap.has(country.id)),
    onlyFriendCountries: friendCountries.filter((country) => !yourCountryMap.has(country.id)),
  };
};

type RegionBreakdownItem = {
  region: string;
  unlocked: number;
  total: number;
  percent: number;
};

type JournalGap = {
  countryId: string;
  countryName: string;
  stamp: CountryStamp;
};

type JournalEntryWithCountryColumn = JournalEntry & {
  country_id?: string | null;
};

const getJournalEntryCountryId = (entry: JournalEntryWithCountryColumn) => entry.countryId || entry.country_id || '';

const buildRegionBreakdown = (comparison: ReturnType<typeof comparePassportStampsToMap>) => {
  const regions = new Map<string, { total: number; unlocked: number }>();

  [...comparison.matched.map((match) => match.stamp), ...comparison.stampsNotOnMap].forEach((stamp) => {
    const currentRegion = regions.get(stamp.region) ?? { total: 0, unlocked: 0 };
    regions.set(stamp.region, {
      ...currentRegion,
      total: currentRegion.total + 1,
      unlocked: currentRegion.unlocked + (comparison.unlockedStampIds.includes(stamp.id) ? 1 : 0),
    });
  });

  const regionBreakdown = Array.from(regions.entries()).map<RegionBreakdownItem>(([region, counts]) => ({
    region,
    unlocked: counts.unlocked,
    total: counts.total,
    percent: counts.total === 0 ? 0 : Math.round((counts.unlocked / counts.total) * 100),
  }));

  const strongest = [...regionBreakdown]
    .filter((region) => region.unlocked > 0)
    .sort((first, second) => second.unlocked - first.unlocked || second.percent - first.percent)
    .slice(0, 4);
  const strongestRegionNames = new Set(strongest.map((region) => region.region));

  return {
    strongest,
    weakest: [...regionBreakdown]
      .filter((region) => !strongestRegionNames.has(region.region))
      .sort((first, second) => first.unlocked - second.unlocked || first.percent - second.percent)
      .slice(0, 4),
  };
};

const buildTravelMomentum = (comparison: ReturnType<typeof comparePassportStampsToMap>) => {
  const unlockedCount = comparison.unlockedStampIds.length;
  const stampTotal = unlockedCount + comparison.stampsNotOnMap.length;
  const nextMilestone = comparison.passportCompletionPercent >= 100
    ? 100
    : Math.min(100, Math.ceil((comparison.passportCompletionPercent + 1) / 10) * 10);
  const stampsNeededForMilestone =
    comparison.passportCompletionPercent >= 100
      ? 0
      : Math.max(1, Math.ceil((stampTotal * nextMilestone) / 100) - unlockedCount);

  return {
    currentCompletion: comparison.passportCompletionPercent,
    recentMatches: comparison.matched.slice(-5).reverse(),
    nextMilestone,
    stampsNeededForMilestone,
  };
};

const buildJournalGaps = (
  comparison: ReturnType<typeof comparePassportStampsToMap>,
  journalEntries: JournalEntryWithCountryColumn[],
  countryLabels: Record<string, string>
): JournalGap[] => {
  const journalStampIds = new Set<string>();

  journalEntries.forEach((entry) => {
    const countryId = getJournalEntryCountryId(entry).trim();
    if (!countryId) return;

    const stamp = findCountryStamp(countryId, countryLabels[countryId] || countryId);
    if (stamp) {
      journalStampIds.add(stamp.id);
    }
  });

  return comparison.matched
    .filter((match) => !journalStampIds.has(match.stamp.id))
    .map((match) => ({
      countryId: match.countryId,
      countryName: match.countryName,
      stamp: match.stamp,
    }))
    .slice(0, 6);
};

const countStampedCountriesWithStories = (
  comparison: ReturnType<typeof comparePassportStampsToMap>,
  journalEntries: JournalEntryWithCountryColumn[],
  countryLabels: Record<string, string>
) => {
  const matchedStampIds = new Set(comparison.matched.map((match) => match.stamp.id));
  const journalStampIds = new Set<string>();

  journalEntries.forEach((entry) => {
    const countryId = getJournalEntryCountryId(entry).trim();
    if (!countryId) return;

    const stamp = findCountryStamp(countryId, countryLabels[countryId] || countryId);
    if (stamp && matchedStampIds.has(stamp.id)) {
      journalStampIds.add(stamp.id);
    }
  });

  return journalStampIds.size;
};

// Protected page that derives all audit data from existing map and stamp systems.
export default function ComparePage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const visitedCountries = useMapStore((state) => state.visitedCountries);
  const countryLabels = useMapStore((state) => state.countryLabels);
  const countryCities = useMapStore((state) => state.countryCities);
  const router = useRouter();
  const [friendSnapshots, setFriendSnapshots] = useState<FriendCountrySnapshot[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [isFriendCompareLoading, setIsFriendCompareLoading] = useState(false);
  const [friendCompareError, setFriendCompareError] = useState<string | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isJournalGapsLoading, setIsJournalGapsLoading] = useState(false);
  const [journalGapsError, setJournalGapsError] = useState<string | null>(null);

  useEffect(() => {
    // Client-side guard mirrors the pattern used by other authenticated pages.
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [router, user, isLoading]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadFriendCountries = async () => {
      setIsFriendCompareLoading(true);
      const response = await fetchFriendCountrySnapshots();

      if (!isMounted) return;

      setIsFriendCompareLoading(false);

      if (response.success && response.data) {
        setFriendSnapshots(response.data.friends);
        setSelectedFriendId((currentFriendId) =>
          currentFriendId && response.data?.friends.some((snapshot) => snapshot.friend.id === currentFriendId)
            ? currentFriendId
            : response.data?.friends[0]?.friend.id ?? null
        );
        setFriendCompareError(null);
      } else {
        setFriendSnapshots([]);
        setFriendCompareError(response.error || 'Unable to load Travel Circle comparisons.');
      }
    };

    void loadFriendCountries();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadJournalSummaries = async () => {
      setIsJournalGapsLoading(true);
      const response = await fetchJournalEntries({ limit: 200, summary: true });

      if (!isMounted) return;

      setIsJournalGapsLoading(false);

      if (response.success) {
        setJournalEntries(response.data ?? []);
        setJournalGapsError(null);
      } else {
        setJournalEntries([]);
        setJournalGapsError(response.error || 'Unable to load journal coverage.');
      }
    };

    void loadJournalSummaries();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // The comparison helper centralizes country/stamp matching so this page stays
  // presentational.
  const comparison = useMemo(
    () => comparePassportStampsToMap({ countryLabels, visitedCountries }),
    [countryLabels, visitedCountries]
  );

  // City pins are stored in the map store by country, so the audit totals them
  // across all countries.
  const cityPinCount = useMemo(
    () => Object.values(countryCities ?? {}).reduce((total, cities) => total + cities.length, 0),
    [countryCities]
  );
  const yourCompareCountries = useMemo(
    () => buildCountryList(visitedCountries, countryLabels),
    [countryLabels, visitedCountries]
  );
  const selectedFriendSnapshot = useMemo(
    () =>
      friendSnapshots.find((snapshot) => snapshot.friend.id === selectedFriendId) ??
      friendSnapshots[0] ??
      null,
    [friendSnapshots, selectedFriendId]
  );
  const friendComparison = useMemo(() => {
    if (!selectedFriendSnapshot) return null;

    return compareCountryLists(yourCompareCountries, selectedFriendSnapshot.visitedCountries);
  }, [selectedFriendSnapshot, yourCompareCountries]);
  const regionBreakdown = useMemo(() => buildRegionBreakdown(comparison), [comparison]);
  const travelMomentum = useMemo(() => buildTravelMomentum(comparison), [comparison]);
  const journalGaps = useMemo(
    () => buildJournalGaps(comparison, journalEntries, countryLabels),
    [comparison, countryLabels, journalEntries]
  );
  const stampedCountriesWithStories = useMemo(
    () => countStampedCountriesWithStories(comparison, journalEntries, countryLabels),
    [comparison, countryLabels, journalEntries]
  );
  const strongestRegion = regionBreakdown.strongest[0]?.region ?? null;
  const mapCoveragePercent = Math.round((comparison.mapCountryCount / ATLAS_STAMP_COUNTRIES.length) * 100);
  const journalCoveragePercent =
    comparison.matched.length === 0 ? 0 : Math.round((stampedCountriesWithStories / comparison.matched.length) * 100);
  if (isLoading || !user) {
    return <AppPageSkeleton variant="compare" />;
  }

  const lockedPreview = comparison.stampsNotOnMap.slice(0, 5);

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Travel Audit"
        description="Cross-check your scratch map, passport stamps, and the travel goals still waiting to be unlocked."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => router.push('/map')} className="gap-2">
              <MapPinned className="h-4 w-4" aria-hidden="true" />
              Map
            </Button>
            <Button onClick={() => router.push('/passport')} className="gap-2">
              <Stamp className="h-4 w-4" aria-hidden="true" />
              Passport
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card className="h-full overflow-hidden border-gold/30 bg-[#fff8ea] p-0" variant="elevated">
              <div className="grid h-full gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="p-6 sm:p-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                    <Compass className="h-4 w-4" aria-hidden="true" />
                    Map and passport audit
                  </div>
                  <h2 className="mt-5 max-w-3xl text-4xl font-serif font-semibold leading-tight text-ink sm:text-5xl">
                    Your map is turning into a stamped travel archive.
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-7 text-ink/72">
                    You have {comparison.mapCountryCount} countr{comparison.mapCountryCount === 1 ? 'y' : 'ies'} on the map,{' '}
                    {comparison.unlockedStampIds.length} matched passport stamp
                    {comparison.unlockedStampIds.length === 1 ? '' : 's'}, and {cityPinCount} saved city pin
                    {cityPinCount === 1 ? '' : 's'}.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <AuditSnapshotTile
                      label="Map coverage"
                      value={`${comparison.mapCountryCount}/${ATLAS_STAMP_COUNTRIES.length}`}
                      detail={
                        strongestRegion
                          ? `${strongestRegion} is your strongest region.`
                          : `${mapCoveragePercent}% of stamp countries mapped.`
                      }
                    />
                    <AuditSnapshotTile
                      label="Journal coverage"
                      value={`${stampedCountriesWithStories}/${comparison.matched.length}`}
                      detail={
                        comparison.matched.length > 0
                          ? `${journalCoveragePercent}% of stamped countries have stories.`
                          : 'Scratch a country to start journal coverage.'
                      }
                    />
                  </div>
                </div>
                <div className="h-full border-t border-gold/20 bg-[#21382B] p-6 text-cream lg:border-l lg:border-t-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cream/64">Passport completion</p>
                  <p className="mt-3 text-6xl font-serif font-semibold">{comparison.passportCompletionPercent}%</p>
                  <p className="mt-4 text-sm leading-6 text-cream/74">
                    {comparison.stampsNotOnMap.length} passport stamp
                    {comparison.stampsNotOnMap.length === 1 ? '' : 's'} are still waiting for a mapped visit.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-white/90">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Next move</p>
                <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Tighten the archive</h2>
              </div>
              <div className="space-y-3">
                <ActionRow
                  icon={MapPinned}
                  title="Add missing map visits"
                  description="Open the map to scratch off more countries."
                  onClick={() => router.push('/map')}
                />
                <ActionRow
                  icon={Stamp}
                  title="Review passport folios"
                  description="Open collected and locked stamp books."
                  onClick={() => router.push('/passport')}
                />
                <ActionRow
                  icon={BookOpen}
                  title="Write the story"
                  description="Turn the matched stamp into a journal entry."
                  onClick={() => router.push('/journal')}
                />
                <ActionRow
                  icon={TicketCheck}
                  title="Open full archive"
                  description="Review your entries, shared stories, and comments."
                  onClick={() => router.push('/journal/entries')}
                />
              </div>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <RegionBreakdownCard breakdown={regionBreakdown} />
            <TravelMomentumCard momentum={travelMomentum} onOpenMap={() => router.push('/map')} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
            <Card className="bg-white/90">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Journal next ideas</p>
                  <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Stamped, not written</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/passport')} className="gap-2 self-start sm:self-auto">
                  Passport
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
                {journalGapsError ? (
                  <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{journalGapsError}</p>
                ) : isJournalGapsLoading ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {[0, 1, 2, 3].map((item) => (
                      <div key={item} className="h-28 animate-pulse rounded-lg bg-cream/60" />
                    ))}
                  </div>
                ) : journalGaps.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {journalGaps.map((gap) => (
                      <JournalGapCard key={`${gap.countryId}-${gap.stamp.id}`} gap={gap} onWriteStory={() => router.push('/journal')} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No journal gaps"
                    description="Every mapped stamp currently has a journal story attached."
                  />
                )}

                <div className="flex h-full flex-col rounded-lg border border-gold/16 bg-[#FFF8EA] p-3">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">Still locked</p>
                    <h3 className="mt-1 text-lg font-serif font-semibold text-ink">Stamp goals</h3>
                    <p className="mt-1 text-xs leading-5 text-ink/58">
                      Passport countries still waiting for a mapped visit.
                    </p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {lockedPreview.map((stamp) => (
                      <StampGoalRow
                        key={stamp.id}
                        stamp={stamp}
                        onClick={() => router.push(`/passport?stamp=${encodeURIComponent(stamp.id)}`)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <TravelCircleCompareCard
                comparison={friendComparison}
                error={friendCompareError}
                friendSnapshots={friendSnapshots}
                isLoading={isFriendCompareLoading}
                onOpenFriends={() => router.push('/friends')}
                onSelectFriend={setSelectedFriendId}
                selectedFriendId={selectedFriendSnapshot?.friend.id ?? null}
                yourCountryCount={yourCompareCountries.length}
              />

            </div>
          </section>
        </div>
      </PageShell>
    </div>
  );
}

function TravelCircleCompareCard({
  comparison,
  error,
  friendSnapshots,
  isLoading,
  onOpenFriends,
  onSelectFriend,
  selectedFriendId,
  yourCountryCount,
}: {
  comparison: ReturnType<typeof compareCountryLists> | null;
  error: string | null;
  friendSnapshots: FriendCountrySnapshot[];
  isLoading: boolean;
  onOpenFriends: () => void;
  onSelectFriend: (friendId: string) => void;
  selectedFriendId: string | null;
  yourCountryCount: number;
}) {
  const selectedSnapshot = friendSnapshots.find((snapshot) => snapshot.friend.id === selectedFriendId) ?? null;
  const selectedFriendName = selectedSnapshot?.friend.displayName || selectedSnapshot?.friend.email || 'your friend';
  const firstFriendOnlyCountry = comparison?.onlyFriendCountries[0];

  return (
    <Card className="bg-[#F8F1E4]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Travel Circle</p>
          <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Compare with friends</h2>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-gold-deep">
          <UsersRound className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-gold/18 bg-white/70 px-3 py-2 text-xs font-semibold leading-5 text-ink/64">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
        Country-level only. Journals, photos, cities, and timestamps stay private.
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-lg bg-white/70" />
          ))}
        </div>
      ) : friendSnapshots.length === 0 ? (
        <EmptyState
          title="No friends to compare yet"
          description="Add accepted friends to see country overlap on Travel Audit."
          compact
        />
      ) : yourCountryCount === 0 ? (
        <EmptyState title="Mark your first country" description="Your map needs a country before friend overlap can appear." compact />
      ) : comparison ? (
        <div className="space-y-4">
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
                      : 'border-gold/24 bg-white/70 text-ink/72 hover:border-gold/50 hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <FriendCompareStat label="Shared" value={comparison.sharedCountries.length} />
            <FriendCompareStat label="You can share" value={comparison.onlyYouCountries.length} />
            <FriendCompareStat label="Friend-only" value={comparison.onlyFriendCountries.length} />
          </div>

          <FriendCompareDonut
            friendOnlyCount={comparison.onlyFriendCountries.length}
            sharedCount={comparison.sharedCountries.length}
            youOnlyCount={comparison.onlyYouCountries.length}
          />

          <div className="rounded-lg border border-gold/16 bg-white/70 px-3 py-3">
            <p className="text-sm font-semibold text-ink">
              {firstFriendOnlyCountry
                ? `Ask ${selectedFriendName} about ${firstFriendOnlyCountry.name}.`
                : comparison.sharedCountries.length > 0
                  ? `You and ${selectedFriendName} already overlap on ${comparison.sharedCountries.length} countr${
                      comparison.sharedCountries.length === 1 ? 'y' : 'ies'
                    }, including ${comparison.sharedCountries[0].name}.`
                  : `You can recommend ${comparison.onlyYouCountries[0]?.name ?? 'a mapped country'} to ${selectedFriendName}.`}
            </p>
            <p className="mt-1 text-sm leading-6 text-ink/62">
              Friend-only counts places they have mapped that are not on your map yet.
            </p>
          </div>
        </div>
      ) : null}

      <Button type="button" variant="ghost" size="sm" onClick={onOpenFriends} className="mt-4 gap-2">
        Manage friends
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </Card>
  );
}

function RegionBreakdownCard({ breakdown }: { breakdown: ReturnType<typeof buildRegionBreakdown> }) {
  return (
    <Card className="bg-white/90">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Region breakdown</p>
          <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Strongest stamp regions</h2>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F1EA] text-[#315F43]">
          <BarChart3 className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/46">Strongest</p>
          {breakdown.strongest.length > 0 ? (
            breakdown.strongest.map((region) => <RegionBreakdownRow key={region.region} region={region} />)
          ) : (
            <p className="rounded-lg border border-dashed border-gold/24 bg-cream/35 px-3 py-3 text-sm text-ink/62">
              Add a mapped country to start region totals.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/46">Needs more visits</p>
          {breakdown.weakest.map((region) => (
            <RegionBreakdownRow key={region.region} region={region} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function RegionBreakdownRow({ region }: { region: RegionBreakdownItem }) {
  return (
    <div className="rounded-lg border border-gold/16 bg-cream/36 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold text-ink">{region.region}</p>
        <p className="shrink-0 text-xs font-semibold text-ink/56">
          {region.unlocked}/{region.total}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(8, region.percent)}%` }} />
      </div>
    </div>
  );
}

function TravelMomentumCard({
  momentum,
  onOpenMap,
}: {
  momentum: ReturnType<typeof buildTravelMomentum>;
  onOpenMap: () => void;
}) {
  const milestoneCopy =
    momentum.stampsNeededForMilestone === 0
      ? 'Passport completion is fully unlocked from your map.'
      : `${momentum.stampsNeededForMilestone} more mapped stamp${momentum.stampsNeededForMilestone === 1 ? '' : 's'} to reach ${momentum.nextMilestone}% passport completion.`;
  const milestoneProgress =
    momentum.nextMilestone === 0
      ? 100
      : Math.min(100, Math.round((momentum.currentCompletion / momentum.nextMilestone) * 100));

  return (
    <Card className="bg-[#FFF8EA]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Travel momentum</p>
          <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Recent map progress</h2>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF0F6] text-[#27516F]">
          <MapPinned className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="rounded-lg border border-gold/18 bg-white/70 px-4 py-3">
        <p className="text-sm font-semibold leading-5 text-ink">{milestoneCopy}</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-cream">
          <div className="h-full rounded-full bg-[#315F43]" style={{ width: `${milestoneProgress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs font-semibold text-ink/50">
          <span>{momentum.currentCompletion}% now</span>
          <span>{momentum.nextMilestone}% goal</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/46">Newest stamped countries</p>
        {momentum.recentMatches.length > 0 ? (
          momentum.recentMatches.map((match) => (
            <button
              key={`${match.countryId}-${match.stamp.id}`}
              type="button"
              onClick={onOpenMap}
              className="group flex w-full items-center justify-between gap-3 rounded-lg border border-gold/16 bg-white/70 px-3 py-2 text-left transition hover:border-gold/45 hover:bg-white"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{match.countryName}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink/45 transition group-hover:translate-x-1 group-hover:text-ink" aria-hidden="true" />
            </button>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-gold/24 bg-white/60 px-3 py-3 text-sm text-ink/62">
            Scratch a country on the map to start momentum.
          </p>
        )}
      </div>
    </Card>
  );
}

function FriendCompareStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gold/16 bg-white/72 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/46">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function FriendCompareDonut({
  friendOnlyCount,
  sharedCount,
  youOnlyCount,
}: {
  friendOnlyCount: number;
  sharedCount: number;
  youOnlyCount: number;
}) {
  const segments = [
    { label: 'Shared', value: sharedCount, color: '#315F43' },
    { label: 'You can share', value: youOnlyCount, color: '#C9A96A' },
    { label: 'Friend-only', value: friendOnlyCount, color: '#7FA6C5' },
  ];
  const total = Math.max(1, segments.reduce((sum, segment) => sum + segment.value, 0));
  let runningPercent = 0;
  const donutStops = segments
    .map((segment) => {
      const start = runningPercent;
      const end = runningPercent + (segment.value / total) * 100;
      runningPercent = end;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="rounded-lg border border-gold/16 bg-white/70 p-3">
      <div className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
        <div
          aria-label={`Friend comparison donut: ${sharedCount} shared, ${youOnlyCount} you can share, ${friendOnlyCount} friend-only.`}
          className="grid h-28 w-28 place-items-center rounded-full"
          style={{ background: `conic-gradient(${donutStops})` }}
          title={`${sharedCount} shared, ${youOnlyCount} you can share, ${friendOnlyCount} friend-only`}
        >
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#F8F1E4] text-center">
            <div>
              <span className="block text-lg font-semibold leading-none text-ink">{sharedCount + youOnlyCount + friendOnlyCount}</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/48">total</span>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/46">Country split</p>
          <p className="mt-1 text-sm font-semibold text-ink">How your maps overlap</p>
          <FriendCompareLegend segments={segments} total={total} />
        </div>
      </div>
    </div>
  );
}

function FriendCompareLegend({
  segments,
  total,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  total: number;
}) {
  return (
    <div className="mt-3 space-y-2">
      {segments.map((segment) => (
        <div
          key={segment.label}
          className="grid grid-cols-[minmax(0,1fr)_2.5rem_3rem] items-center gap-2 rounded-md bg-white/52 px-2 py-1.5 text-xs text-ink/62"
          title={`${segment.label}: ${segment.value}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
            <span className="truncate font-semibold">{segment.label}</span>
          </span>
          <span className="text-right font-semibold tabular-nums text-ink/72">{segment.value}</span>
          <span className="text-right font-semibold tabular-nums text-ink/54">{Math.round((segment.value / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

function AuditSnapshotTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gold/18 bg-white/72 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">{label}</p>
      <p className="mt-2 text-2xl font-serif font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm leading-5 text-ink/62">{detail}</p>
    </div>
  );
}

// Reusable call-to-action row for follow-up audit steps.
function ActionRow({
  description,
  icon: Icon,
  onClick,
  title,
}: {
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg border border-gold/18 bg-cream/42 p-3 text-left transition hover:border-gold/45 hover:bg-cream"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#AFC5D6] bg-[#EAF0F6] text-[#27516F]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-ink/62">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-ink/45 transition group-hover:translate-x-1 group-hover:text-ink" aria-hidden="true" />
    </button>
  );
}

// Row for a locked stamp goal the user can inspect in the passport.
function StampGoalRow({ onClick, stamp }: { onClick: () => void; stamp: CountryStamp }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-gold/16 bg-cream/36 px-3 py-2 text-left transition hover:border-gold/45 hover:bg-cream"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{stamp.country_name}</span>
        <span className="block truncate text-xs text-ink/58">{stamp.region}</span>
      </span>
      <TicketCheck className="h-4 w-4 shrink-0 text-gold-deep transition group-hover:scale-110" aria-hidden="true" />
    </button>
  );
}

function JournalGapCard({ gap, onWriteStory }: { gap: JournalGap; onWriteStory: () => void }) {
  return (
    <div className="flex min-h-40 flex-col rounded-lg border border-gold/16 bg-cream/36 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-serif font-semibold text-ink">{gap.countryName}</p>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-white/58 px-2 py-1.5 text-xs">
            <span className="truncate font-semibold uppercase tracking-[0.12em] text-ink/44">Missing story</span>
            <span className="shrink-0 font-semibold text-ink/62">{gap.stamp.region}</span>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-gold/20 bg-white px-2 py-1 text-xs font-semibold text-gold-deep">
          Stamp ready
        </span>
      </div>

      <div className="mt-3 flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-gold/12 bg-white/52 py-3">
        <span aria-label={`${gap.countryName} passport stamp`} className="block h-[150px] w-[130px] overflow-hidden rounded-lg shadow-sm">
          <span className="block origin-top-left scale-[0.68]">
            <StampRenderer stamp={gap.stamp} />
          </span>
        </span>
      </div>

      <Button type="button" size="sm" variant="ghost" onClick={onWriteStory} className="mt-3 w-full justify-center gap-2">
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        Write story
      </Button>
    </div>
  );
}

// Shared empty-state block for audit sections with no items.
function EmptyState({
  compact = false,
  description,
  title,
}: {
  compact?: boolean;
  description: string;
  title: string;
}) {
  return (
    <div className={`rounded-lg border border-dashed border-gold/30 bg-white/60 ${compact ? 'p-4' : 'p-6'} text-ink/65`}>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6">{description}</p>
    </div>
  );
}
