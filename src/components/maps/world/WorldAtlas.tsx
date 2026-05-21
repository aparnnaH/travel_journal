'use client';

import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { placeholderCountries } from '@/lib/placeholderData';

interface WorldAtlasProps {
  visitedCountries: string[];
  onToggleCountry: (countryId: string) => void;
  onSelectCountry: (countryId: string) => void;
}

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

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

function getCountryIso(geo: any) {
  return String(geo.properties?.ISO_A2 || geo.properties?.iso_a2 || geo.properties?.ISO_A3 || '').toUpperCase();
}

export default function WorldAtlas({ visitedCountries, onToggleCountry, onSelectCountry }: WorldAtlasProps) {
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null);

  const hoveredCountry = useMemo(
    () => placeholderCountries.find((country) => country.id === hoveredCountryId),
    [hoveredCountryId]
  );

  return (
    <div className="rounded-[2rem] border border-ink/10 bg-[#0d0d0d]/90 p-4 shadow-soft">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.36em] text-gold/70">World Atlas</p>
          <h2 className="text-2xl font-semibold text-white">Scratch the globe, then explore the story.</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/80">
          {hoveredCountry?.name ?? 'Hover a country to reveal the atlas flow'}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#090909] p-4">
        <div className="absolute inset-0 overflow-hidden rounded-[1.5rem]">
          <svg viewBox="0 0 760 380" className="h-full w-full">
            {slantedGrid.map((line, index) => (
              <path key={index} d={line.d} stroke="#ffffff" strokeWidth="1" opacity={line.opacity} />
            ))}
          </svg>
        </div>

        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 150 }}
          width={760}
          height={380}
          className="relative h-[380px] w-full rounded-[1.5rem] bg-[#070707]"
        >
          <ZoomableGroup center={[0, 15]} zoom={1}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const iso = getCountryIso(geo);
                  const isTracked = placeholderCountries.some((country) => country.id === iso);
                  const isVisited = visitedCountries.includes(iso);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isVisited ? '#C9A96E' : '#111827'}
                      stroke="#0f172a"
                      strokeWidth={0.35}
                      onMouseEnter={() => {
                        if (isTracked) setHoveredCountryId(iso);
                      }}
                      onMouseLeave={() => setHoveredCountryId(null)}
                      onClick={() => {
                        if (isTracked) onToggleCountry(iso);
                      }}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: isTracked ? '#E9D7A3' : '#111827', cursor: isTracked ? 'pointer' : 'default' },
                        pressed: { fill: '#C9A96E', outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {placeholderCountries.map((country) => {
              const coordinates = markerCoordinates[country.id];
              if (!coordinates) return null;
              const isVisited = visitedCountries.includes(country.id);
              const isHovered = hoveredCountryId === country.id;

              return (
                <Marker key={country.id} coordinates={coordinates}>
                  <g
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectCountry(country.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectCountry(country.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredCountryId(country.id)}
                    onMouseLeave={() => setHoveredCountryId(null)}
                    className="cursor-pointer"
                  >
                    <circle cx="0" cy="0" r={isHovered ? 14 : 12} fill={isVisited ? '#C9A96E' : '#F7F1DE'} stroke="#7C6A46" strokeWidth="2" />
                    <circle cx="0" cy="0" r={isHovered ? 20 : 18} fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.25" />
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
          </ZoomableGroup>
        </ComposableMap>

        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70 shadow-inner">
          Scratch countries to mark them visited, then click a marker to open the city explorer.
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3 rounded-3xl border border-white/10 bg-[#111111]/85 p-4 text-white/80">
          <p className="text-sm uppercase tracking-[0.26em] text-gold/70">Legend</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#C9A96E]" />
              <span>Visited country</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#F7F1DE] border border-[#7C6A46]" />
              <span>Locked country</span>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#111111]/85 p-4 text-white/80">
          <p className="text-sm uppercase tracking-[0.26em] text-gold/70">Action</p>
          <p className="text-sm">Click a geography to scratch visited status. Click a marker to open the detailed country explorer.</p>
        </div>
      </div>
    </div>
  );
}
