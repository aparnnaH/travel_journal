'use client';

import React, { useEffect, useState } from 'react';
import type { ExtendedFeature } from 'd3-geo';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { placeholderCountries } from '@/lib/placeholderData';

interface WorldAtlasProps {
  visitedCountries: string[];
  countryColors: Record<string, string>;
  onToggleCountry: (countryId: string, countryName?: string, neighboringCountryIds?: string[]) => void;
  onSelectCountry: (countryId: string) => void;
  onCountryNeighborsReady?: (countryNeighborIds: Record<string, string[]>) => void;
}

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const trackedCountryIds = new Set(placeholderCountries.map((country) => country.id));

const markerCoordinates: Record<string, [number, number]> = {
  US: [-95.7129, 37.0902],
  FR: [2.2137, 46.2276],
  JP: [138.2529, 36.2048],
  BR: [-51.9253, -14.2350],
  IT: [12.5674, 41.8719],
  AU: [134.491, -25.734],
};

const slantedGrid = [
  { d: 'M20 30 L740 30', opacity: 0.1 },
  { d: 'M20 60 L740 60', opacity: 0.08 },
  { d: 'M20 90 L740 90', opacity: 0.06 },
  { d: 'M20 120 L740 120', opacity: 0.05 },
  { d: 'M20 150 L740 150', opacity: 0.04 },
];

type AtlasGeography = ExtendedFeature & {
  rsmKey: string;
  svgPath?: string;
  id?: string | number;
  properties: {
    ISO_A2?: unknown;
    iso_a2?: unknown;
    ISO_A3?: unknown;
    name?: unknown;
  } | null;
};

type TopoArcReference = number | TopoArcReference[];

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

function getCountryIso(geo: AtlasGeography) {
  const iso = geo.properties?.ISO_A2 || geo.properties?.iso_a2 || geo.properties?.ISO_A3;
  if (iso) return String(iso).toUpperCase();
  if (geo.id !== undefined && geo.id !== null) return String(geo.id).toUpperCase();
  const name = geo.properties?.name;
  if (name) return String(name).toUpperCase();
  return '';
}

function getCountryName(geo: AtlasGeography) {
  const name = geo.properties?.name;
  return name ? String(name) : undefined;
}

function getTopologyCountryId(geometry: TopoGeometry) {
  if (geometry.id !== undefined && geometry.id !== null) return String(geometry.id).toUpperCase();
  const name = geometry.properties?.name;
  return name ? String(name).toUpperCase() : '';
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

function buildCountryNeighborMap(topology: Topology) {
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
    geometries.map((geometry, geometryIndex) => [
      getTopologyCountryId(geometry),
      Array.from(neighborSets[geometryIndex])
        .map((neighborIndex) => getTopologyCountryId(geometries[neighborIndex]))
        .filter(Boolean),
    ])
  );
}

