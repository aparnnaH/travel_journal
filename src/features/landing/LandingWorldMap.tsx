// Public landing-page world map preview.
// This is intentionally separate from the authenticated map store so the home
// page can show an interactive demo without loading user state.
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ExtendedFeature } from 'd3-geo';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';

type AtlasGeography = ExtendedFeature & {
  rsmKey: string;
  id?: string | number;
  properties: {
    name?: unknown;
  } | null;
};

type FeaturedCountry = {
  id: string;
  name: string;
  atlasNames: string[];
  color: string;
  note: string;
};

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

type TopoGeometry = {
  type: string;
  id?: string | number;
  properties?: {
    name?: unknown;
  } | null;
  arcs?: TopoArcReference;
  geometries?: TopoGeometry[];
};

type TopoGeometryCollection = {
  type: 'GeometryCollection';
  geometries: TopoGeometry[];
};

type Topology = {
  type: 'Topology';
  objects: Record<string, TopoGeometryCollection>;
};

type TopoArcReference = number | TopoArcReference[];

const featuredCountries: FeaturedCountry[] = [
  {
    id: 'US',
    name: 'United States',
    atlasNames: ['United States of America', 'United States'],
    color: '#4ECFFF',
    note: 'Road-trip journals, city pins, and a fresh passport stamp preview.',
  },
  {
    id: 'FR',
    name: 'France',
    atlasNames: ['France'],
    color: '#59D98E',
    note: 'Paris notes and countryside memories are ready to explore.',
  },
  {
    id: 'JP',
    name: 'Japan',
    atlasNames: ['Japan'],
    color: '#FF9F6B',
    note: 'Saved cities, food notes, and a stamp reveal moment.',
  },
  {
    id: 'BR',
    name: 'Brazil',
    atlasNames: ['Brazil'],
    color: '#FFD166',
    note: 'A bright atlas color marks the next story-rich stop.',
  },
  {
    id: 'IT',
    name: 'Italy',
    atlasNames: ['Italy'],
    color: '#9B8CFF',
    note: 'Scrapbook pages, saved meals, and coastal city pins.',
  },
  {
    id: 'AU',
    name: 'Australia',
    atlasNames: ['Australia'],
    color: '#4CD7D0',
    note: 'Wide-open routes and a country-level explorer preview.',
  },
  {
    id: 'PT',
    name: 'Portugal',
    atlasNames: ['Portugal'],
    color: '#FF7FB0',
    note: 'Tile-lined mornings, coastal viewpoints, and saved Lisbon notes.',
  },
  {
    id: 'KR',
    name: 'South Korea',
    atlasNames: ['South Korea'],
    color: '#7FD3FF',
    note: 'Seoul routes, food stops, and a trip-import itinerary preview.',
  },
  {
    id: 'SG',
    name: 'Singapore',
    atlasNames: ['Singapore'],
    color: '#67D6A3',
    note: 'A compact city-country marked with skyline memories and food notes.',
  },
  {
    id: 'IS',
    name: 'Iceland',
    atlasNames: ['Iceland'],
    color: '#B8E986',
    note: 'Waterfall routes, quiet drives, and dramatic landscape memories.',
  },
  {
    id: 'NL',
    name: 'Netherlands',
    atlasNames: ['Netherlands'],
    color: '#F6A06D',
    note: 'Canal walks, museum days, and city pins clustered together.',
  },
  {
    id: 'CR',
    name: 'Costa Rica',
    atlasNames: ['Costa Rica'],
    color: '#9B8CFF',
    note: 'Rainforest stops, beach notes, and wildlife memories in one place.',
  },
  {
    id: 'CH',
    name: 'Switzerland',
    atlasNames: ['Switzerland'],
    color: '#FFD166',
    note: 'Alpine views, train routes, and tiny towns saved to the atlas.',
  },
  {
    id: 'AE',
    name: 'United Arab Emirates',
    atlasNames: ['United Arab Emirates'],
    color: '#4ECFFF',
    note: 'Desert evenings, city architecture, and a stamp-ready travel stop.',
  },
  {
    id: 'CA',
    name: 'Canada',
    atlasNames: ['Canada'],
    color: '#59D98E',
    note: 'City weekends, national parks, and family-trip memories.',
  },
  {
    id: 'MX',
    name: 'Mexico',
    atlasNames: ['Mexico'],
    color: '#FF9F6B',
    note: 'Food notes, beach days, and colorful city stops.',
  },
  {
    id: 'ES',
    name: 'Spain',
    atlasNames: ['Spain'],
    color: '#FFD166',
    note: 'Plazas, coastal towns, and late-night journal entries.',
  },
  {
    id: 'DE',
    name: 'Germany',
    atlasNames: ['Germany'],
    color: '#9B8CFF',
    note: 'Museum days, train routes, and old-town photo walks.',
  },
  {
    id: 'GR',
    name: 'Greece',
    atlasNames: ['Greece'],
    color: '#4CD7D0',
    note: 'Island views, ancient sites, and saved sunset notes.',
  },
  {
    id: 'IE',
    name: 'Ireland',
    atlasNames: ['Ireland'],
    color: '#FF7FB0',
    note: 'Green routes, music nights, and countryside memories.',
  },
  {
    id: 'DK',
    name: 'Denmark',
    atlasNames: ['Denmark'],
    color: '#67D6A3',
    note: 'Harbor walks, design shops, and cozy city notes.',
  },
  {
    id: 'NO',
    name: 'Norway',
    atlasNames: ['Norway'],
    color: '#7FD3FF',
    note: 'Fjord routes, mountain views, and quiet northern memories.',
  },
  {
    id: 'SE',
    name: 'Sweden',
    atlasNames: ['Sweden'],
    color: '#B8E986',
    note: 'Island ferries, fika stops, and calm city walks.',
  },
  {
    id: 'TH',
    name: 'Thailand',
    atlasNames: ['Thailand'],
    color: '#F6A06D',
    note: 'Temple days, market snacks, and beach-side journal pages.',
  },
  {
    id: 'MA',
    name: 'Morocco',
    atlasNames: ['Morocco'],
    color: '#4ECFFF',
    note: 'Medina lanes, rooftop views, and textured travel notes.',
  },
  {
    id: 'ZA',
    name: 'South Africa',
    atlasNames: ['South Africa'],
    color: '#59D98E',
    note: 'Coastal drives, city stories, and safari-ready memories.',
  },
  {
    id: 'AR',
    name: 'Argentina',
    atlasNames: ['Argentina'],
    color: '#FF9F6B',
    note: 'Long walks, late dinners, and dramatic landscape routes.',
  },
  {
    id: 'CL',
    name: 'Chile',
    atlasNames: ['Chile'],
    color: '#FFD166',
    note: 'Mountain routes, desert skies, and narrow coastal stops.',
  },
  {
    id: 'PE',
    name: 'Peru',
    atlasNames: ['Peru'],
    color: '#9B8CFF',
    note: 'High-altitude trails, market mornings, and heritage sites.',
  },
  {
    id: 'VN',
    name: 'Vietnam',
    atlasNames: ['Vietnam'],
    color: '#4CD7D0',
    note: 'Street food, scooter rides, and layered city memories.',
  },
  {
    id: 'NZ',
    name: 'New Zealand',
    atlasNames: ['New Zealand'],
    color: '#FF7FB0',
    note: 'Road trips, lakeside views, and outdoor journal moments.',
  },
  {
    id: 'GB',
    name: 'United Kingdom',
    atlasNames: ['United Kingdom'],
    color: '#67D6A3',
    note: 'Museum days, train rides, and rainy city walks.',
  },
  {
    id: 'IN',
    name: 'India',
    atlasNames: ['India'],
    color: '#7FD3FF',
    note: 'Markets, train routes, and layered city memories.',
  },
  {
    id: 'ID',
    name: 'Indonesia',
    atlasNames: ['Indonesia'],
    color: '#B8E986',
    note: 'Island routes, temple visits, and beach journal pages.',
  },
  {
    id: 'EG',
    name: 'Egypt',
    atlasNames: ['Egypt'],
    color: '#F6A06D',
    note: 'Ancient sites, river views, and desert travel notes.',
  },
  {
    id: 'KE',
    name: 'Kenya',
    atlasNames: ['Kenya'],
    color: '#4ECFFF',
    note: 'Safari days, city stops, and wide-open landscapes.',
  },
  {
    id: 'CZ',
    name: 'Czechia',
    atlasNames: ['Czechia', 'Czech Rep.'],
    color: '#59D98E',
    note: 'Old-town walks, cafe stops, and train-friendly routes.',
  },
  {
    id: 'AT',
    name: 'Austria',
    atlasNames: ['Austria'],
    color: '#FF9F6B',
    note: 'Classical streets, mountain towns, and museum memories.',
  },
  {
    id: 'BE',
    name: 'Belgium',
    atlasNames: ['Belgium'],
    color: '#FFD166',
    note: 'Canal cities, chocolate stops, and compact day trips.',
  },
  {
    id: 'PH',
    name: 'Philippines',
    atlasNames: ['Philippines'],
    color: '#9B8CFF',
    note: 'Island hopping, family meals, and bright coastal stories.',
  },
  {
    id: 'TR',
    name: 'Turkey',
    atlasNames: ['Turkey'],
    color: '#4CD7D0',
    note: 'Bazaar lanes, ferry rides, and layered city history.',
  },
  {
    id: 'PL',
    name: 'Poland',
    atlasNames: ['Poland'],
    color: '#FF7FB0',
    note: 'Old squares, winter walks, and saved food notes.',
  },
  {
    id: 'UY',
    name: 'Uruguay',
    atlasNames: ['Uruguay'],
    color: '#67D6A3',
    note: 'Coastal towns, slow mornings, and relaxed city memories.',
  },
  {
    id: 'MY',
    name: 'Malaysia',
    atlasNames: ['Malaysia'],
    color: '#7FD3FF',
    note: 'Street food, skyline views, and tropical stopovers.',
  },
];

