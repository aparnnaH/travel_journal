'use client';

import { useMemo, useState } from 'react';
import type { ExtendedFeature } from 'd3-geo';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

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
  coordinates: [number, number];
  color: string;
};

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const featuredCountries: FeaturedCountry[] = [
  {
    id: 'US',
    name: 'United States',
    atlasNames: ['United States of America', 'United States'],
    coordinates: [-95.7129, 37.0902],
    color: '#4ECFFF',
  },
  {
    id: 'FR',
    name: 'France',
    atlasNames: ['France'],
    coordinates: [2.2137, 46.2276],
    color: '#59D98E',
  },
  {
    id: 'JP',
    name: 'Japan',
    atlasNames: ['Japan'],
    coordinates: [138.2529, 36.2048],
    color: '#FF9F6B',
  },
  {
    id: 'BR',
    name: 'Brazil',
    atlasNames: ['Brazil'],
    coordinates: [-51.9253, -14.235],
    color: '#FFD166',
  },
  {
    id: 'IT',
    name: 'Italy',
    atlasNames: ['Italy'],
    coordinates: [12.5674, 41.8719],
    color: '#9B8CFF',
  },
  {
    id: 'AU',
    name: 'Australia',
    atlasNames: ['Australia'],
    coordinates: [134.491, -25.734],
    color: '#4CD7D0',
  },
];

const countryPalette = ['#4ECFFF', '#59D98E', '#FF9F6B', '#FFD166', '#9B8CFF', '#4CD7D0', '#FF7FB0'];

function normalizeCountryName(countryName: string) {
  return countryName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getCountryName(geo: AtlasGeography) {
  const name = geo.properties?.name;
  return name ? String(name) : '';
}

function getCountryColor(countryName: string) {
  const normalizedName = normalizeCountryName(countryName);
  const charTotal = Array.from(normalizedName).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return countryPalette[charTotal % countryPalette.length];
}

export function LandingWorldMap() {
  const [visitedCountryNames, setVisitedCountryNames] = useState<string[]>(['France', 'Japan', 'Italy']);
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [selectedCountryName, setSelectedCountryName] = useState('France');

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
  const activeCountryIsVisited = visitedCountrySet.has(activeCountryName);

  function toggleCountry(countryName: string) {
    if (!countryName) return;

    setSelectedCountryName(countryName);
    setVisitedCountryNames((currentCountryNames) =>
      currentCountryNames.includes(countryName)
        ? currentCountryNames.filter((currentCountryName) => currentCountryName !== countryName)
        : [...currentCountryNames, countryName]
    );
  }

  return (
    <div
      id="showcase"
      className="overflow-hidden rounded-3xl border border-gold/25 bg-white shadow-lg-soft"
      aria-label="Interactive world map demo"
    >
      <div className="grid gap-0 lg:grid-cols-[1fr_17rem]">
        <div className="relative min-h-[20rem] bg-[#DCEDEA]">
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="rounded-full border border-white/70 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/70 shadow-soft">
              Live atlas
            </div>
            <div className="rounded-full border border-ink/10 bg-white/85 px-4 py-2 text-sm font-semibold text-ink shadow-soft">
              {visitedCountryNames.length} stamped
            </div>
          </div>

          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 150, center: [0, 14] }}
            width={760}
            height={410}
            className="h-full min-h-[20rem] w-full"
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) => {
                const atlasGeographies = geographies as AtlasGeography[];

                return (
                  <>
                    {atlasGeographies.map((geo) => {
                      const countryName = getCountryName(geo);
                      const isVisited = visitedCountrySet.has(countryName);
                      const isActive = activeCountryName === countryName;
                      const fillColor = isVisited ? getCountryColor(countryName) : '#E6D5B8';

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          role="button"
                          tabIndex={0}
                          aria-label={`${countryName || 'Country'} ${isVisited ? 'stamped' : 'unstamped'}`}
                          fill={fillColor}
                          stroke={isActive ? '#3D2B0E' : '#8B6B3F'}
                          strokeWidth={isActive ? 0.9 : 0.35}
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
                              fill: isVisited ? fillColor : '#D8C19C',
                              cursor: countryName ? 'pointer' : 'default',
                              outline: 'none',
                            },
                            pressed: {
                              fill: isVisited ? fillColor : '#CBAF7B',
                              outline: 'none',
                            },
                          }}
                        />
                      );
                    })}

                    {featuredCountries.map((country) => {
                      const atlasName = country.atlasNames[0];
                      const isVisited = country.atlasNames.some((name) => visitedCountrySet.has(name));
                      const isActive = activeFeaturedCountry?.id === country.id;

                      return (
                        <Marker key={country.id} coordinates={country.coordinates}>
                          <g
                            role="button"
                            tabIndex={0}
                            aria-label={`${country.name} marker`}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredCountryName(atlasName)}
                            onMouseLeave={() => setHoveredCountryName(null)}
                            onFocus={() => setHoveredCountryName(atlasName)}
                            onBlur={() => setHoveredCountryName(null)}
                            onClick={() => toggleCountry(atlasName)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                toggleCountry(atlasName);
                              }
                            }}
                            style={{ transition: 'transform 220ms ease' }}
                            transform={isActive ? 'scale(1.16)' : 'scale(1)'}
                          >
                            <circle
                              r={isActive ? 14 : 12}
                              fill={isVisited ? country.color : '#FFF8E8'}
                              stroke="#3D2B0E"
                              strokeWidth="1.8"
                            />
                            <circle r={isActive ? 22 : 18} fill="none" stroke="#3D2B0E" strokeWidth="1" opacity="0.24" />
                            <text
                              y="4"
                              textAnchor="middle"
                              fontFamily="Playfair Display, serif"
                              fontSize="9"
                              fontWeight="700"
                              fill="#3D2B0E"
                            >
                              {country.id}
                            </text>
                          </g>
                        </Marker>
                      );
                    })}
                  </>
                );
              }}
            </Geographies>
          </ComposableMap>
        </div>

        <aside className="flex min-h-full flex-col justify-between gap-6 border-t border-gold/20 bg-[#FFF8E8] p-5 lg:border-l lg:border-t-0">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-gold-deep/75">Selected</p>
            <h2 className="font-serif text-3xl font-bold leading-tight text-ink">{activeDisplayName}</h2>
            <p className="mt-3 text-base leading-relaxed text-ink/70">
              {activeCountryIsVisited
                ? 'A stamp is glowing here in your demo atlas.'
                : 'This destination is ready for its first stamp.'}
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
                  className="rounded-2xl border border-gold/25 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-gold hover:bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
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
