// Interactive world atlas renderer.
// This component draws the TopoJSON map, reports country metadata/neighbor
// relationships to the page, and owns map-specific hover/click/zoom behavior.
'use client';

import React, { useEffect, useState } from 'react';
import type { ExtendedFeature } from 'd3-geo';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';

interface WorldAtlasProps {
  visitedCountries: string[];
  countryColors: Record<string, string>;
  onToggleCountry: (countryId: string, countryName?: string, neighboringCountryIds?: string[]) => void;
  onCountryNeighborsReady?: (countryNeighborIds: Record<string, string[]>) => void;
  onAtlasCountriesReady?: (countries: AtlasCountryReference[]) => void;
  atlasSummary?: React.ReactNode;
}

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const normalMapPosition = { coordinates: [0, 0] as [number, number], zoom: 1 };
const minMapZoom = 1;
const maxMapZoom = 4;
const mapZoomStep = 0.5;

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

export interface AtlasCountryReference {
  id: string;
  name: string;
}

type MapPosition = {
  coordinates: [number, number];
  zoom: number;
};

// Extracts a stable id from react-simple-maps geography objects.
function getCountryIso(geo: AtlasGeography) {
  const iso = geo.properties?.ISO_A2 || geo.properties?.iso_a2 || geo.properties?.ISO_A3;
  if (iso) return String(iso).toUpperCase();
  if (geo.id !== undefined && geo.id !== null) return String(geo.id).toUpperCase();
  const name = geo.properties?.name;
  if (name) return String(name).toUpperCase();
  return '';
}

// Reads the display name from geography properties with an id fallback.
function getCountryName(geo: AtlasGeography) {
  const name = geo.properties?.name;
  return name ? String(name) : undefined;
}

function getTopologyCountryId(geometry: TopoGeometry) {
  if (geometry.id !== undefined && geometry.id !== null) return String(geometry.id).toUpperCase();
  const name = geometry.properties?.name;
  return name ? String(name).toUpperCase() : '';
}

function getTopologyCountryName(geometry: TopoGeometry) {
  const name = geometry.properties?.name;
  return name ? String(name) : undefined;
}

// TopoJSON arcs are shared by neighboring countries; this records which
// geometries own each arc.
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

// Builds adjacency data from shared TopoJSON arcs so page-level color logic can
// avoid giving neighboring visited countries the same color.
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

// Converts TopoJSON geometries into the lightweight references the page needs.
function buildAtlasCountries(topology: Topology): AtlasCountryReference[] {
  const collection = topology.objects[Object.keys(topology.objects)[0]];
  const geometries = collection?.geometries ?? [];

  return geometries
    .map((geometry) => {
      const id = getTopologyCountryId(geometry);
      const name = getTopologyCountryName(geometry);

      if (!id || !name) return null;

      return { id, name };
    })
    .filter((country): country is AtlasCountryReference => country !== null);
}

// Keeps zoom controls inside the supported map range.
function clampMapZoom(zoom: number) {
  return Math.min(maxMapZoom, Math.max(minMapZoom, zoom));
}

// Renders the zoomable atlas and forwards country clicks to the map page.
export default function WorldAtlas({
  visitedCountries,
  countryColors,
  onToggleCountry,
  onCountryNeighborsReady,
  onAtlasCountriesReady,
  atlasSummary,
}: WorldAtlasProps) {
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [countryNeighborIds, setCountryNeighborIds] = useState<Record<string, string[]>>({});
  const [mapPosition, setMapPosition] = useState<MapPosition>(normalMapPosition);

  useEffect(() => {
    // Fetches the same world-atlas TopoJSON used for rendering so neighbor and
    // country-reference data match the visible map.
    let isMounted = true;

    const loadCountryNeighbors = async () => {
      try {
        const response = await fetch(geoUrl);
        if (!response.ok) return;

        const topology = (await response.json()) as Topology;
        const neighborMap = buildCountryNeighborMap(topology);
        const atlasCountries = buildAtlasCountries(topology);
        if (isMounted) {
          setCountryNeighborIds(neighborMap);
          onCountryNeighborsReady?.(neighborMap);
          onAtlasCountriesReady?.(atlasCountries);
        }
      } catch {
        if (isMounted) setCountryNeighborIds({});
      }
    };

    loadCountryNeighbors();

    return () => {
      isMounted = false;
    };
  }, [onAtlasCountriesReady, onCountryNeighborsReady]);

  function handleCountryToggle(id: string, countryName?: string) {
    onToggleCountry(id, countryName, countryNeighborIds[id] ?? []);
  }

  function clearHoveredCountry() {
    setHoveredCountryName(null);
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

  const isMinZoom = mapPosition.zoom <= minMapZoom;
  const isMaxZoom = mapPosition.zoom >= maxMapZoom;
  const isNormalMapView =
    mapPosition.zoom === normalMapPosition.zoom &&
    mapPosition.coordinates[0] === normalMapPosition.coordinates[0] &&
    mapPosition.coordinates[1] === normalMapPosition.coordinates[1];

  return (
    <div className="rounded-[2rem] border border-ink/10 bg-cream p-4 shadow-soft">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.36em] text-gold/70">World Atlas</p>
          <h2 className="text-2xl font-semibold text-ink">Scratch the globe, then explore the story.</h2>
          {atlasSummary ? <div className="mt-3">{atlasSummary}</div> : null}
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
          projectionConfig={{ scale: 140, center: [0, 0] }}
          width={760}
          height={380}
          className="relative h-[360px] w-full rounded-[1.5rem] bg-[#F4E6CC] sm:h-[420px] lg:h-[500px] xl:h-[560px]"
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

                return (
                  <>
                    {atlasGeographies.map((geo) => {
                      const iso = getCountryIso(geo);
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
                  </>
                );
              }}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

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
      </div>

    </div>
  );
}