const demoVisitedCountryNames = [
  'France',
  'Japan',
  'Italy',
  'Portugal',
  'South Korea',
  'Singapore',
  'Iceland',
  'Netherlands',
  'Costa Rica',
  'Switzerland',
  'United Arab Emirates',
  'Canada',
  'Mexico',
  'Spain',
  'Germany',
  'Greece',
  'Ireland',
  'Denmark',
  'Norway',
  'Sweden',
  'Thailand',
  'Morocco',
  'South Africa',
  'Argentina',
  'Chile',
  'Peru',
  'Vietnam',
  'New Zealand',
  'United Kingdom',
];
const normalMapPosition = { coordinates: [0, 0] as [number, number], zoom: 1 };
const minMapZoom = 1;
const maxMapZoom = 3.5;
const mapZoomStep = 0.5;
const slantedGrid = [
  { d: 'M20 30 L740 30', opacity: 0.1 },
  { d: 'M20 60 L740 60', opacity: 0.08 },
  { d: 'M20 90 L740 90', opacity: 0.06 },
  { d: 'M20 120 L740 120', opacity: 0.05 },
  { d: 'M20 150 L740 150', opacity: 0.04 },
];
const mapVisitedPalette = [
  '#78DFFF',
  '#8BE7B1',
  '#FFB985',
  '#FFE08A',
  '#B8ADFF',
  '#82E2DC',
  '#FFA6CE',
  '#A6E889',
  '#F3C2FF',
  '#9DD6FF',
  '#FFD0A6',
  '#BDEEBF',
  '#FFC3A0',
  '#C5B9FF',
  '#90E6F0',
  '#F9A7B8',
];

