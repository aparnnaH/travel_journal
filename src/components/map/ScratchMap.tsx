'use client';

import { placeholderCountries } from '@/lib/placeholderData';
import { cn } from '@/utils/cn';

interface ScratchMapProps {
  visitedCountries: string[];
  onToggleCountry: (countryId: string) => void;
}

const countryPositions: Record<string, { cx: number; cy: number }> = {
  US: { cx: 190, cy: 170 },
  FR: { cx: 410, cy: 120 },
  JP: { cx: 620, cy: 190 },
  BR: { cx: 260, cy: 280 },
  IT: { cx: 450, cy: 180 },
  AU: { cx: 680, cy: 300 },
};

export default function ScratchMap({ visitedCountries, onToggleCountry }: ScratchMapProps) {
  return (
    <div className="rounded-3xl border border-gold/20 bg-cream/90 p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Scratch Map</h2>
          <p className="text-sm text-ink/70">Tap a destination to mark it visited.</p>
        </div>
      </div>

      <svg viewBox="0 0 760 380" className="w-full h-[360px] rounded-3xl bg-white shadow-sm-soft">
        <defs>
          <linearGradient id="mapGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#F5EDD8" />
            <stop offset="100%" stopColor="#F2E3C7" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="760" height="380" fill="url(#mapGradient)" rx="24" />

        {placeholderCountries.map((country) => {
          const position = countryPositions[country.id];
          if (!position) return null;
          const isVisited = visitedCountries.includes(country.id);

          return (
            <g
              key={country.id}
              className="cursor-pointer"
              onClick={() => onToggleCountry(country.id)}
            >
              <circle
                cx={position.cx}
                cy={position.cy}
                r="42"
                fill={isVisited ? '#C9A96E' : '#fff7e3'}
                stroke="#3D2B0E"
                strokeWidth="4"
                opacity="0.95"
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
            </g>
          );
        })}

        <path
          d="M130 260 C 180 220, 240 210, 310 220 S 420 240, 480 210"
          fill="none"
          stroke="#3D2B0E"
          strokeWidth="3"
          strokeDasharray="12 8"
        />
      </svg>

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
                {isVisited ? 'Visited' : 'Unvisited'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