export default function WorldAtlas({
  visitedCountries,
  countryColors,
  onToggleCountry,
  onSelectCountry,
  onCountryNeighborsReady,
}: WorldAtlasProps) {
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null);
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [animatingCountry, setAnimatingCountry] = useState<string | null>(null);
  const [countryNeighborIds, setCountryNeighborIds] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let isMounted = true;

    const loadCountryNeighbors = async () => {
      try {
        const response = await fetch(geoUrl);
        if (!response.ok) return;

        const topology = (await response.json()) as Topology;
        const neighborMap = buildCountryNeighborMap(topology);
        if (isMounted) {
          setCountryNeighborIds(neighborMap);
          onCountryNeighborsReady?.(neighborMap);
        }
      } catch {
        if (isMounted) setCountryNeighborIds({});
      }
    };

    loadCountryNeighbors();

    return () => {
      isMounted = false;
    };
  }, [onCountryNeighborsReady]);

  function handleCountryToggle(id: string, countryName?: string) {
    setAnimatingCountry(id);
    onToggleCountry(id, countryName, countryNeighborIds[id] ?? []);
    window.setTimeout(() => setAnimatingCountry(null), 900);
  }

  function clearHoveredCountry() {
    setHoveredCountryId(null);
    setHoveredCountryName(null);
  }

  return (
    <div className="rounded-[2rem] border border-ink/10 bg-cream p-4 shadow-soft">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.36em] text-gold/70">World Atlas</p>
          <h2 className="text-2xl font-semibold text-ink">Scratch the globe, then explore the story.</h2>
        </div>
        <div className="rounded-full border border-ink/15 bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.22em] text-ink/75">
          {hoveredCountryName ?? 'Hover a country to reveal the atlas flow'}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[1.75rem] border border-gold/45 bg-[#F6ECD7] p-4">
        <div className="absolute inset-0 overflow-hidden rounded-[1.5rem]">
          <svg viewBox="0 0 760 380" className="h-full w-full">
            {slantedGrid.map((line, index) => (
              <path key={index} d={line.d} stroke="#8B6B3F" strokeWidth="1" opacity={line.opacity} />
            ))}
          </svg>
        </div>

        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 150, center: [0, 15] }}
          width={760}
          height={380}
          className="relative h-[380px] w-full rounded-[1.5rem] bg-[#F4E6CC]"
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) => {
              const atlasGeographies = geographies as AtlasGeography[];

              return (
                <>
                  {atlasGeographies.map((geo) => {
                    const iso = getCountryIso(geo);
                    const isTracked = trackedCountryIds.has(iso);
                    const isVisited = visitedCountries.includes(iso);
                    const visitedColor = countryColors[iso] ?? '#4ECFFF';
                    const countryName = getCountryName(geo);

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={isVisited ? visitedColor : '#E6D5B8'}
                        stroke="#9D7B4A"
                        strokeWidth={0.35}
                        onMouseEnter={() => {
                          setHoveredCountryId(isTracked ? iso : null);
                          setHoveredCountryName(countryName ?? (iso || null));
                        }}
                        onMouseLeave={clearHoveredCountry}
                        onClick={() => {
                          if (iso) handleCountryToggle(iso, countryName);
                        }}
                        style={{
                          default: { outline: 'none', transition: 'fill 450ms ease' },
                          hover: { fill: isVisited ? visitedColor : '#DCC9A8', cursor: iso ? 'pointer' : 'default' },
                          pressed: { fill: isVisited ? visitedColor : '#D6C19D', outline: 'none' },
                        }}
                      />
                    );
                  })}

                  {placeholderCountries.map((country) => {
                    const coordinates = markerCoordinates[country.id];
                    if (!coordinates) return null;
                    const isVisited = visitedCountries.includes(country.id);
                    const isHovered = hoveredCountryId === country.id;
                    const isAnimating = animatingCountry === country.id;
                    const markerColor = countryColors[country.id] ?? '#4ECFFF';

                    return (
                      <Marker key={country.id} coordinates={coordinates}>
                        <g
                          data-marker-id={country.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectCountry(country.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onSelectCountry(country.id);
                            }
                          }}
                          onMouseEnter={() => {
                            setHoveredCountryId(country.id);
                            setHoveredCountryName(country.name);
                          }}
                          onMouseLeave={clearHoveredCountry}
                          className="cursor-pointer"
                          transform={isAnimating ? 'scale(1.18)' : 'scale(1)'}
                          style={{ transition: 'transform 350ms ease' }}
                        >
                          <circle cx="0" cy="0" r={isHovered ? 14 : 12} fill={isVisited ? markerColor : '#F7F1DE'} stroke="#7C6A46" strokeWidth="2" />
                          <circle cx="0" cy="0" r={isHovered ? 20 : 18} fill="none" stroke="#7C6A46" strokeWidth="1" opacity="0.3" />
                          <text
                            x="0"
                            y="4"
                            textAnchor="middle"
                            fontFamily="Playfair Display, serif"
                            fontSize="10"
                            fill="#3D2B0E"
                          >
                            {country.code}
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

        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-3xl border border-ink/10 bg-white/75 px-4 py-3 text-xs text-ink/70 shadow-inner">
          Click a country to mark it visited with a random color, then click a marker to open the city explorer.
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3 rounded-3xl border border-ink/10 bg-white p-4 text-ink/80">
          <p className="text-sm uppercase tracking-[0.26em] text-gold/70">Legend</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#4ECFFF]" />
              <span>Visited country</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#F7F1DE] border border-[#7C6A46]" />
              <span>Locked country</span>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-ink/10 bg-white p-4 text-ink/80">
          <p className="text-sm uppercase tracking-[0.26em] text-gold/70">Action</p>
          <p className="text-sm">Click a country geography to assign a random visited color. Click a marker to open the detailed country explorer.</p>
        </div>
      </div>
    </div>
  );
}