type MapPosition = {
  coordinates: [number, number];
  zoom: number;
};

type VisitedCountrySort = 'name-asc' | 'name-desc' | 'recent';

function normalizeCountryName(countryName: string) {
  return countryName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getCountryName(geo: AtlasGeography) {
  const name = geo.properties?.name;
  return name ? String(name) : '';
}

function getTopologyCountryName(geometry: TopoGeometry) {
  const name = geometry.properties?.name;
  if (name) return String(name);

  if (geometry.id !== undefined && geometry.id !== null) {
    return String(geometry.id);
  }

  return '';
}

function addArcOwner(arcIndex: number, geometryIndex: number, arcOwners: Map<number, number[]>) {
  const normalizedArcIndex = arcIndex < 0 ? ~arcIndex : arcIndex;
  const owners = arcOwners.get(normalizedArcIndex);

  if (owners) {
    if (!owners.includes(geometryIndex)) owners.push(geometryIndex);
    return;
  }

  arcOwners.set(normalizedArcIndex, [geometryIndex]);
}

function collectArcOwners(arcs: TopoArcReference | undefined, geometryIndex: number, arcOwners: Map<number, number[]>) {
  if (arcs === undefined) return;

  if (typeof arcs === 'number') {
    addArcOwner(arcs, geometryIndex, arcOwners);
    return;
  }

  arcs.forEach((arc) => collectArcOwners(arc, geometryIndex, arcOwners));
}

function collectGeometryArcOwners(geometry: TopoGeometry, geometryIndex: number, arcOwners: Map<number, number[]>) {
  if (geometry.type === 'GeometryCollection') {
    geometry.geometries?.forEach((childGeometry) => collectGeometryArcOwners(childGeometry, geometryIndex, arcOwners));
    return;
  }

  collectArcOwners(geometry.arcs, geometryIndex, arcOwners);
}

function buildCountryNeighborNameMap(topology: Topology) {
  const collection = topology.objects[Object.keys(topology.objects)[0]];
  const geometries = collection?.geometries ?? [];
  const arcOwners = new Map<number, number[]>();
  const neighborSets = geometries.map(() => new Set<number>());

  geometries.forEach((geometry, geometryIndex) => {
    collectGeometryArcOwners(geometry, geometryIndex, arcOwners);
  });

  arcOwners.forEach((owners) => {
    for (let index = 0; index < owners.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < owners.length; nextIndex += 1) {
        neighborSets[owners[index]].add(owners[nextIndex]);
        neighborSets[owners[nextIndex]].add(owners[index]);
      }
    }
  });

  return Object.fromEntries(
    geometries
      .map((geometry, geometryIndex) => {
        const countryName = getTopologyCountryName(geometry);
        if (!countryName) return null;

        return [
          normalizeCountryName(countryName),
          Array.from(neighborSets[geometryIndex])
            .map((neighborIndex) => normalizeCountryName(getTopologyCountryName(geometries[neighborIndex])))
            .filter(Boolean),
        ] as const;
      })
      .filter((entry): entry is readonly [string, string[]] => entry !== null)
  );
}

