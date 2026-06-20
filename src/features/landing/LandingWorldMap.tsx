// Public landing-page world map preview.
// This is intentionally separate from the authenticated map store so the home
// page can show an interactive demo without loading user state.
'use client';

import { useMemo, useState } from 'react';
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
];

const demoVisitedCountryNames = ['France', 'Japan', 'Italy'];
const normalMapPosition = { coordinates: [0, 0] as [number, number], zoom: 1 };
const minMapZoom = 1;
const maxMapZoom = 3.5;
const mapZoomStep = 0.5;

type MapPosition = {
  coordinates: [number, number];
  zoom: number;
};

function normalizeCountryName(countryName: string) {
  return countryName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getCountryName(geo: AtlasGeography) {
  const name = geo.properties?.name;
  return name ? String(name) : '';
}

function clampMapZoom(zoom: number) {
  return Math.min(maxMapZoom, Math.max(minMapZoom, zoom));
}

export function LandingWorldMap() {
  const [visitedCountryNames, setVisitedCountryNames] = useState<string[]>(demoVisitedCountryNames);
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [selectedCountryName, setSelectedCountryName] = useState('France');
  const [mapPosition, setMapPosition] = useState<MapPosition>(normalMapPosition);

  const featuredCountryByAtlasName = useMemo(() => {
    const countryMap = new Map<string, FeaturedCountry>();

    featuredCountries.forEach((country) => {
      country.atlasNames.forEach((atlasName) => {
        countryMap.set(normalizeCountryName(atlasName), country);
      });
    });

    return countryMap;
  }, []);

  const visitedCountrySet = useMemo(() => new Set(visitedCountryNames), [visitedCountryNames]);
  const activeCountryName = hoveredCountryName ?? selectedCountryName;
  const activeFeaturedCountry = featuredCountryByAtlasName.get(normalizeCountryName(activeCountryName));
  const activeDisplayName = activeFeaturedCountry?.name ?? activeCountryName;
  const activeCountryIsVisited =
    activeFeaturedCountry?.atlasNames.some((name) => visitedCountrySet.has(name)) ?? visitedCountrySet.has(activeCountryName);
  const isMinZoom = mapPosition.zoom <= minMapZoom;
  const isMaxZoom = mapPosition.zoom >= maxMapZoom;
  const isNormalMapView =
    mapPosition.zoom === normalMapPosition.zoom &&
    mapPosition.coordinates[0] === normalMapPosition.coordinates[0] &&
    mapPosition.coordinates[1] === normalMapPosition.coordinates[1];

  function toggleCountry(countryName: string) {
    if (!countryName) return;

    setSelectedCountryName(countryName);
    setVisitedCountryNames((currentCountryNames) =>
      currentCountryNames.includes(countryName)
        ? currentCountryNames.filter((currentCountryName) => currentCountryName !== countryName)
        : [...currentCountryNames, countryName]
    );
  }

  function getVisitedColor(countryName: string) {
    const featuredCountry = featuredCountryByAtlasName.get(normalizeCountryName(countryName));
    return featuredCountry?.color ?? '#4ECFFF';
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
      className="overflow-hidden rounded-lg border border-ink/10 bg-cream shadow-lg-soft"
      aria-label="Interactive world map demo"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="relative min-h-[24rem] overflow-hidden bg-[#F6ECD7]">
          <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-6">
            <div>
              <div className="inline-flex rounded-full border border-white/70 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/70 shadow-soft">
                World Atlas
              </div>
              <div className="mt-2 rounded-full border border-ink/10 bg-white/85 px-4 py-2 text-sm font-semibold text-ink shadow-soft">
                {hoveredCountryName ?? 'Hover a country'}
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-ink/10 bg-white/80 p-1 shadow-soft backdrop-blur-sm">
              <button
                type="button"
                aria-label="Zoom out"
                title="Zoom out"
                onClick={handleZoomOut}
                disabled={isMinZoom}
                className="flex h-9 w-9 items-center justify-center rounded-md text-lg font-semibold text-ink transition hover:bg-cream focus:outline-none focus:ring-2 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                -
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                title="Zoom in"
                onClick={handleZoomIn}
                disabled={isMaxZoom}
                className="flex h-9 w-9 items-center justify-center rounded-md text-lg font-semibold text-ink transition hover:bg-cream focus:outline-none focus:ring-2 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
              <button
                type="button"
                aria-label="Reset map view"
                title="Reset map view"
                onClick={handleResetView}
                disabled={isNormalMapView}
                className="flex h-9 min-w-14 items-center justify-center rounded-md px-3 text-sm font-semibold text-ink transition hover:bg-cream focus:outline-none focus:ring-2 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset
              </button>
            </div>
          </div>

          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 142, center: [0, 2] }}
            width={760}
            height={410}
            className="h-full min-h-[24rem] w-full bg-[#F6ECD7]"
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

          <div className="absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-white/50 bg-white/85 p-3 shadow-soft backdrop-blur-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">Visited</span>
            {visitedCountryNames.length > 0 ? (
              visitedCountryNames.map((countryName) => {
                const featuredCountry = featuredCountryByAtlasName.get(normalizeCountryName(countryName));
                return (
                  <button
                    key={countryName}
                    type="button"
                    onClick={() => setSelectedCountryName(countryName)}
                    className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-cream px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-gold focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: featuredCountry?.color ?? '#4ECFFF' }}
                    />
                    {featuredCountry?.id ?? countryName.slice(0, 2).toUpperCase()}
                  </button>
                );
              })
            ) : (
              <span className="text-sm text-ink/65">Click a country to start the demo atlas.</span>
            )}
          </div>
        </div>

        <aside className="flex min-h-full flex-col justify-between gap-6 border-t border-gold/20 bg-[#FFF8E8] p-5 lg:border-l lg:border-t-0">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-gold-deep/75">Country Explorer</p>
            <h2 className="font-serif text-2xl font-bold leading-tight text-ink">{activeDisplayName}</h2>
            <p className="mt-3 text-base leading-relaxed text-ink/70">
              {activeCountryIsVisited
                ? activeFeaturedCountry?.note ?? 'This country is colored into the demo atlas.'
                : 'Click the country on the atlas to color it in and preview the explorer flow.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {featuredCountries.slice(0, 6).map((country) => {
              const isVisited = country.atlasNames.some((name) => visitedCountrySet.has(name));
              return (
                <button
                  key={country.id}
                  type="button"
                  onClick={() => toggleCountry(country.atlasNames[0])}
                  className="rounded-lg border border-gold/25 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-gold hover:bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
                  style={{ boxShadow: isVisited ? `inset 0 -3px 0 ${country.color}` : undefined }}
                >
                  {country.id}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
