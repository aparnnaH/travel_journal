'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { RotateCcw, ShieldCheck, Stamp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isDemoMode, seedDemoLocalContext } from '@/lib/demoMode';

const subscribeToDemoMode = () => () => {};
const getDemoModeSnapshot = () => isDemoMode();
const getServerDemoModeSnapshot = () => false;

export default function DemoModeBanner() {
  const router = useRouter();
  const showBanner = useSyncExternalStore(subscribeToDemoMode, getDemoModeSnapshot, getServerDemoModeSnapshot);

  if (!showBanner) {
    return null;
  }

  const resetDemo = () => {
    const shouldReset = window.confirm('Reset the demo back to its original seed data? Temporary edits on this browser will be cleared.');

    if (!shouldReset) {
      return;
    }

    seedDemoLocalContext({ reset: true });
    router.refresh();
  };

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 rounded-lg border border-[#c9a85f]/35 bg-[#fff7df] px-4 py-3 text-sm text-ink shadow-xl sm:bottom-5 sm:left-1/2 sm:right-auto sm:w-[min(920px,calc(100vw-2rem))] sm:-translate-x-1/2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
          <p className="min-w-0 leading-5">
            <span className="font-semibold">You&apos;re exploring the portfolio version of Travel Journal.</span>{' '}
            <span className="text-ink/72">No sign-up required. Everything is stored locally, including Canva for this browser only.</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={resetDemo}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gold/30 bg-white px-3 text-xs font-semibold text-ink transition hover:border-gold/60"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset demo
          </button>
          <Link
            href="/passport?stamp=japan"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-gold-deep px-3 text-xs font-semibold text-white transition hover:bg-ink"
          >
            <Stamp className="h-3.5 w-3.5" aria-hidden="true" />
            View stamp
          </Link>
        </div>
      </div>
    </div>
  );
}
