'use client';

import type { Country } from '@/types';
import { Button } from '@/components/ui';

interface CityExplorerProps {
  country: Country | null;
  onClose: () => void;
}

export default function CityExplorer({ country, onClose }: CityExplorerProps) {
  if (!country) {
    return null;
  }

  const cityList = (country as any).cities ?? [];
  const highlights = (country as any).highlights ?? [];

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/70 p-6 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl rounded-[2rem] bg-cream shadow-2xl ring-1 ring-black/10">
        <div className="flex flex-col gap-4 border-b border-ink/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-ink/60">Country Explorer</p>
            <h2 className="text-3xl font-semibold text-ink">{country.name}</h2>
            <p className="text-sm text-ink/70">A first look at city-level travel, memories, and local routes.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-5 rounded-[1.5rem] bg-[#151515] p-6 text-white shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">City Explorer</h3>
                <p className="text-sm text-white/70">Zoom into your favorite places and pinned routes.</p>
              </div>
              <span className="rounded-full bg-gold/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-gold">
                beta
              </span>
            </div>

            <div className="rounded-3xl bg-[#0d0d0d] p-4">
              <div className="mb-3 text-sm uppercase tracking-[0.26em] text-white/50">Immersive map preview</div>
              <div className="h-[260px] rounded-[1.5rem] bg-gradient-to-br from-[#1a1a1a] via-[#111111] to-[#090909] p-4">
                <div className="flex h-full items-center justify-center rounded-[1.25rem] border border-white/10 text-sm text-white/60">
                  City map preview powered by MapLibre / Mapbox integration.
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-[#111111] p-4">
                <p className="text-sm uppercase tracking-[0.26em] text-white/50">Visited cities</p>
                <ul className="mt-3 space-y-3 text-sm text-white/80">
                  {cityList.length > 0 ? (
                    cityList.map((city: any) => (
                      <li key={city.id} className="rounded-3xl border border-white/10 bg-[#0d0d0d] px-4 py-3">
                        <p className="font-medium">{city.name}</p>
                        <p className="text-xs text-white/60">{city.region}</p>
                      </li>
                    ))
                  ) : (
                    <li className="text-white/60">No cities added yet.</li>
                  )}
                </ul>
              </div>

              <div className="rounded-3xl bg-[#111111] p-4">
                <p className="text-sm uppercase tracking-[0.26em] text-white/50">Scrapbook highlights</p>
                <ul className="mt-3 space-y-3 text-sm text-white/80">
                  {highlights.length > 0 ? (
                    highlights.map((detail: string, index: number) => (
                      <li key={index} className="rounded-3xl border border-white/10 bg-[#0d0d0d] px-4 py-3">
                        {detail}
                      </li>
                    ))
                  ) : (
                    <li className="text-white/60">No highlights available.</li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          <aside className="space-y-6 rounded-[1.5rem] bg-white/95 p-6 shadow-soft">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-ink">Memory board</h3>
              <p className="text-sm text-ink/75">Saved journal entries, photos, and pinned locations will appear here.</p>
            </div>
            <div className="space-y-4 rounded-3xl border border-ink/10 bg-cream p-4">
              <div className="text-sm font-medium text-ink">Country</div>
              <div className="text-2xl font-semibold text-ink">{country.name}</div>
            </div>
            <div className="space-y-4 rounded-3xl border border-ink/10 bg-cream p-4">
              <div className="text-sm font-medium text-ink">Next step</div>
              <p className="text-sm text-ink/75">Add travel photos, journal entries, and marker clusters for neighborhoods.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
