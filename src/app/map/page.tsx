'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, Button, Badge, Input } from '@/components/ui';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import WorldAtlas from '@/components/maps/world/WorldAtlas';
import CityExplorer from '@/components/maps/city/CityExplorer';
import type { AtlasCountryReference } from '@/components/maps/world/WorldAtlas';
import { findCountryStamp } from '@/lib/stamps/matching';
import { useMapStore } from '@/store/mapStore';
import { placeholderCountries } from '@/lib/placeholderData';
import { useAuthStore } from '@/store/authStore';
import type { Country } from '@/types';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const visitedColorPalette = ['#4ECFFF', '#59D98E', '#FF9F6B', '#FFD166', '#9B8CFF', '#4CD7D0', '#FF7FB0', '#7FD3FF'];
const atlasRevealSparkles = [
  { color: '#FFD166', left: '18%', top: '24%', x: -52, y: -54, rotate: -85 },
  { color: '#59D98E', left: '28%', top: '68%', x: -58, y: 38, rotate: 74 },
  { color: '#4ECFFF', left: '47%', top: '20%', x: 8, y: -64, rotate: 118 },
  { color: '#FF9F6B', left: '64%', top: '62%', x: 54, y: 42, rotate: -76 },
  { color: '#9B8CFF', left: '78%', top: '26%', x: 66, y: -44, rotate: 96 },
  { color: '#FF7FB0', left: '88%', top: '72%', x: 42, y: 54, rotate: -126 },
  { color: '#4CD7D0', left: '36%', top: '42%', x: -18, y: -78, rotate: 142 },
  { color: '#FFD166', left: '58%', top: '38%', x: 36, y: -72, rotate: -138 },
  { color: '#FF9F6B', left: '72%', top: '48%', x: 80, y: 8, rotate: 164 },
  { color: '#9B8CFF', left: '12%', top: '58%', x: -74, y: -4, rotate: -156 },
];

const countryNameAliases: Record<string, string> = {
  'united states of america': 'US',
  'united states': 'US',
  'benin': 'BJ',
  'burkina faso': 'BF',
  'congo kinshasa': 'CD',
  'dem rep congo': 'CD',
  'dominican rep': 'DO',
  'central african rep': 'CF',
  'eq guinea': 'GQ',
  'bosnia and herz': 'BA',
  'curacao': 'CW',
  'france': 'FR',
  'germany': 'DE',
  'burma': 'MM',
  'myanmar': 'MM',
  'myanmar burma': 'MM',
  'russia': 'RU',
  'serbia': 'RS',
  's sudan': 'SS',
  'solomon is': 'SB',
  'falkland is': 'FK',
  'timor leste': 'TL',
  'united kingdom': 'GB',
  'vanuatu': 'VU',
  'vietnam': 'VN',
  'w sahara': 'EH',
  'yemen': 'YE',
  'zimbabwe': 'ZW',
};

