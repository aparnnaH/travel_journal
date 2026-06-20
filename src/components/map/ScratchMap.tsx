// Legacy/simple scratch-map component.
// This renders a lightweight SVG-style map from local country positions and is
// separate from the newer WorldAtlas experience.
'use client';

import React, { useMemo, useState } from 'react';
import { placeholderCountries } from '@/lib/placeholderData';
import { cn } from '@/utils/cn';

interface ScratchMapProps {
  visitedCountries: string[];
  onToggleCountry: (countryId: string) => void;
}

const countryPositions: Record<string, { cx: number; cy: number }> = {
  US: { cx: 180, cy: 155 },
  FR: { cx: 390, cy: 115 },
  JP: { cx: 620, cy: 175 },
  BR: { cx: 255, cy: 285 },
  IT: { cx: 430, cy: 170 },
  AU: { cx: 680, cy: 305 },
};

const continentShapes = [
  {
    id: 'north-america',
    name: 'North America',
    d: 'M38 158 C62 140, 98 128, 135 132 C160 135, 175 152, 178 170 C180 190, 175 210, 165 228 C155 245, 140 258, 123 265 C108 270, 96 268, 84 260 C76 252, 72 237, 74 220 C76 202, 83 188, 96 175 C108 165, 125 160, 140 162 C155 165, 165 172, 170 182 C175 195, 172 210, 162 222 C152 232, 140 237, 130 240 C118 243, 106 240, 95 232 C85 224, 78 214, 72 202 C68 188, 64 175, 62 160 C60 148, 56 143, 50 139 C44 135, 40 136, 38 158 Z',
    label: { x: 108, y: 186 },
    fill: '#F36B6B',
  },
  {
    id: 'south-america',
    name: 'South America',
    d: 'M234 220 C248 200, 268 192, 286 200 C302 212, 310 232, 304 252 C298 272, 284 288, 265 295 C248 302, 228 301, 215 290 C203 280, 198 262, 198 242 C198 225, 205 212, 215 205 C226 198, 235 198, 234 220 Z',
    label: { x: 260, y: 255 },
    fill: '#F5D86A',
  },
  {
    id: 'greenland',
    name: 'Greenland',
    d: 'M415 45 C438 42, 465 45, 478 55 C486 65, 489 80, 485 95 C480 110, 470 122, 455 125 C440 127, 425 120, 415 108 C408 98, 402 83, 415 45 Z',
    label: { x: 445, y: 70 },
    fill: '#C9A96E',
  },
  {
    id: 'europe',
    name: 'Europe',
    d: 'M334 90 C352 86, 375 86, 395 95 C410 105, 418 120, 415 135 C412 150, 402 165, 387 176 C372 188, 362 203, 360 220 C361 236, 371 248, 385 254 C400 260, 418 255, 430 245 C445 235, 452 220, 455 205 C457 190, 455 175, 448 163 C440 150, 430 142, 417 140 C402 137, 387 140, 375 145 C365 150, 356 150, 348 145 C340 140, 336 125, 338 110 C340 100, 334 90, 334 90 Z',
    label: { x: 385, y: 136 },
    fill: '#4FA3FF',
  },
  {
    id: 'africa',
    name: 'Africa',
    d: 'M362 185 C374 205, 383 230, 382 255 C382 276, 372 291, 355 298 C340 304, 325 299, 315 286 C310 274, 310 255, 318 240 C325 225, 338 210, 355 195 C360 190, 362 185, 362 185 Z',
    label: { x: 362, y: 225 },
    fill: '#82C97B',
  },
  {
    id: 'asia',
    name: 'Asia',
    d: 'M442 104 C468 96, 498 98, 525 118 C548 138, 558 160, 560 185 C562 205, 558 225, 545 240 C530 255, 510 265, 490 268 C470 270, 450 264, 435 250 C423 236, 418 220, 420 205 C422 190, 430 180, 440 172 C452 165, 470 158, 485 155 C500 152, 515 148, 525 140 C540 130, 545 120, 544 110 C541 100, 532 96, 520 94 C505 92, 488 94, 472 100 C458 105, 445 104, 442 104 Z',
    label: { x: 500, y: 145 },
    fill: '#E48BFF',
  },
  {
    id: 'australia',
    name: 'Australia',
    d: 'M646 282 C658 268, 676 268, 692 280 C704 292, 702 306, 688 316 C675 325, 658 323, 649 308 C644 298, 644 288, 646 282 Z',
    label: { x: 678, y: 297 },
    fill: '#F3A59B',
  },
  {
    id: 'antarctica',
    name: 'Antarctica',
    d: 'M78 328 C115 308, 190 300, 280 300 C390 300, 490 308, 620 330 C610 345, 510 355, 420 357 C330 360, 220 356, 120 345 C95 340, 85 335, 78 328 Z',
    label: { x: 380, y: 347 },
    fill: '#DADADA',
  },
];

