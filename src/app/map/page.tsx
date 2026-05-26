'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@/components/ui';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import WorldAtlas from '@/components/maps/world/WorldAtlas';
import CityExplorer from '@/components/maps/city/CityExplorer';
import { useMapStore } from '@/store/mapStore';
import { placeholderCountries } from '@/lib/placeholderData';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/lib/supabase';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const countryNameAliases: Record<string, string> = {
  'united states of america': 'US',
  'united states': 'US',
  'dem rep congo': 'CD',
  'dominican rep': 'DO',
  'central african rep': 'CF',
  'eq guinea': 'GQ',
  'bosnia and herz': 'BA',
  's sudan': 'SS',
  'solomon is': 'SB',
  'falkland is': 'FK',
  'w sahara': 'EH',
};

function normalizeCountryName(countryName: string) {
  return countryName
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildAlpha2CountryLookup(regionNames: Intl.DisplayNames) {
  const lookup = new Map<string, string>();

  for (const firstLetter of alphabet) {
    for (const secondLetter of alphabet) {
      const code = `${firstLetter}${secondLetter}`;
      const displayName = regionNames.of(code);

      if (displayName && displayName !== code && displayName !== 'Unknown Region') {
        lookup.set(normalizeCountryName(displayName), code);
      }
    }
  }

  return lookup;
}

function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}

function getCountryInitials(countryName: string) {
  const words = countryName.match(/[A-Za-z]+/g) ?? [];
  const initials = words.slice(0, 2).map((word) => word[0]).join('');
  return initials.toUpperCase() || countryName.slice(0, 2).toUpperCase();
}

export default function MapPage() {
  const {
    visitedCountries,
    countryColors,
    countryLabels,
    scratchPercentage,
    reset,
    addVisitedCountry,
    removeVisitedCountry,
    setScratchPercentage,
    setCountryColor,
    setCountryLabel,
  } = useMapStore();

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user === null) {
      router.replace('/login');
    }
  }, [user, router, isLoading]);

  useEffect(() => {
    const trackedCountryIds = new Set(placeholderCountries.map((country) => country.id));
    const trackedVisitedCount = visitedCountries.filter((countryId) => trackedCountryIds.has(countryId)).length;
    const percent = Math.round((trackedVisitedCount / placeholderCountries.length) * 100);
    setScratchPercentage(percent);
  }, [visitedCountries, setScratchPercentage]);

  const selectedCountry = useMemo(
    () => placeholderCountries.find((country) => country.id === selectedCountryId) ?? null,
    [selectedCountryId]
  );

  const availableCountries = placeholderCountries.filter((country) => !visitedCountries.includes(country.id));

  const regionNames = useMemo(() => new Intl.DisplayNames(['en'], { type: 'region' }), []);
  const alpha2CountryLookup = useMemo(() => buildAlpha2CountryLookup(regionNames), [regionNames]);

  const recentlyVisited = useMemo(
    () =>
      visitedCountries.map((countryId) => {
        const knownCountry = placeholderCountries.find((country) => country.id === countryId);
        const displayName = knownCountry?.name ?? regionNames.of(countryId) ?? countryId;
        const name = countryLabels[countryId] ?? displayName;
        const normalizedName = normalizeCountryName(name);
        const alpha2Code =
          knownCountry?.code ??
          (/^[A-Z]{2}$/.test(countryId) ? countryId : undefined) ??
          countryNameAliases[normalizedName] ??
          alpha2CountryLookup.get(normalizedName);

        return {
          id: countryId,
          name,
          color: countryColors[countryId] ?? '#4ECFFF',
          flag: alpha2Code ? getFlagEmoji(alpha2Code) : null,
          initials: getCountryInitials(name),
        };
      }),
    [visitedCountries, countryColors, countryLabels, regionNames, alpha2CountryLookup]
  );

  if (isLoading || !user) {
    return null;
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    logout();
    setSigningOut(false);
    router.push('/login');
  };

  function randomVisitedColor() {
    const palette = ['#4ECFFF', '#59D98E', '#FF9F6B', '#FFD166', '#9B8CFF', '#4CD7D0', '#FF7FB0', '#7FD3FF'];
    const randomIndex = Math.floor(Math.random() * palette.length);
    return palette[randomIndex];
  }

  const handleMapCountryClick = (countryId: string, countryName?: string) => {
    if (!countryColors[countryId]) {
      setCountryColor(countryId, randomVisitedColor());
    }
    if (countryName) {
      setCountryLabel(countryId, countryName);
    }
    addVisitedCountry(countryId);
  };

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="World Atlas"
        description="Track your globe-trotting story with a world atlas, country discovery, and city-level exploration."
        actions={
          <Button variant="secondary" isLoading={signingOut} onClick={handleSignOut}>
            Sign Out
          </Button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <div className="flex flex-col gap-6">
              <WorldAtlas
                visitedCountries={visitedCountries}
                countryColors={countryColors}
                onToggleCountry={handleMapCountryClick}
                onSelectCountry={(id) => setSelectedCountryId(id)}
              />

              <Card className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="gold">Atlas {scratchPercentage}% revealed</Badge>
                  <Badge>{visitedCountries.length} countries visited</Badge>
                </div>
                <p className="text-ink/70">
                  Click a country to unlock the detailed country explorer and start building your city memory map.
                </p>
                <Button variant="outline" onClick={() => reset()}>
                  Reset Atlas Progress
                </Button>
              </Card>
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {availableCountries.slice(0, 3).map((country) => (
                  <div key={country.id} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-cream text-xl">
                        {getFlagEmoji(country.code)}
                      </span>
                      <div className="min-w-0">
                      <p className="font-medium text-ink">{country.name}</p>
                      <p className="text-sm text-ink/60">Tap to mark as visited.</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => addVisitedCountry(country.id)}>
                      Visit
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">Visited Countries</h3>
                <Badge variant="outline">{recentlyVisited.length}</Badge>
              </div>
              {recentlyVisited.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gold/30 bg-cream/60 p-4 text-sm text-ink/60">
                  No countries visited yet.
                </div>
              ) : (
                <div className="max-h-[22rem] overflow-y-auto pr-1">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {recentlyVisited.map((country) => (
                      <div
                        key={country.id}
                        className="group flex min-w-0 items-center gap-2 rounded-2xl border border-gold/15 bg-cream/70 p-2"
                      >
                        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-white text-lg shadow-sm">
                          {country.flag ?? (
                            <span className="text-xs font-semibold text-ink/65">{country.initials}</span>
                          )}
                          <span
                            className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-white"
                            style={{ backgroundColor: country.color }}
                          />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{country.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${country.name}`}
                          onClick={() => removeVisitedCountry(country.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-ink/45 transition hover:bg-white hover:text-ink focus:outline-none focus:ring-2 focus:ring-gold"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageShell>

      <CityExplorer country={selectedCountry} onClose={() => setSelectedCountryId(null)} />
    </div>
  );
}