function normalizeCountryName(countryName: string) {
  return countryName
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getRegionDisplayName(regionNames: Intl.DisplayNames, countryId: string) {
  if (!/^[A-Z]{2}$/i.test(countryId)) return undefined;

  const normalizedCountryId = countryId.toUpperCase();

  try {
    const displayName = regionNames.of(normalizedCountryId);
    if (!displayName || displayName === normalizedCountryId || displayName === 'Unknown Region') return undefined;
    return displayName;
  } catch {
    return undefined;
  }
}

function buildAlpha2CountryLookup(regionNames: Intl.DisplayNames) {
  const lookup = new Map<string, string>();

  for (const firstLetter of alphabet) {
    for (const secondLetter of alphabet) {
      const code = `${firstLetter}${secondLetter}`;
      const displayName = getRegionDisplayName(regionNames, code);

      if (displayName) {
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

function pickVisitedColor(
  countryId: string,
  countryColors: Record<string, string>,
  neighboringCountryIds: string[] = [],
  visitedCountryIds?: Set<string>
) {
  const blockedNeighborColors = new Set(
    neighboringCountryIds
      .filter((neighborId) => !visitedCountryIds || visitedCountryIds.has(neighborId))
      .map((neighborId) => countryColors[neighborId])
      .filter(Boolean)
  );
  const colorUseCounts = new Map(visitedColorPalette.map((color) => [color, 0]));

  Object.entries(countryColors).forEach(([coloredCountryId, color]) => {
    if (coloredCountryId === countryId) return;
    colorUseCounts.set(color, (colorUseCounts.get(color) ?? 0) + 1);
  });

  const availableColors = visitedColorPalette.filter((color) => !blockedNeighborColors.has(color));
  const colorOptions = availableColors.length > 0 ? availableColors : visitedColorPalette;
  const lowestUseCount = Math.min(...colorOptions.map((color) => colorUseCounts.get(color) ?? 0));
  const leastUsedColors = colorOptions.filter((color) => (colorUseCounts.get(color) ?? 0) === lowestUseCount);
  const stableIndex = Array.from(countryId).reduce(
    (total, character) => total + character.charCodeAt(0),
    countryId.length
  ) % leastUsedColors.length;

  return leastUsedColors[stableIndex];
}

interface RevealedStampBanner {
  stampId: string;
  countryName: string;
  region: string;
  editionName: string;
}

interface CountryRemovalConfirmation {
  name: string;
  ids: string[];
}

interface QuickActionCountry {
  id: string;
  name: string;
  flag: string | null;
  initials: string;
}

interface VisitedCountryItem {
  id: string;
  name: string;
  color: string;
  flag: string | null;
  initials: string;
  sourceIds: string[];
  latestVisitedIndex: number;
}

interface AtlasRevealCelebration {
  id: number;
  milestone: boolean;
  percent: number;
}

type VisitedCountrySort = 'name-asc' | 'name-desc' | 'recent';

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
  const router = useRouter();
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [countryNeighborIds, setCountryNeighborIds] = useState<Record<string, string[]>>({});
  const [atlasCountries, setAtlasCountries] = useState<AtlasCountryReference[]>([]);
  const [revealedStamp, setRevealedStamp] = useState<RevealedStampBanner | null>(null);
  const [countryPendingRemoval, setCountryPendingRemoval] = useState<CountryRemovalConfirmation | null>(null);
  const [isAtlasResetConfirmationOpen, setIsAtlasResetConfirmationOpen] = useState(false);
  const [visitedCountrySearch, setVisitedCountrySearch] = useState('');
  const [visitedCountrySort, setVisitedCountrySort] = useState<VisitedCountrySort>('name-asc');
  const [atlasRevealCelebration, setAtlasRevealCelebration] = useState<AtlasRevealCelebration | null>(null);
  const previousAtlasRevealPercentRef = useRef<number | null>(null);

  const handleCountryNeighborsReady = useCallback((neighborIds: Record<string, string[]>) => {
    setCountryNeighborIds(neighborIds);
  }, []);

  const handleAtlasCountriesReady = useCallback((countries: AtlasCountryReference[]) => {
    setAtlasCountries(countries);
  }, []);

  const regionNames = useMemo(() => new Intl.DisplayNames(['en'], { type: 'region' }), []);
  const alpha2CountryLookup = useMemo(() => buildAlpha2CountryLookup(regionNames), [regionNames]);
  const atlasCountryById = useMemo(
    () => new Map(atlasCountries.map((country) => [country.id, country])),
    [atlasCountries]
  );
  const atlasCountryLookup = useMemo(() => {
    const ids = new Set(atlasCountries.map((country) => country.id));
    const names = new Map(
      atlasCountries.map((country) => [normalizeCountryName(country.name), country.id])
    );
    const alpha2Codes = new Map(
      atlasCountries
        .map((country) => {
          const normalizedName = normalizeCountryName(country.name);
          const alpha2Code = countryNameAliases[normalizedName] ?? alpha2CountryLookup.get(normalizedName);

          return alpha2Code ? [alpha2Code, country.id] : null;
        })
        .filter((entry): entry is [string, string] => entry !== null)
    );

    return { alpha2Codes, ids, names };
  }, [alpha2CountryLookup, atlasCountries]);

  const resolveAtlasCountryId = useCallback(
    (countryId: string) => {
      const normalizedCountryId = countryId.toUpperCase();

      if (atlasCountryLookup.ids.has(normalizedCountryId)) {
        return normalizedCountryId;
      }

      const alpha2Match = atlasCountryLookup.alpha2Codes.get(normalizedCountryId);
      if (alpha2Match) {
        return alpha2Match;
      }

      const knownCountry = placeholderCountries.find((country) => country.id === countryId);
      const countryNameCandidates = [
        countryLabels[countryId],
        knownCountry?.name,
        getRegionDisplayName(regionNames, countryId),
        countryId,
      ];

      for (const countryName of countryNameCandidates) {
        if (!countryName) continue;

        const nameMatch = atlasCountryLookup.names.get(normalizeCountryName(countryName));
        if (nameMatch) {
          return nameMatch;
        }
      }

      return countryId;
    },
    [atlasCountryLookup, countryLabels, regionNames]
  );

  const visitedAtlasCountryIds = useMemo(() => {
    const resolvedAtlasCountryIds = new Set<string>();

    visitedCountries.forEach((countryId) => {
      const resolvedCountryId = resolveAtlasCountryId(countryId);

      if (atlasCountryLookup.ids.has(resolvedCountryId)) {
        resolvedAtlasCountryIds.add(resolvedCountryId);
      }
    });

    return resolvedAtlasCountryIds;
  }, [atlasCountryLookup.ids, resolveAtlasCountryId, visitedCountries]);

  const isCountryAlreadyVisited = useCallback(
    (countryId: string) => {
      const resolvedCountryId = resolveAtlasCountryId(countryId);

      return visitedCountries.some((visitedCountryId) => resolveAtlasCountryId(visitedCountryId) === resolvedCountryId);
    },
    [resolveAtlasCountryId, visitedCountries]
  );

  useEffect(() => {
    if (!isLoading && user === null) {
      router.replace('/login');
    }
  }, [user, router, isLoading]);

  useEffect(() => {
    if (atlasCountries.length === 0) return;

    const percent = Math.round((visitedAtlasCountryIds.size / atlasCountries.length) * 100);
    setScratchPercentage(percent);
  }, [atlasCountries.length, setScratchPercentage, visitedAtlasCountryIds]);

  const quickActionCountries = useMemo<QuickActionCountry[]>(() => {
    if (atlasCountries.length === 0) {
      return placeholderCountries
        .filter((country) => !visitedCountries.includes(country.id))
        .slice(0, 3)
        .map((country) => ({
          id: country.id,
          name: country.name,
          flag: getFlagEmoji(country.code),
          initials: getCountryInitials(country.name),
        }));
    }

    return atlasCountries
      .filter((country) => !visitedAtlasCountryIds.has(country.id))
      .sort((firstCountry, secondCountry) =>
        firstCountry.name.localeCompare(secondCountry.name, undefined, { sensitivity: 'base' })
      )
      .slice(0, 3)
      .map((country) => {
        const normalizedName = normalizeCountryName(country.name);
        const alpha2Code = countryNameAliases[normalizedName] ?? alpha2CountryLookup.get(normalizedName);

        return {
          id: country.id,
          name: country.name,
          flag: alpha2Code ? getFlagEmoji(alpha2Code) : null,
          initials: getCountryInitials(country.name),
        };
      });
  }, [alpha2CountryLookup, atlasCountries, visitedAtlasCountryIds, visitedCountries]);

  const selectedCountry = useMemo<Country | null>(() => {
    if (!selectedCountryId) return null;

    const knownCountry = placeholderCountries.find((country) => country.id === selectedCountryId);
    if (knownCountry) return knownCountry;

    const displayName =
      getRegionDisplayName(regionNames, selectedCountryId) ??
      atlasCountryById.get(selectedCountryId)?.name ??
      selectedCountryId;
    const name = countryLabels[selectedCountryId] ?? displayName;
    const normalizedName = normalizeCountryName(name);
    const alpha2Code =
      (/^[A-Z]{2}$/.test(selectedCountryId) ? selectedCountryId : undefined) ??
      countryNameAliases[normalizedName] ??
      alpha2CountryLookup.get(normalizedName) ??
      selectedCountryId;

    return {
      id: selectedCountryId,
      name,
      code: alpha2Code,
      pathData: '',
      visited: isCountryAlreadyVisited(selectedCountryId),
      journalEntries: [],
      cities: [],
      highlights: [],
    };
  }, [
    alpha2CountryLookup,
    atlasCountryById,
    countryLabels,
    isCountryAlreadyVisited,
    regionNames,
    selectedCountryId,
  ]);

  const recentlyVisited = useMemo<VisitedCountryItem[]>(() => {
    const visitedCountryItems = new Map<string, VisitedCountryItem>();

    visitedCountries.forEach((countryId, visitedIndex) => {
      const resolvedCountryId = resolveAtlasCountryId(countryId);
      const existingCountryItem = visitedCountryItems.get(resolvedCountryId);
      const knownCountry = placeholderCountries.find((country) => country.id === countryId);
      const atlasCountry = atlasCountryById.get(resolvedCountryId);
      const displayName =
        knownCountry?.name ??
        atlasCountry?.name ??
        getRegionDisplayName(regionNames, countryId) ??
        countryId;
      const name = countryLabels[resolvedCountryId] ?? countryLabels[countryId] ?? displayName;
      const normalizedName = normalizeCountryName(name);
      const alpha2Code =
        knownCountry?.code ??
        (/^[A-Z]{2}$/.test(countryId) ? countryId : undefined) ??
        countryNameAliases[normalizedName] ??
        alpha2CountryLookup.get(normalizedName);

      const countryItem: VisitedCountryItem = {
        id: resolvedCountryId,
        name,
        color: countryColors[resolvedCountryId] ?? countryColors[countryId] ?? existingCountryItem?.color ?? '#4ECFFF',
        flag: alpha2Code ? getFlagEmoji(alpha2Code) : null,
        initials: getCountryInitials(name),
        sourceIds: Array.from(new Set([...(existingCountryItem?.sourceIds ?? []), resolvedCountryId, countryId])),
        latestVisitedIndex: Math.max(existingCountryItem?.latestVisitedIndex ?? -1, visitedIndex),
      };

      visitedCountryItems.set(resolvedCountryId, countryItem);
    });

    return Array.from(visitedCountryItems.values());
  }, [
    alpha2CountryLookup,
    atlasCountryById,
    countryColors,
    countryLabels,
    regionNames,
    resolveAtlasCountryId,
    visitedCountries,
  ]);

  const mapVisitedCountryIds = useMemo(
    () => Array.from(new Set([...visitedCountries, ...visitedAtlasCountryIds])),
    [visitedAtlasCountryIds, visitedCountries]
  );

  const mapCountryColors = useMemo(() => {
    const colors = { ...countryColors };

    recentlyVisited.forEach((country) => {
      colors[country.id] = colors[country.id] ?? country.color;
    });

    return colors;
  }, [countryColors, recentlyVisited]);

  useEffect(() => {
    if (Object.keys(countryNeighborIds).length === 0) return;

    const visitedCountryIds = new Set(mapVisitedCountryIds);
    const nextCountryColors = { ...mapCountryColors };
    const visitedAtlasCountryIdsWithNeighbors = mapVisitedCountryIds
      .filter((countryId) => countryNeighborIds[countryId])
      .sort((firstCountryId, secondCountryId) => {
        const firstNeighborCount = (countryNeighborIds[firstCountryId] ?? []).filter((neighborId) =>
          visitedCountryIds.has(neighborId)
        ).length;
        const secondNeighborCount = (countryNeighborIds[secondCountryId] ?? []).filter((neighborId) =>
          visitedCountryIds.has(neighborId)
        ).length;

        if (secondNeighborCount !== firstNeighborCount) {
          return secondNeighborCount - firstNeighborCount;
        }

        return firstCountryId.localeCompare(secondCountryId);
      });

    const colorChanges: Array<[string, string]> = [];

    visitedAtlasCountryIdsWithNeighbors.forEach((countryId) => {
      const currentColor = nextCountryColors[countryId];
      const neighboringCountryIds = countryNeighborIds[countryId] ?? [];
      const hasNeighborColorConflict =
        currentColor !== undefined &&
        neighboringCountryIds.some(
          (neighborId) => visitedCountryIds.has(neighborId) && nextCountryColors[neighborId] === currentColor
        );

      if (currentColor && !hasNeighborColorConflict) return;

      const nextColor = pickVisitedColor(countryId, nextCountryColors, neighboringCountryIds, visitedCountryIds);
      if (nextColor === currentColor) return;

      nextCountryColors[countryId] = nextColor;
      colorChanges.push([countryId, nextColor]);
    });

    colorChanges.forEach(([countryId, color]) => setCountryColor(countryId, color));
  }, [countryNeighborIds, mapCountryColors, mapVisitedCountryIds, setCountryColor]);

  const visibleVisitedCountries = useMemo(() => {
    const searchQuery = normalizeCountryName(visitedCountrySearch);
    const filteredCountries = searchQuery
      ? recentlyVisited.filter((country) =>
          normalizeCountryName(`${country.name} ${country.id} ${country.sourceIds.join(' ')}`).includes(searchQuery)
        )
      : recentlyVisited;

    return [...filteredCountries].sort((firstCountry, secondCountry) => {
      if (visitedCountrySort === 'recent') {
        return secondCountry.latestVisitedIndex - firstCountry.latestVisitedIndex;
      }

      const nameComparison = firstCountry.name.localeCompare(secondCountry.name, undefined, { sensitivity: 'base' });
      return visitedCountrySort === 'name-desc' ? -nameComparison : nameComparison;
    });
  }, [recentlyVisited, visitedCountrySearch, visitedCountrySort]);

  const visitedCountryCountLabel = visitedCountrySearch.trim()
    ? `${visibleVisitedCountries.length}/${recentlyVisited.length}`
    : recentlyVisited.length;
  const isAtlasRevealLoaded = atlasCountries.length > 0;
  const atlasRevealPercent = isAtlasRevealLoaded ? Math.min(100, Math.max(0, scratchPercentage)) : 0;

  useEffect(() => {
    if (!isAtlasRevealLoaded) return;

    const previousPercent = previousAtlasRevealPercentRef.current;
    previousAtlasRevealPercentRef.current = atlasRevealPercent;

    if (previousPercent === null || atlasRevealPercent <= previousPercent) return;

    const crossedFivePercentMilestone =
      Math.floor(atlasRevealPercent / 5) > Math.floor(previousPercent / 5);

    setAtlasRevealCelebration({
      id: Date.now(),
      milestone: crossedFivePercentMilestone,
      percent: atlasRevealPercent,
    });

    const celebrationTimeout = window.setTimeout(() => {
      setAtlasRevealCelebration(null);
    }, crossedFivePercentMilestone ? 10000 : 1200);

    return () => window.clearTimeout(celebrationTimeout);
  }, [atlasRevealPercent, isAtlasRevealLoaded]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream">
        <AppHeader />
        <PageShell title="Your Travel Map" description="Checking your session before opening the atlas.">
          <Card className="p-6 text-ink/70">Loading your map...</Card>
        </PageShell>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-cream">
        <AppHeader />
        <PageShell title="Your Travel Map" description="Redirecting you to sign in.">
          <Card className="p-6 text-ink/70">Taking you back to sign in...</Card>
        </PageShell>
      </div>
    );
  }

  const handleQuickVisit = (countryId: string, countryName?: string, neighboringCountryIds: string[] = []) => {
    const knownCountry = placeholderCountries.find((country) => country.id === countryId);
    const resolvedCountryName = countryName ?? knownCountry?.name;
    const wasVisited = isCountryAlreadyVisited(countryId);
    const currentColor = mapCountryColors[countryId];
    const visitedCountryIds = new Set(mapVisitedCountryIds);
    const hasNeighborColorConflict =
      currentColor !== undefined &&
      neighboringCountryIds.some(
        (neighborId) => visitedCountryIds.has(neighborId) && mapCountryColors[neighborId] === currentColor
      );

    if (!currentColor || hasNeighborColorConflict) {
      setCountryColor(countryId, pickVisitedColor(countryId, mapCountryColors, neighboringCountryIds, visitedCountryIds));
    }
    if (resolvedCountryName) {
      setCountryLabel(countryId, resolvedCountryName);
    }
    if (!wasVisited || visitedCountries.includes(countryId)) {
      addVisitedCountry(countryId);
    }

    if (!wasVisited) {
      const stamp = findCountryStamp(countryId, resolvedCountryName, knownCountry?.code);

      if (stamp) {
        setRevealedStamp({
          stampId: stamp.id,
          countryName: stamp.country_name,
          region: stamp.region,
          editionName: stamp.visual.edition_name,
        });
      }
    }
  };

  const handleMapCountryClick = (countryId: string, countryName?: string, neighboringCountryIds: string[] = []) => {
    const wasVisited = isCountryAlreadyVisited(countryId);
    const currentColor = mapCountryColors[countryId];
    const visitedCountryIds = new Set(mapVisitedCountryIds);
    const hasNeighborColorConflict =
      currentColor !== undefined &&
      neighboringCountryIds.some(
        (neighborId) => visitedCountryIds.has(neighborId) && mapCountryColors[neighborId] === currentColor
      );

    if (!currentColor || hasNeighborColorConflict) {
      setCountryColor(countryId, pickVisitedColor(countryId, mapCountryColors, neighboringCountryIds, visitedCountryIds));
    }
    if (countryName) {
      setCountryLabel(countryId, countryName);
    }
    if (!wasVisited || visitedCountries.includes(countryId)) {
      addVisitedCountry(countryId);
    }

    if (!wasVisited) {
      const stamp = findCountryStamp(countryId, countryName);

      if (stamp) {
        setRevealedStamp({
          stampId: stamp.id,
          countryName: stamp.country_name,
          region: stamp.region,
          editionName: stamp.visual.edition_name,
        });
      }
    }
  };

  const handleVisitedCountrySelect = (countryId: string, countryName: string) => {
    handleMapCountryClick(countryId, countryName, countryNeighborIds[countryId] ?? []);
    setSelectedCountryId(countryId);
  };

  const handleRequestCountryRemoval = (country: CountryRemovalConfirmation) => {
    setCountryPendingRemoval(country);
  };

  const handleCancelCountryRemoval = () => {
    setCountryPendingRemoval(null);
  };

  const handleConfirmCountryRemoval = () => {
    if (!countryPendingRemoval) return;

    countryPendingRemoval.ids.forEach((countryId) => removeVisitedCountry(countryId));
    setCountryPendingRemoval(null);
  };

  const handleRequestAtlasReset = () => {
    setIsAtlasResetConfirmationOpen(true);
  };

  const handleCancelAtlasReset = () => {
    setIsAtlasResetConfirmationOpen(false);
  };

  const handleConfirmAtlasReset = () => {
    reset();
    setIsAtlasResetConfirmationOpen(false);
  };

  const handleShowRevealedStamp = () => {
    if (!revealedStamp) return;

    router.push(`/passport?stamp=${encodeURIComponent(revealedStamp.stampId)}`);
  };

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="World Atlas"
        description="Track your globe-trotting story with a world atlas, country discovery, and city-level exploration."
      >
        <div className="space-y-6">
          <WorldAtlas
            visitedCountries={mapVisitedCountryIds}
            countryColors={mapCountryColors}
            onToggleCountry={handleMapCountryClick}
            onCountryNeighborsReady={handleCountryNeighborsReady}
            onAtlasCountriesReady={handleAtlasCountriesReady}
            atlasSummary={
              <div className="space-y-3">
                <motion.div
                  className="relative max-w-md rounded-2xl border border-gold/30 bg-white/80 p-3 text-ink shadow-sm-soft"
                  animate={
                    atlasRevealCelebration
                      ? {
                          boxShadow: [
                            '0 8px 24px rgba(98, 75, 45, 0.08)',
                            atlasRevealCelebration.milestone
                              ? '0 0 0 6px rgba(255, 209, 102, 0.28), 0 18px 42px rgba(201, 151, 55, 0.28)'
                              : '0 0 0 4px rgba(255, 209, 102, 0.2), 0 14px 32px rgba(201, 151, 55, 0.18)',
                            '0 8px 24px rgba(98, 75, 45, 0.08)',
                          ],
                        }
                      : undefined
                  }
                  transition={{ duration: atlasRevealCelebration?.milestone ? 1.15 : 0.8, ease: 'easeOut' }}
                >
                  <AnimatePresence>
                    {atlasRevealCelebration && (
                      <motion.div
                        key={atlasRevealCelebration.id}
                        className="pointer-events-none absolute -inset-8 z-20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {atlasRevealSparkles.map((sparkle, index) => (
                          <motion.span
                            key={`${atlasRevealCelebration.id}-${sparkle.left}-${sparkle.top}`}
                            className="absolute rounded-full shadow-md"
                            style={{ backgroundColor: sparkle.color, left: sparkle.left, top: sparkle.top }}
                            initial={{
                              opacity: 0,
                              scale: 0.25,
                              x: 0,
                              y: 0,
                              rotate: 0,
                              width: atlasRevealCelebration.milestone ? 12 : 9,
                              height: atlasRevealCelebration.milestone ? 12 : 9,
                              borderRadius: index % 3 === 0 ? 3 : 999,
                            }}
                            animate={{
                              opacity: [0, 1, 1, 0],
                              scale: [0.25, atlasRevealCelebration.milestone ? 1.9 : 1.45, 0.8],
                              x: sparkle.x,
                              y: sparkle.y,
                              rotate: sparkle.rotate,
                            }}
                            transition={{
                              delay: index * 0.025,
                              duration: atlasRevealCelebration.milestone ? 1.45 : 1.05,
                              ease: 'easeOut',
                            }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-gold/80">Atlas reveal</p>
                      <p className="mt-1 text-sm font-medium text-ink/65">
                        {isAtlasRevealLoaded ? 'Your world is taking shape.' : 'Calculating progress...'}
                      </p>
                    </div>
                    <div className="text-right">
                      <motion.p
                        key={atlasRevealPercent}
                        className="text-3xl font-serif font-semibold text-ink"
                        animate={
                          atlasRevealCelebration
                            ? { scale: [1, atlasRevealCelebration.milestone ? 1.22 : 1.12, 1] }
                            : { scale: 1 }
                        }
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                      >
                        {isAtlasRevealLoaded ? `${atlasRevealPercent}%` : '--'}
                      </motion.p>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/45">revealed</p>
                    </div>
                  </div>
                  <div className="relative z-10 mt-3 h-2.5 overflow-hidden rounded-full border border-gold/10 bg-cream">
                    <motion.div
                      className="h-full rounded-full bg-gold"
                      style={{ width: `${atlasRevealPercent}%` }}
                      animate={
                        atlasRevealCelebration
                          ? { filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'] }
                          : undefined
                      }
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                    />
                  </div>
                  <AnimatePresence>
                    {atlasRevealCelebration?.milestone && (
                      <motion.div
                        key={`milestone-${atlasRevealCelebration.id}`}
                        className="relative z-10 mt-3 flex justify-start"
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      >
                        <span className="rounded-full border border-gold/40 bg-cream px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-gold shadow-sm-soft">
                          {atlasRevealCelebration.percent}% milestone
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                <p className="inline-flex max-w-2xl rounded-xl border border-gold/25 bg-white/65 px-3 py-2 text-sm font-medium text-ink shadow-sm-soft">
                  Click a country to mark it visited, then open Country Explorer from the visited list.
                </p>
              </div>
            }
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.6fr)]">
            <Card>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xl font-semibold">Quick Actions</h3>
                <Button size="sm" variant="outline" onClick={handleRequestAtlasReset}>
                  Reset Atlas
                </Button>
              </div>
              {quickActionCountries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gold/30 bg-cream/60 p-4 text-sm text-ink/60">
                  Every atlas country is marked visited.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
                  {quickActionCountries.map((country) => (
                    <div key={country.id} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-cream text-xl">
                          {country.flag ?? (
                            <span className="text-xs font-semibold text-ink/65">{country.initials}</span>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{country.name}</p>
                          <p className="text-sm text-ink/60">Recommended next visit.</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleQuickVisit(country.id, country.name, countryNeighborIds[country.id] ?? [])}
                      >
                        Visit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">Visited Countries</h3>
                  <Badge variant="outline">{visitedCountryCountLabel}</Badge>
                </div>
                <p className="text-sm text-ink/60">
                  Click a country flag or name to open Country Explorer.
                </p>
                {recentlyVisited.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
                    <Input
                      id="visited-country-search"
                      aria-label="Search visited countries"
                      placeholder="Search countries"
                      value={visitedCountrySearch}
                      onChange={(event) => setVisitedCountrySearch(event.target.value)}
                      className="h-10 px-3 py-2 text-sm"
                    />
                    <div>
                      <label htmlFor="visited-country-sort" className="sr-only">
                        Sort visited countries
                      </label>
                      <select
                        id="visited-country-sort"
                        value={visitedCountrySort}
                        onChange={(event) => setVisitedCountrySort(event.target.value as VisitedCountrySort)}
                        className="h-10 w-full rounded-lg border-2 border-gold/30 bg-white px-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
                      >
                        <option value="name-asc">A-Z</option>
                        <option value="name-desc">Z-A</option>
                        <option value="recent">Newest</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              {recentlyVisited.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gold/30 bg-cream/60 p-4 text-sm text-ink/60">
                  No countries visited yet.
                </div>
              ) : visibleVisitedCountries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gold/30 bg-cream/60 p-4 text-sm text-ink/60">
                  No visited countries match that search.
                </div>
              ) : (
                <div className="max-h-[26rem] overflow-y-auto pr-1">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {visibleVisitedCountries.map((country) => (
                      <div
                        key={country.id}
                        className="group flex min-w-0 items-center gap-2 rounded-2xl border border-gold/15 bg-cream/70 p-2"
                      >
                        <button
                          type="button"
                          aria-label={`Select ${country.name}`}
                          onClick={() => handleVisitedCountrySelect(country.id, country.name)}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-gold"
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
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${country.name}`}
                          onClick={() => handleRequestCountryRemoval({ ids: country.sourceIds, name: country.name })}
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

      <AnimatePresence>
        {isAtlasResetConfirmationOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-atlas-title"
            onClick={handleCancelAtlasReset}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl border border-gold/30 bg-white p-5 text-ink shadow-lg-soft"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-black uppercase tracking-[0.24em] text-gold/80">
                Confirm reset
              </p>
              <h3 id="reset-atlas-title" className="mt-2 text-xl font-semibold text-ink">
                Reset atlas progress?
              </h3>
              <p className="mt-2 text-sm text-ink/65">
                This will clear your visited countries, atlas colors, country labels, and reveal progress.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={handleCancelAtlasReset}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmAtlasReset}>
                  Reset Atlas
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {countryPendingRemoval && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-country-title"
            onClick={handleCancelCountryRemoval}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl border border-gold/30 bg-white p-5 text-ink shadow-lg-soft"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-black uppercase tracking-[0.24em] text-gold/80">
                Confirm removal
              </p>
              <h3 id="remove-country-title" className="mt-2 text-xl font-semibold text-ink">
                Remove {countryPendingRemoval.name}?
              </h3>
              <p className="mt-2 text-sm text-ink/65">
                This will remove the country from your visited list and clear its atlas color.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={handleCancelCountryRemoval}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmCountryRemoval}>
                  Remove
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {revealedStamp && (
          <motion.div
            className="fixed bottom-5 left-4 right-4 z-50 mx-auto max-w-md overflow-hidden rounded-2xl border border-gold/35 bg-white/95 p-4 text-ink shadow-soft backdrop-blur md:left-auto md:right-6 md:mx-0"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-cream text-sm font-black text-gold">
                STP
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-gold/80">
                  Stamp revealed
                </p>
                <h3 className="mt-1 text-lg font-semibold text-ink">
                  {revealedStamp.countryName}
                </h3>
                <p className="mt-1 text-sm text-ink/65">
                  {revealedStamp.editionName} has been added to your {revealedStamp.region} folio.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={handleShowRevealedStamp}>
                    Show me the stamp
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRevealedStamp(null)}>
                    Later
                  </Button>
                </div>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black text-ink/45 transition hover:bg-cream hover:text-ink focus:outline-none focus:ring-2 focus:ring-gold"
                aria-label="Dismiss stamp revealed message"
                onClick={() => setRevealedStamp(null)}
              >
                X
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