// Renders clickable country markers for a simplified map view.
export default function ScratchMap({ visitedCountries, onToggleCountry }: ScratchMapProps) {
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null);

  // Hover state controls the small country detail label above the map.
  const hoveredCountry = useMemo(
    () => placeholderCountries.find((country) => country.id === hoveredCountryId),
    [hoveredCountryId]
  );

  return (
    <div className="rounded-3xl border border-ink/20 bg-[#111111] p-4 shadow-soft">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Scratch Map</h2>
          <p className="text-sm text-white/70">Hover a marker for details, then tap to mark it visited.</p>
        </div>
        <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white shadow-sm-soft">
          {hoveredCountry ? hoveredCountry.name : 'Explore the map'}
        </div>
      </div>

      <svg viewBox="0 0 760 380" className="w-full h-[380px] rounded-3xl bg-[#0d0d0d] shadow-sm-soft">
        <defs>
          <linearGradient id="mapGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#090909" />
            <stop offset="100%" stopColor="#141414" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="760" height="380" fill="url(#mapGradient)" rx="24" />

        <g opacity="0.22">
          <circle cx="380" cy="190" r="170" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="8 10" />
          <circle cx="380" cy="190" r="135" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="8 10" />
          <path d="M40 190 H720" stroke="#fff" strokeWidth="1" strokeDasharray="5 9" />
          <path d="M380 40 V340" stroke="#fff" strokeWidth="1" strokeDasharray="5 9" />
          <path d="M110 80 C 180 115, 250 120, 330 100" stroke="#fff" strokeWidth="1" strokeDasharray="5 9" fill="none" />
          <path d="M500 280 C 560 300, 620 300, 690 280" stroke="#fff" strokeWidth="1" strokeDasharray="5 9" fill="none" />
        </g>
        <circle cx="380" cy="190" r="170" fill="none" stroke="#A08443" strokeWidth="2" opacity="0.12" />

        {continentShapes.map((continent) => (
          <g key={continent.id}>
            <path
              d={continent.d}
              fill={continent.fill}
              stroke="#1b1b1b"
              strokeWidth="2"
              opacity="0.95"
            />
            <text
              x={continent.label.x}
              y={continent.label.y}
              textAnchor="middle"
              fontFamily="Crimson Pro, serif"
              fontSize="10"
              fill="#fff"
              opacity="0.85"
            >
              {continent.name}
            </text>
          </g>
        ))}

        <g opacity="0.8">
          <text x="150" y="45" fontFamily="Crimson Pro, serif" fontSize="12" fill="#fff" opacity="0.75">
            NORTH PACIFIC OCEAN
          </text>
          <text x="300" y="80" fontFamily="Crimson Pro, serif" fontSize="12" fill="#fff" opacity="0.75">
            NORTH ATLANTIC OCEAN
          </text>
          <text x="500" y="95" fontFamily="Crimson Pro, serif" fontSize="12" fill="#fff" opacity="0.75">
            ARCTIC OCEAN
          </text>
          <text x="480" y="310" fontFamily="Crimson Pro, serif" fontSize="12" fill="#fff" opacity="0.75">
            INDIAN OCEAN
          </text>
          <text x="180" y="330" fontFamily="Crimson Pro, serif" fontSize="12" fill="#fff" opacity="0.75">
            SOUTH PACIFIC OCEAN
          </text>
          <text x="280" y="365" fontFamily="Crimson Pro, serif" fontSize="12" fill="#fff" opacity="0.75">
            ANTARCTICA
          </text>
        </g>

        {placeholderCountries.map((country) => {
          const position = countryPositions[country.id];
          if (!position) return null;
          const isVisited = visitedCountries.includes(country.id);
          const isHovered = hoveredCountryId === country.id;

          return (
            <g
              key={country.id}
              role="button"
              tabIndex={0}
              aria-label={`${country.name} ${isVisited ? 'visited' : 'not visited'}`}
              onClick={() => onToggleCountry(country.id)}
              onMouseEnter={() => setHoveredCountryId(country.id)}
              onMouseLeave={() => setHoveredCountryId(null)}
              onFocus={() => setHoveredCountryId(country.id)}
              onBlur={() => setHoveredCountryId(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onToggleCountry(country.id);
                }
              }}
              className="cursor-pointer"
            >
              <circle
                cx={position.cx}
                cy={position.cy}
                r={isHovered ? 46 : 42}
                fill={isVisited ? '#C9A96E' : '#fff7e3'}
                stroke={isHovered ? '#8B6035' : '#3D2B0E'}
                strokeWidth={isHovered ? 5 : 4}
                opacity="0.95"
                filter={isHovered ? 'url(#glow)' : undefined}
              />
              <text
                x={position.cx}
                y={position.cy + 6}
                textAnchor="middle"
                fontFamily="Playfair Display, serif"
                fontSize="16"
                fill="#3D2B0E"
              >
                {country.code}
              </text>
              <title>{country.name}</title>
            </g>
          );
        })}

        {hoveredCountry && countryPositions[hoveredCountry.id] ? (
          <g>
            <rect
              x={countryPositions[hoveredCountry.id].cx + 12}
              y={countryPositions[hoveredCountry.id].cy - 60}
              width="160"
              height="44"
              rx="18"
              fill="#fff"
              stroke="#C9A96E"
              strokeWidth="2"
            />
            <text
              x={countryPositions[hoveredCountry.id].cx + 92}
              y={countryPositions[hoveredCountry.id].cy - 34}
              textAnchor="middle"
              fontFamily="Crimson Pro, serif"
              fontSize="12"
              fill="#3D2B0E"
            >
              {hoveredCountry.name}
            </text>
            <text
              x={countryPositions[hoveredCountry.id].cx + 92}
              y={countryPositions[hoveredCountry.id].cy - 18}
              textAnchor="middle"
              fontFamily="Crimson Pro, serif"
              fontSize="11"
              fill="#3D2B0E"
              opacity="0.8"
            >
              {visitedCountries.includes(hoveredCountry.id) ? 'Visited' : 'Tap to visit'}
            </text>
          </g>
        ) : null}

        <path
          d="M190 155 C 230 150, 360 120, 390 115"
          fill="none"
          stroke="#8B6035"
          strokeWidth="2"
          strokeDasharray="8 6"
          opacity="0.7"
        />
        <path
          d="M390 115 C 460 110, 585 155, 620 175"
          fill="none"
          stroke="#8B6035"
          strokeWidth="2"
          strokeDasharray="8 6"
          opacity="0.7"
        />
        <path
          d="M260 285 C 340 270, 380 230, 430 170"
          fill="none"
          stroke="#8B6035"
          strokeWidth="2"
          strokeDasharray="8 6"
          opacity="0.7"
        />
      </svg>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-ink/10 bg-white p-4">
          <p className="text-sm uppercase tracking-[0.2em] text-ink/60">Country focus</p>
          <p className="mt-2 text-lg font-semibold text-ink">
            {hoveredCountry?.name ?? 'Hover a marker to learn more'}
          </p>
          <p className="mt-2 text-sm text-ink/70">
            {hoveredCountry
              ? visitedCountries.includes(hoveredCountry.id)
                ? 'This destination is marked as visited on your map.'
                : 'Click the marker to scratch it off and add it to your travel log.'
              : 'Use the map markers to explore your next destination.'}
          </p>
        </div>
        <div className="rounded-3xl border border-ink/10 bg-white p-4">
          <p className="text-sm uppercase tracking-[0.2em] text-ink/60">Quick tip</p>
          <p className="mt-2 text-lg font-semibold text-ink">Tap a marker to toggle visit status</p>
          <p className="mt-2 text-sm text-ink/70">
            Visited destinations glow and update your scratch progress in real time.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {placeholderCountries.map((country) => {
          const isVisited = visitedCountries.includes(country.id);
          return (
            <button
              key={country.id}
              type="button"
              onClick={() => onToggleCountry(country.id)}
              className={cn(
                'rounded-2xl border px-3 py-2 text-left transition-all duration-200',
                isVisited
                  ? 'border-gold bg-gold text-cream shadow-soft'
                  : 'border-ink/20 bg-white text-ink hover:border-gold/60'
              )}
            >
              <span className="block text-sm font-semibold">{country.name}</span>
              <span className="block text-xs text-ink/60">
                {isVisited ? 'Visited' : 'Tap to visit'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