function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}

function getFallbackVisitedColor(countryName: string) {
  const normalizedCountryName = normalizeCountryName(countryName);
  const colorIndex =
    Array.from(normalizedCountryName).reduce((total, character) => total + character.charCodeAt(0), normalizedCountryName.length) %
    mapVisitedPalette.length;

  return mapVisitedPalette[colorIndex];
}

function pickNeighborAwareColor({
  countryName,
  countryNeighborNames,
  countryColors,
  visitedCountryNames,
}: {
  countryName: string;
  countryNeighborNames: Record<string, string[]>;
  countryColors: Record<string, string>;
  visitedCountryNames: string[];
}) {
  const normalizedCountryName = normalizeCountryName(countryName);
  const visitedCountrySet = new Set(visitedCountryNames.map(normalizeCountryName));
  const blockedColors = new Set(
    (countryNeighborNames[normalizedCountryName] ?? [])
      .filter((neighborName) => visitedCountrySet.has(neighborName))
      .map((neighborName) => countryColors[neighborName])
      .filter(Boolean)
  );
  const availableColors = mapVisitedPalette.filter((color) => !blockedColors.has(color));
  const colorOptions = availableColors.length > 0 ? availableColors : mapVisitedPalette;
  const stableIndex =
    Array.from(normalizedCountryName).reduce((total, character) => total + character.charCodeAt(0), normalizedCountryName.length) %
    colorOptions.length;

  return colorOptions[stableIndex];
}

function clampMapZoom(zoom: number) {
  return Math.min(maxMapZoom, Math.max(minMapZoom, zoom));
}

