// Travel Audit page.
// Compares countries marked on the map with passport stamp metadata to show
// coverage, missing matches, and still-locked stamp goals.
'use client';

import React, { useEffect, useMemo } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Compass,
  MapPinned,
  Plane,
  Search,
  Stamp,
  TicketCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import { Button, Card } from '@/components/ui';
import { comparePassportStampsToMap } from '@/lib/stamps/passportMapComparison';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';
import type { CountryStamp } from '@/types/stamps';

const previewLimit = 8;

// Protected page that derives all audit data from existing map and stamp systems.
export default function ComparePage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const visitedCountries = useMapStore((state) => state.visitedCountries);
  const countryLabels = useMapStore((state) => state.countryLabels);
  const countryCities = useMapStore((state) => state.countryCities);
  const router = useRouter();

  useEffect(() => {
    // Client-side guard mirrors the pattern used by other authenticated pages.
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [router, user, isLoading]);

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

  if (isLoading || !user) {
    return null;
  }

  const matchedPreview = comparison.matched.slice(0, previewLimit);
  const missingPreview = comparison.missingStamps.slice(0, previewLimit);
  const lockedPreview = comparison.stampsNotOnMap.slice(0, 10);

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
            <Card className="overflow-hidden border-gold/30 bg-[#fff8ea] p-0" variant="elevated">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="p-6 sm:p-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                    <Compass className="h-4 w-4" aria-hidden="true" />
                    Map and passport audit
                  </div>
                  <h2 className="mt-5 max-w-3xl text-4xl font-serif font-semibold leading-tight text-ink sm:text-5xl">
                    {comparison.stampCoveragePercent}% of your mapped countries have passport stamps.
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-7 text-ink/72">
                    You have {comparison.mapCountryCount} countr{comparison.mapCountryCount === 1 ? 'y' : 'ies'} on the map,{' '}
                    {comparison.unlockedStampIds.length} matched passport stamp
                    {comparison.unlockedStampIds.length === 1 ? '' : 's'}, and {cityPinCount} saved city pin
                    {cityPinCount === 1 ? '' : 's'}.
                  </p>
                </div>
                <div className="border-t border-gold/20 bg-[#21382B] p-6 text-cream lg:border-l lg:border-t-0">
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
              </div>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={BadgeCheck}
              label="Matched"
              value={comparison.matched.length}
              detail="Map countries with stamps"
              tone="bg-[#E8F1EA] text-[#315F43]"
            />
            <MetricCard
              icon={Search}
              label="Needs review"
              value={comparison.missingStamps.length}
              detail="Mapped countries without matches"
              tone="bg-[#F3E6D8] text-[#71481F]"
            />
            <MetricCard
              icon={Plane}
              label="Not on map"
              value={comparison.stampsNotOnMap.length}
              detail="Passport stamps still locked"
              tone="bg-[#EAF0F6] text-[#27516F]"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
            <Card className="bg-white/90">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Matched ledger</p>
                  <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Map visits with stamps</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/passport')} className="gap-2 self-start sm:self-auto">
                  Passport
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              {matchedPreview.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {matchedPreview.map((match) => (
                    <button
                      key={`${match.countryId}-${match.stamp.id}`}
                      type="button"
                      onClick={() => router.push(`/passport?stamp=${encodeURIComponent(match.stamp.id)}`)}
                      className="group rounded-lg border border-gold/16 bg-cream/36 p-4 text-left transition hover:border-gold/45 hover:bg-cream"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{match.countryName}</p>
                          <p className="mt-1 truncate text-sm text-ink/62">{match.stamp.visual.edition_name}</p>
                        </div>
                        <span className="rounded-full border border-gold/20 bg-white px-2 py-1 text-xs font-semibold text-ink/55">
                          {match.stamp.region}
                        </span>
                      </div>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-gold-deep">
                        {match.stamp.rarity} stamp
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No stamp matches yet"
                  description="Scratch a country on the map to begin unlocking passport matches."
                />
              )}
            </Card>

            <div className="space-y-6">
              <Card className="bg-[#F8F1E4]">
                <div className="mb-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Map gaps</p>
                  <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Needs stamp match</h2>
                </div>
                {missingPreview.length > 0 ? (
                  <div className="space-y-2">
                    {missingPreview.map((gap) => (
                      <div key={gap.countryId} className="rounded-lg border border-gold/16 bg-white/70 px-3 py-3">
                        <p className="font-semibold text-ink">{gap.countryName}</p>
                        <p className="text-sm text-ink/58">Mapped as {gap.countryId}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No map gaps" description="Every mapped country currently resolves to a stamp." compact />
                )}
              </Card>

              <Card className="bg-white/90">
                <div className="mb-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Still locked</p>
                  <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Stamp goals</h2>
                </div>
                <div className="space-y-2">
                  {lockedPreview.map((stamp) => (
                    <StampGoalRow
                      key={stamp.id}
                      stamp={stamp}
                      onClick={() => router.push(`/passport?stamp=${encodeURIComponent(stamp.id)}`)}
                    />
                  ))}
                </div>
              </Card>
            </div>
          </section>
        </div>
      </PageShell>
    </div>
  );
}

// Small metric card used for audit summary stats.
function MetricCard({
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  tone: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-gold/20 bg-white p-5 shadow-soft">
      <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-ink/52">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink/62">{detail}</p>
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
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-gold/16 bg-cream/36 px-3 py-3 text-left transition hover:border-gold/45 hover:bg-cream"
    >
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">{stamp.country_name}</span>
        <span className="mt-0.5 block truncate text-sm text-ink/58">{stamp.region}</span>
      </span>
      <TicketCheck className="h-4 w-4 shrink-0 text-gold-deep transition group-hover:scale-110" aria-hidden="true" />
    </button>
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
