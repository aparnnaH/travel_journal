import Link from 'next/link';
import { Compass, Home, MapPinned, NotebookPen, Stamp } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';

const suggestedRoutes = [
  {
    href: '/map',
    label: 'Open Map',
    description: 'Pick up from your world atlas.',
    icon: MapPinned,
  },
  {
    href: '/journal',
    label: 'Journal',
    description: 'Return to your Canva travel workspace.',
    icon: NotebookPen,
  },
  {
    href: '/passport',
    label: 'Passport',
    description: 'Browse the stamps you have unlocked.',
    icon: Stamp,
  },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.24),transparent_34%),linear-gradient(135deg,#f8f0dc_0%,#f5edd8_46%,#efe0bd_100%)] text-ink">
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="grid w-full items-center gap-10 lg:grid-cols-[1fr_0.82fr]">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/70 px-4 py-2 text-sm font-semibold text-gold-deep shadow-soft">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Route 404
            </div>
            <h1 className="text-5xl font-bold leading-tight text-ink sm:text-6xl lg:text-7xl">
              This trail is off the map.
            </h1>
            <p className="mt-5 max-w-xl text-xl leading-8 text-ink/72">
              The page or API route you tried to visit does not exist. Let&apos;s get you back to a real travel path.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gold px-5 text-base font-semibold text-cream shadow-soft transition hover:bg-gold-deep hover:shadow-md-soft focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
              >
                <Home className="h-5 w-5" aria-hidden="true" />
                Go Home
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-ink px-5 text-base font-semibold text-ink transition hover:bg-ink/5 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
              >
                <Compass className="h-5 w-5" aria-hidden="true" />
                Open Dashboard
              </Link>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-gold/20 bg-white/70 p-6 shadow-lg-soft">
            <div className="absolute inset-x-6 top-10 h-px bg-gold/30" />
            <div className="absolute bottom-10 left-10 right-12 h-px rotate-[-18deg] bg-gold/25" />
            <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-gold/45" />
            <div className="absolute left-[18%] top-[22%] h-4 w-4 rounded-full bg-gold-deep shadow-[0_0_0_8px_rgba(139,96,53,0.08)]" />
            <div className="absolute bottom-[24%] right-[18%] h-4 w-4 rounded-full bg-gold shadow-[0_0_0_8px_rgba(201,169,110,0.14)]" />
            <div className="relative z-10 flex h-full min-h-[372px] flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-deep">Lost itinerary</p>
                  <p className="mt-2 text-7xl font-bold leading-none text-ink">404</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-cream text-gold-deep shadow-soft">
                  <Compass className="h-8 w-8" aria-hidden="true" />
                </div>
              </div>

              <div className="space-y-3">
                {suggestedRoutes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className="flex items-center gap-4 rounded-md border border-gold/14 bg-cream/76 p-4 transition hover:border-gold/35 hover:bg-white"
                  >
                    <route.icon className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold text-ink">{route.label}</span>
                      <span className="block text-sm leading-5 text-ink/62">{route.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