export function LandingWorldMap() {
  const [visitedCountryNames, setVisitedCountryNames] = useState<string[]>(demoVisitedCountryNames);
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [selectedCountryName, setSelectedCountryName] = useState('France');
  const [mapPosition, setMapPosition] = useState<MapPosition>(normalMapPosition);
  const [atlasCountryCount, setAtlasCountryCount] = useState<number | null>(null);
  const [countryNeighborNames, setCountryNeighborNames] = useState<Record<string, string[]>>({});
  const [countryColors, setCountryColors] = useState<Record<string, string>>({});
  const [visitedCountrySearch, setVisitedCountrySearch] = useState('');
  const [visitedCountrySort, setVisitedCountrySort] = useState<VisitedCountrySort>('name-asc');

  const featuredCountryByAtlasName = useMemo(() => {
    const countryMap = new Map<string, FeaturedCountry>();

    featuredCountries.forEach((country, countryIndex) => {
      const displayCountry = {
        ...country,
        color: mapVisitedPalette[countryIndex % mapVisitedPalette.length] ?? country.color,
      };

      country.atlasNames.forEach((atlasName) => {
        countryMap.set(normalizeCountryName(atlasName), displayCountry);
      });
    });

    return countryMap;
  }, []);
  const curatedCountryColors = useMemo(
    () =>
      Object.fromEntries(
        featuredCountries.flatMap((country, countryIndex) =>
          country.atlasNames.map((atlasName) => [
            normalizeCountryName(atlasName),
            mapVisitedPalette[countryIndex % mapVisitedPalette.length] ?? country.color,
          ])
        )
      ),
    []
  );

  const visitedCountrySet = useMemo(() => new Set(visitedCountryNames), [visitedCountryNames]);
  const activeCountryName = hoveredCountryName ?? selectedCountryName;
  const activeFeaturedCountry = featuredCountryByAtlasName.get(normalizeCountryName(activeCountryName));
  const activeDisplayName = activeFeaturedCountry?.name ?? activeCountryName;
  const activeCountryIsVisited =
    activeFeaturedCountry?.atlasNames.some((name) => visitedCountrySet.has(name)) ?? visitedCountrySet.has(activeCountryName);
  const atlasRevealPercent =
    atlasCountryCount && atlasCountryCount > 0 ? Math.round((visitedCountryNames.length / atlasCountryCount) * 100) : null;
  const nextCountryOptions = featuredCountries.filter(
    (country) => !country.atlasNames.some((name) => visitedCountrySet.has(name))
  );
  const visibleVisitedCountries = useMemo(() => {
    const searchQuery = normalizeCountryName(visitedCountrySearch);
    const visitedCountries = visitedCountryNames.map((countryName, visitedIndex) => {
      const featuredCountry = featuredCountryByAtlasName.get(normalizeCountryName(countryName));

      return {
        id: featuredCountry?.id ?? countryName,
        name: featuredCountry?.name ?? countryName,
        color: featuredCountry?.color ?? countryColors[normalizeCountryName(countryName)] ?? getFallbackVisitedColor(countryName),
        flag: featuredCountry ? getFlagEmoji(featuredCountry.id) : null,
        initials: (featuredCountry?.name ?? countryName)
          .match(/[A-Za-z]+/g)
          ?.slice(0, 2)
          .map((word) => word[0])
          .join('')
          .toUpperCase() ?? countryName.slice(0, 2).toUpperCase(),
        atlasName: featuredCountry?.atlasNames[0] ?? countryName,
        visitedIndex,
      };
    });
    const filteredCountries = searchQuery
      ? visitedCountries.filter((country) => normalizeCountryName(`${country.name} ${country.id}`).includes(searchQuery))
      : visitedCountries;

    return [...filteredCountries].sort((firstCountry, secondCountry) => {
      if (visitedCountrySort === 'recent') {
        return secondCountry.visitedIndex - firstCountry.visitedIndex;
      }

      const nameComparison = firstCountry.name.localeCompare(secondCountry.name, undefined, { sensitivity: 'base' });
      return visitedCountrySort === 'name-desc' ? -nameComparison : nameComparison;
    });
  }, [countryColors, featuredCountryByAtlasName, visitedCountryNames, visitedCountrySearch, visitedCountrySort]);
  const visitedCountryCountLabel = visitedCountrySearch.trim()
    ? `${visibleVisitedCountries.length}/${visitedCountryNames.length}`
    : visitedCountryNames.length;
  const isMinZoom = mapPosition.zoom <= minMapZoom;
  const isMaxZoom = mapPosition.zoom >= maxMapZoom;
  const isNormalMapView =
    mapPosition.zoom === normalMapPosition.zoom &&
    mapPosition.coordinates[0] === normalMapPosition.coordinates[0] &&
    mapPosition.coordinates[1] === normalMapPosition.coordinates[1];

  useEffect(() => {
    let isMounted = true;

    const loadAtlasCountryCount = async () => {
      try {
        const response = await fetch(geoUrl);
        if (!response.ok) return;

        const topology = (await response.json()) as Topology;
        const collection = topology.objects[Object.keys(topology.objects)[0]];

        if (isMounted && collection?.geometries?.length) {
          setAtlasCountryCount(collection.geometries.length);
          setCountryNeighborNames(buildCountryNeighborNameMap(topology));
        }
      } catch {
        if (isMounted) {
          setAtlasCountryCount(null);
        }
      }
    };

    void loadAtlasCountryCount();

    return () => {
      isMounted = false;
    };
  }, []);

  function toggleCountry(countryName: string) {
    if (!countryName) return;

    setSelectedCountryName(countryName);
    setVisitedCountryNames((currentCountryNames) => {
      if (currentCountryNames.includes(countryName)) {
        return currentCountryNames.filter((currentCountryName) => currentCountryName !== countryName);
      }

      const featuredCountry = featuredCountryByAtlasName.get(normalizeCountryName(countryName));

      if (!featuredCountry) {
        setCountryColors((currentColors) => {
          const normalizedCountryName = normalizeCountryName(countryName);
          if (currentColors[normalizedCountryName]) return currentColors;

          return {
            ...currentColors,
            [normalizedCountryName]: pickNeighborAwareColor({
              countryName,
              countryNeighborNames,
              countryColors: { ...curatedCountryColors, ...currentColors },
              visitedCountryNames: currentCountryNames,
            }),
          };
        });
      }

      return [...currentCountryNames, countryName];
    });
  }

  function getVisitedColor(countryName: string) {
    const normalizedCountryName = normalizeCountryName(countryName);
    const featuredCountry = featuredCountryByAtlasName.get(normalizedCountryName);
    return featuredCountry?.color ?? countryColors[normalizedCountryName] ?? getFallbackVisitedColor(countryName);
  }

  function handleZoomIn() {
    setMapPosition((currentPosition) => ({
      ...currentPosition,
      zoom: clampMapZoom(currentPosition.zoom + mapZoomStep),
    }));
  }

  function handleZoomOut() {
    setMapPosition((currentPosition) => ({
      ...currentPosition,
      zoom: clampMapZoom(currentPosition.zoom - mapZoomStep),
    }));
  }

  function handleResetView() {
    setMapPosition(normalMapPosition);
  }

  function handleMapMoveEnd(nextPosition: MapPosition) {
    setMapPosition({
      coordinates: nextPosition.coordinates,
      zoom: clampMapZoom(nextPosition.zoom),
    });
  }

  return (
    <div
      id="showcase"
      className="rounded-[2rem] border border-ink/10 bg-cream p-4 text-left shadow-soft"
      aria-label="Interactive world map demo"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.36em] text-gold/70">World Atlas</p>
          <h2 className="text-2xl font-semibold text-ink">Scratch the globe, then explore the story.</h2>
          <div className="mt-3 max-w-md rounded-2xl border border-gold/30 bg-white/80 p-3 text-ink shadow-sm-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-gold/80">Atlas reveal</p>
                <p className="mt-1 text-sm font-medium text-ink/65">
                  {atlasCountryCount
                    ? `${visitedCountryNames.length} demo countries out of the full atlas.`
                    : 'Loading atlas coverage.'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-serif text-3xl font-semibold text-ink">
                  {atlasRevealPercent === null ? '--' : `${atlasRevealPercent}%`}
                </p>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/45">revealed</p>
              </div>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-gold/10 bg-cream">
              <div className="h-full rounded-full bg-gold" style={{ width: `${atlasRevealPercent ?? 0}%` }} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:mt-14 sm:items-end">
          <div className="rounded-full border border-ink/15 bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.22em] text-ink/75">
            {hoveredCountryName ?? 'Hover a country to reveal the atlas flow'}
          </div>
          <div aria-label="Map legend" className="flex flex-wrap gap-2 sm:justify-end">
            <div className="inline-flex items-center gap-2 rounded-xl border border-gold/15 bg-white/70 px-3 py-2 text-sm font-medium text-ink shadow-sm-soft">
              <span className="flex -space-x-1">
                <span className="h-4 w-4 rounded-full border border-white bg-[#4ECFFF]" />
                <span className="h-4 w-4 rounded-full border border-white bg-[#59D98E]" />
                <span className="h-4 w-4 rounded-full border border-white bg-[#FFD166]" />
              </span>
              <span>Visited</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-gold/15 bg-white/70 px-3 py-2 text-sm font-medium text-ink shadow-sm-soft">
              <span className="h-4 w-4 rounded-full border border-[#7C6A46]/60 bg-[#E6D5B8]" />
              <span>Not visited</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-gold/45 bg-[#F6ECD7] p-4">
          <div className="absolute inset-0 overflow-hidden rounded-[1.5rem]">
            <svg viewBox="0 0 760 380" className="h-full w-full">
              {slantedGrid.map((line, index) => (
                <path key={index} d={line.d} stroke="#8B6B3F" strokeWidth="1" opacity={line.opacity} />
              ))}
            </svg>
          </div>

          <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-12rem)] truncate rounded-full border border-ink/15 bg-white/80 px-4 py-2 text-sm font-semibold text-ink shadow-soft backdrop-blur-sm">
            {activeDisplayName || 'Choose a country'}
          </div>
          <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-xl border border-ink/5 bg-white/25 p-1 shadow-soft backdrop-blur-sm">
            <button
              type="button"
              aria-label="Zoom out"
              title="Zoom out"
              onClick={handleZoomOut}
              disabled={isMinZoom}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-lg font-semibold text-ink transition hover:bg-cream/70 focus:outline-none focus:ring-2 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              -
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              onClick={handleZoomIn}
              disabled={isMaxZoom}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-lg font-semibold text-ink transition hover:bg-cream/70 focus:outline-none focus:ring-2 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
            <button
              type="button"
              aria-label="Reset map view"
              title="Reset map view"
              onClick={handleResetView}
              disabled={isNormalMapView}
              className="flex h-9 min-w-16 items-center justify-center rounded-lg bg-white/20 px-3 text-sm font-semibold text-ink transition hover:bg-cream/70 focus:outline-none focus:ring-2 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>

          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 152, center: [0, 0] }}
            width={760}
            height={380}
            className="relative h-[390px] w-full rounded-[1.5rem] bg-[#F4E6CC] sm:h-[470px] lg:h-[600px] xl:h-[640px]"
          >
            <ZoomableGroup
              center={mapPosition.coordinates}
              zoom={mapPosition.zoom}
              minZoom={minMapZoom}
              maxZoom={maxMapZoom}
              onMoveEnd={handleMapMoveEnd}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) => {
                  const atlasGeographies = geographies as AtlasGeography[];

                  return atlasGeographies.map((geo) => {
                    const countryName = getCountryName(geo);
                    const featuredCountry = countryName
                      ? featuredCountryByAtlasName.get(normalizeCountryName(countryName))
                      : undefined;
                    const isVisited = countryName ? visitedCountrySet.has(countryName) : false;
                    const isActive = activeCountryName === countryName;
                    const fillColor = isVisited ? getVisitedColor(countryName) : '#E6D5B8';

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        role="button"
                        tabIndex={0}
                        aria-label={`${countryName || 'Country'} ${isVisited ? 'visited' : 'not visited'}`}
                        fill={fillColor}
                        stroke={isActive ? '#3D2B0E' : '#9D7B4A'}
                        strokeWidth={isActive ? 0.85 : 0.35}
                        onMouseEnter={() => countryName && setHoveredCountryName(countryName)}
                        onMouseLeave={() => setHoveredCountryName(null)}
                        onFocus={() => countryName && setHoveredCountryName(countryName)}
                        onBlur={() => setHoveredCountryName(null)}
                        onClick={() => toggleCountry(countryName)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleCountry(countryName);
                          }
                        }}
                        style={{
                          default: {
                            outline: 'none',
                            transition: 'fill 220ms ease, stroke 220ms ease, stroke-width 220ms ease',
                          },
                          hover: {
                            fill: isVisited ? fillColor : featuredCountry?.color ?? '#DCC9A8',
                            cursor: countryName ? 'pointer' : 'default',
                            outline: 'none',
                          },
                          pressed: {
                            fill: isVisited ? fillColor : '#D6C19D',
                            outline: 'none',
                          },
                        }}
                      />
                    );
                  });
                }}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>

        <aside className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-gold/25 bg-white p-4 shadow-sm-soft">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Country Explorer</p>
              <h3 className="mt-1 font-serif text-2xl font-bold leading-tight text-ink">{activeDisplayName}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/68">
                {activeCountryIsVisited
                  ? activeFeaturedCountry?.note ?? 'This country is colored into the demo atlas.'
                  : 'Click the country on the atlas to color it in and preview the explorer flow.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gold/25 bg-white p-4 shadow-sm-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Quick Actions</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">Try a visit</h3>
              </div>
              <span className="rounded-lg border border-gold/20 bg-cream px-2.5 py-1 text-xs font-semibold text-ink/65">
                Demo
              </span>
            </div>
            <div className="space-y-2">
              {nextCountryOptions.length > 0 ? (
                nextCountryOptions.slice(0, 4).map((country) => (
                  <button
                    key={country.id}
                    type="button"
                    onClick={() => toggleCountry(country.atlasNames[0])}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-gold/20 bg-cream/60 px-3 py-2 text-left transition hover:border-gold hover:bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-white text-xl"
                        aria-hidden="true"
                      >
                        {getFlagEmoji(country.id)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{country.name}</span>
                        <span className="block text-xs text-ink/55">Recommended next visit.</span>
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-gold-deep">Visit</span>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gold/30 bg-cream/60 px-3 py-3 text-sm text-ink/60">
                  Every demo country is marked visited.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-4 rounded-2xl border border-gold/25 bg-white p-4 shadow-sm-soft">
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-ink">Visited Countries</h3>
            <span className="rounded-full border border-gold/35 bg-white px-4 py-1.5 text-sm font-semibold text-ink shadow-sm-soft">
              {visitedCountryCountLabel}
            </span>
          </div>
          <p className="text-sm text-ink/60">Click a country flag or name to focus it on the demo atlas.</p>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <input
              id="landing-visited-country-search"
              aria-label="Search visited countries"
              placeholder="Search countries"
              value={visitedCountrySearch}
              onChange={(event) => setVisitedCountrySearch(event.target.value)}
              className="h-10 rounded-lg border-2 border-gold/30 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/45 focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
            <div>
              <label htmlFor="landing-visited-country-sort" className="sr-only">
                Sort visited countries
              </label>
              <select
                id="landing-visited-country-sort"
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
        </div>
        {visibleVisitedCountries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gold/30 bg-cream/60 p-4 text-sm text-ink/60">
            No visited countries match that search.
          </div>
        ) : (
          <div className="max-h-[26rem] overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {visibleVisitedCountries.map((country) => (
                <button
                  key={country.id}
                  type="button"
                  aria-label={`Focus ${country.name}`}
                  onClick={() => setSelectedCountryName(country.atlasName)}
                  className="group flex min-w-0 items-center gap-2 rounded-2xl border border-gold/15 bg-cream/70 p-2 text-left transition hover:border-gold/40 hover:bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-white text-lg shadow-sm">
                    {country.flag ?? <span className="text-xs font-semibold text-ink/65">{country.initials}</span>}
                    <span
                      className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-white"
                      style={{ backgroundColor: country.color }}
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{country.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
