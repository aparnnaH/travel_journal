'use client';

import type React from 'react';
import AppHeader from '@/components/layout/AppHeader';
import PassportLoadingShell from '@/components/passport/PassportLoadingShell';
import { cn } from '@/utils/cn';

// Shared loading shells for App Router routes and client-side auth hydration.
// Keep these close to each page's layout shape so loading states feel like the
// destination page instead of a blank screen or a single spinner.
type PageSkeletonVariant =
  | 'dashboard'
  | 'journal'
  | 'journalEntries'
  | 'map'
  | 'companion'
  | 'friends'
  | 'profile'
  | 'compare'
  | 'auth'
  | 'landing'
  | 'generic'
  | 'journalEntryCards'
  | 'companionSuggestions'
  | 'companionRail'
  | 'passport';

interface AppPageSkeletonProps {
  variant?: PageSkeletonVariant;
}

const shimmer = 'animate-pulse rounded-md bg-ink/10';
const lightShimmer = 'animate-pulse rounded-md bg-white/70';

// Small skeleton primitives keep the route-specific layouts readable below.
function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn(shimmer, 'h-4', className)} />;
}

function SkeletonButton({ className }: { className?: string }) {
  return <div className={cn('h-10 rounded-lg bg-gold/25', className)} />;
}

function PageHeadingSkeleton({ actions = 2 }: { actions?: number }) {
  return (
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="grid w-full max-w-2xl gap-3">
        <SkeletonLine className="h-11 w-64 max-w-full" />
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-3/4" />
      </div>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: actions }).map((_, index) => (
          <SkeletonButton key={index} className={index === 0 ? 'w-32' : 'w-28 bg-ink/10'} />
        ))}
      </div>
    </div>
  );
}

function CardSkeleton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn('rounded-3xl border border-gold/20 bg-white p-6 shadow-soft', className)}>
      {children ?? (
        <div className="grid gap-3">
          <SkeletonLine className="h-6 w-1/2" />
          <SkeletonLine />
          <SkeletonLine className="w-4/5" />
        </div>
      )}
    </div>
  );
}

// Route-shaped skeletons mirror the major page regions without duplicating the
// real page content or data-fetching logic.
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <CardSkeleton className="overflow-hidden bg-[#fff8ea] p-0">
          <div className="grid min-h-[320px] gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="flex flex-col justify-between gap-8 p-6 sm:p-8">
              <div className="grid gap-4">
                <SkeletonLine className="h-7 w-48 rounded-full bg-gold/20" />
                <SkeletonLine className="h-14 w-full max-w-xl" />
                <SkeletonLine className="w-4/5" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className={cn(lightShimmer, 'h-20 border border-gold/20')} />
                ))}
              </div>
            </div>
            <div className="hidden bg-teal/20 lg:block" />
          </div>
        </CardSkeleton>
        <CardSkeleton className="min-h-[320px]" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} className="min-h-44" />
        ))}
      </section>
    </div>
  );
}

function JournalSkeleton() {
  return (
    <section className="overflow-hidden rounded-lg border border-gold/25 bg-[#fff8ea] shadow-soft">
      <div className="border-b border-gold/20 bg-white/72 px-5 py-4">
        <SkeletonLine className="h-3 w-36 bg-gold/20" />
        <SkeletonLine className="mt-3 h-9 w-72 max-w-full" />
        <SkeletonLine className="mt-3 w-full max-w-2xl" />
      </div>

      <div className="p-5">
        <div className="rounded-lg border border-gold/20 bg-white shadow-soft">
          <div className="border-b border-gold/15 bg-cream/55 px-4 py-3">
            <SkeletonLine className="h-3 w-28 bg-gold/20" />
            <SkeletonLine className="mt-3 h-8 w-64 max-w-full" />
            <SkeletonLine className="mt-3 w-full max-w-xl" />
          </div>

          <div className="bg-[#e8dcc2] p-4 sm:p-6">
            <div className="mb-3 rounded-lg border border-gold/20 bg-white/86 p-3 shadow-soft">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="rounded-md border border-gold/12 bg-cream/38 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-5 w-5 rounded-full', index < 3 ? 'bg-[#315f43]/18' : 'bg-ink/10')} />
                      <SkeletonLine className="h-3 min-w-0 flex-1 bg-ink/10" />
                    </div>
                    <SkeletonLine className="mt-2 h-3 w-16 bg-ink/10" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-lg border border-gold/20 bg-white/86 p-4 shadow-soft xl:row-span-2">
                <SkeletonLine className="h-3 w-24 bg-gold/20" />
                <SkeletonLine className="mt-3 h-11 w-full bg-cream/70" />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <SkeletonLine className="h-4 w-44" />
                  <SkeletonButton className="h-9 w-24 bg-ink/10" />
                </div>
                <div className="mt-3 min-h-[420px] rounded-lg border border-gold/25 bg-cream/45 p-4 xl:min-h-[520px]">
                  <SkeletonLine className="w-full bg-white/80" />
                  <SkeletonLine className="mt-3 w-5/6 bg-white/80" />
                  <SkeletonLine className="mt-3 w-2/3 bg-white/80" />
                </div>
              </div>

              <div className="rounded-lg border border-gold/20 bg-white/86 p-4 shadow-soft">
                <SkeletonLine className="h-4 w-16" />
                <SkeletonLine className="mt-3 h-11 w-full bg-cream/70" />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <SkeletonLine className="h-3 w-20 bg-gold/20" />
                    <SkeletonLine className="mt-2 h-11 w-full bg-cream/70" />
                  </div>
                  <div>
                    <SkeletonLine className="h-3 w-16 bg-gold/20" />
                    <SkeletonLine className="mt-2 h-11 w-full bg-cream/70" />
                  </div>
                </div>
                <div className="mt-3">
                  <SkeletonLine className="h-3 w-20 bg-gold/20" />
                  <SkeletonLine className="mt-2 h-11 w-full bg-cream/70" />
                </div>
                <div className="mt-3">
                  <SkeletonLine className="h-3 w-16 bg-gold/20" />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <SkeletonLine key={index} className="h-9 rounded-lg bg-cream/70" />
                    ))}
                  </div>
                </div>
                <SkeletonButton className="mt-4 w-full" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-gold/15 bg-white/72 p-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-gold/16 bg-cream/42 p-4">
                <SkeletonLine className="h-3 w-28 bg-gold/20" />
                <SkeletonLine className="mt-3 h-6 w-36" />
                <SkeletonLine className="mt-3 w-full" />
                <SkeletonButton className="mt-4 h-9 w-32 bg-ink/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function JournalEntriesSkeleton() {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SkeletonLine className="h-5 w-56" />
        <SkeletonLine className="h-9 w-40 rounded-lg bg-emerald-100" />
      </div>
      <section className="mb-5 rounded-lg border border-gold/20 bg-white p-4 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
          <SkeletonLine className="h-11 w-full bg-cream/70" />
          <SkeletonLine className="h-11 w-full bg-cream/70" />
          <SkeletonButton className="w-24 bg-ink/10" />
        </div>
      </section>
      <JournalEntryCardsSkeleton />
      <section className="mt-10 border-t border-gold/18 pt-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <SkeletonLine className="h-3 w-32 bg-gold/20" />
            <SkeletonLine className="mt-3 h-8 w-48" />
          </div>
          <SkeletonLine className="h-8 w-28 rounded-full bg-white" />
        </div>
        <JournalEntryCardsSkeleton />
      </section>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton className="min-h-[560px] bg-[#edf4ef] p-4">
        <div className="mb-4 max-w-md rounded-2xl border border-gold/30 bg-white/80 p-3 shadow-sm-soft">
          <div className="flex items-center justify-between gap-4">
            <div className="grid gap-2">
              <SkeletonLine className="h-3 w-28 bg-gold/20" />
              <SkeletonLine className="w-40" />
            </div>
            <SkeletonLine className="h-10 w-16" />
          </div>
          <div className="mt-3 h-2.5 rounded-full border border-gold/10 bg-cream" />
        </div>
        <div className="h-[420px] rounded-3xl border border-teal/15 bg-white/65" />
      </CardSkeleton>

      <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.6fr)]">
        <CardSkeleton>
          <div className="mb-4 flex items-center justify-between gap-3">
            <SkeletonLine className="h-7 w-36" />
            <SkeletonButton className="w-24 bg-ink/10" />
          </div>
          <ActionListSkeleton rows={3} />
        </CardSkeleton>
        <CardSkeleton>
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <SkeletonLine className="h-7 w-44" />
              <SkeletonLine className="h-8 w-20 rounded-full bg-cream" />
            </div>
            <SkeletonLine className="w-72 max-w-full" />
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <SkeletonLine className="h-10 w-full bg-cream/70" />
              <SkeletonLine className="h-10 w-full bg-cream/70" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2 rounded-2xl border border-gold/15 bg-cream/70 p-2">
                <div className="h-10 w-10 shrink-0 rounded-xl border border-gold/20 bg-white" />
                <SkeletonLine className="h-5 min-w-0 flex-1" />
                <div className="h-7 w-7 rounded-lg bg-white" />
              </div>
            ))}
          </div>
        </CardSkeleton>
      </div>
    </div>
  );
}

function JournalEntryCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <CardSkeleton key={index} className="min-h-64">
          <div className="grid gap-4">
            <div className="aspect-[4/3] rounded-lg bg-gold/20" />
            <div className="grid content-start gap-3">
              <SkeletonLine className="h-8 w-2/3" />
              <SkeletonLine />
              <SkeletonLine className="w-4/5" />
              <div className="mt-2 flex flex-wrap gap-2">
                <SkeletonLine className="h-7 w-20 rounded-full bg-cream/70" />
                <SkeletonLine className="h-7 w-24 rounded-full bg-cream/70" />
              </div>
            </div>
          </div>
        </CardSkeleton>
      ))}
    </div>
  );
}

function CompanionSkeleton() {
  return (
    <div className="relative mx-auto w-full max-w-[1380px] px-4 pt-8 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-lg border border-gold/28 bg-[#f7eedc] px-5 py-5 shadow-lg-soft">
        <div className="grid gap-3">
          <SkeletonLine className="h-4 w-32 bg-gold/20" />
          <SkeletonLine className="h-12 w-96 max-w-full" />
          <SkeletonLine className="w-full max-w-3xl" />
        </div>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <CompanionChatSkeleton />
          <CompanionSuggestionsSkeleton />
        </div>
        <CompanionRailSkeleton />
      </div>
    </div>
  );
}

function CompanionChatSkeleton() {
  return (
    <section className="relative flex h-[640px] min-h-[560px] overflow-hidden rounded-xl border border-gold/28 bg-[#fff9ec] shadow-lg-soft">
      <div className="relative flex min-h-0 w-full flex-col">
        <div className="flex items-center justify-between border-b border-gold/24 bg-cream/80 p-4">
          <div className="grid gap-2">
            <SkeletonLine className="h-3 w-40 bg-gold/20" />
            <SkeletonLine className="h-5 w-48" />
          </div>
          <div className="h-8 w-8 rounded-full bg-ink/10" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-4 bg-[#fffaf0]/84 px-4 py-4 md:px-5">
          <div className="max-w-[78%] rounded-2xl rounded-tl-none border border-gold/20 bg-white p-4 shadow-soft">
            <SkeletonLine className="w-56 max-w-full" />
            <SkeletonLine className="mt-2 w-44 max-w-full" />
          </div>
          <div className="ml-auto max-w-[72%] rounded-2xl rounded-tr-none bg-teal/25 p-4 shadow-soft">
            <SkeletonLine className="w-48 max-w-full bg-white/70" />
            <SkeletonLine className="mt-2 w-32 max-w-full bg-white/70" />
          </div>
        </div>
        <div className="border-t border-gold/22 bg-cream/62 p-4">
          <div className="mb-3 h-9 w-32 rounded-full border border-gold/25 bg-white/70" />
          <div className="h-14 rounded-3xl border border-gold/26 bg-white" />
        </div>
      </div>
    </section>
  );
}

function CompanionSuggestionsSkeleton() {
  return (
    <section className="rounded-lg border border-gold/20 bg-[#fffaf0] px-4 py-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SkeletonLine className="h-8 w-56" />
        <SkeletonLine className="h-3 w-28 bg-gold/20" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-gold/20 bg-white px-4 py-3">
            <SkeletonLine className="h-6 w-44" />
            <div className="mt-3 space-y-2">
              <SkeletonLine className="h-10 w-full bg-cream/70" />
              <SkeletonLine className="h-10 w-full bg-cream/70" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompanionRailSkeleton() {
  return (
    <aside className="space-y-4">
      <CardSkeleton className="min-h-40 rounded-lg bg-[#f9f2e2]" />
      <section className="rounded-lg border border-gold/24 bg-[#f9f2e2] px-3 py-3 shadow-soft">
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 rounded-md border border-gold/25 bg-cream/55" />
          ))}
        </div>
      </section>
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} className="min-h-28 rounded-lg" />
        ))}
      </div>
    </aside>
  );
}

function MetricSkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-3xl border border-gold/20 bg-white p-5 shadow-soft">
          <div className="h-11 w-11 rounded-lg bg-gold/20" />
          <SkeletonLine className="mt-5 h-3 w-28" />
          <SkeletonLine className="mt-3 h-8 w-16" />
          <SkeletonLine className="mt-2 w-36" />
        </div>
      ))}
    </section>
  );
}

function ActionListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg border border-gold/18 bg-cream/42 p-3">
          <div className="h-11 w-11 shrink-0 rounded-lg bg-gold/20" />
          <div className="grid min-w-0 flex-1 gap-2">
            <SkeletonLine className="h-5 w-2/3" />
            <SkeletonLine className="w-full" />
          </div>
          <div className="h-4 w-4 rounded-full bg-ink/10" />
        </div>
      ))}
    </div>
  );
}

function RowListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-lg border border-gold/16 bg-cream/36 p-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 shrink-0 rounded-lg bg-gold/20" />
            <div className="grid min-w-0 flex-1 gap-2">
              <SkeletonLine className="h-5 w-3/5" />
              <SkeletonLine className="w-4/5" />
              <SkeletonLine className="h-3 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FriendsSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <CardSkeleton className="overflow-hidden rounded-3xl border-gold/30 bg-[#fff8ea] p-0">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="p-6 sm:p-8">
              <SkeletonLine className="h-7 w-40 rounded-full bg-white/70" />
              <SkeletonLine className="mt-5 h-14 w-full max-w-2xl" />
              <SkeletonLine className="mt-3 h-14 w-4/5 max-w-xl" />
              <SkeletonLine className="mt-5 w-full max-w-lg" />
            </div>
            <div className="border-t border-gold/20 bg-[#21382B] p-6 lg:border-l lg:border-t-0">
              <SkeletonLine className="h-3 w-32 bg-white/25" />
              <SkeletonLine className="mt-5 h-16 w-20 bg-white/25" />
              <SkeletonLine className="mt-5 w-full bg-white/25" />
              <SkeletonLine className="mt-2 w-4/5 bg-white/25" />
            </div>
          </div>
        </CardSkeleton>

        <CardSkeleton className="rounded-3xl bg-white/90">
          <SkeletonLine className="h-3 w-28 bg-gold/20" />
          <SkeletonLine className="mt-3 h-8 w-40" />
          <div className="mt-5 space-y-4">
            <SkeletonLine className="h-12 w-full bg-cream/70" />
            <SkeletonButton className="w-full" />
          </div>
        </CardSkeleton>
      </section>

      <MetricSkeletonRow />

      <CardSkeleton className="overflow-hidden rounded-3xl border-gold/28 bg-[#FFF8EA] p-0">
        <div className="grid gap-0 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="relative min-h-72 overflow-hidden border-b border-gold/18 bg-[#20362B] p-6 xl:border-b-0 xl:border-r">
            <div className="h-11 w-11 rounded-lg bg-cream/12" />
            <SkeletonLine className="mt-5 h-3 w-36 bg-white/20" />
            <SkeletonLine className="mt-4 h-10 w-full bg-white/20" />
            <SkeletonLine className="mt-3 h-10 w-4/5 bg-white/20" />
            <SkeletonLine className="mt-5 w-full bg-white/20" />
            <SkeletonLine className="mt-2 w-5/6 bg-white/20" />
            <div className="mt-5 h-10 w-44 rounded-lg border border-cream/14 bg-cream/8" />
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <SkeletonLine className="h-3 w-36 bg-gold/20" />
                <SkeletonLine className="mt-3 h-8 w-56" />
              </div>
              <div className="flex flex-wrap gap-2">
                <SkeletonLine className="h-10 w-24 rounded-lg bg-gold/25" />
                <SkeletonLine className="h-10 w-28 rounded-lg bg-cream/70" />
              </div>
            </div>

            <div className="relative rounded-lg border border-gold/24 bg-[#EAD8B8] p-3 shadow-inner">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.82fr)_minmax(0,1fr)]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'min-h-48 rounded-lg border p-4',
                      index === 1 ? 'border-gold/30 bg-white/92' : 'border-gold/18 bg-[#FFF8EA]/86'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid flex-1 gap-2">
                        <SkeletonLine className="h-3 w-32 bg-gold/20" />
                        <SkeletonLine className="h-7 w-36" />
                      </div>
                      <SkeletonLine className="h-8 w-10 rounded-lg bg-gold/20" />
                    </div>
                    <div className="mt-5 grid gap-2">
                      {Array.from({ length: 3 }).map((_, rowIndex) => (
                        <div key={rowIndex} className="flex items-center gap-2 rounded-lg border border-gold/12 bg-white/70 p-2">
                          <div className="h-9 w-9 rounded-md bg-gold/18" />
                          <SkeletonLine className="h-4 flex-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-gold/24 bg-white shadow-soft">
              <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_190px]">
                <div className="p-4">
                  <SkeletonLine className="h-3 w-36 bg-gold/20" />
                  <SkeletonLine className="mt-3 h-8 w-52" />
                  <SkeletonLine className="mt-3 w-full max-w-lg" />
                </div>
                <div className="border-t border-dashed border-gold/34 bg-[#F8F1E4] p-4 md:border-l md:border-t-0">
                  <SkeletonLine className="h-3 w-28 bg-ink/10" />
                  <SkeletonLine className="mt-4 h-5 w-32" />
                  <SkeletonLine className="mt-3 h-3 w-24" />
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-lg border border-gold/20 bg-white/90 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <SkeletonLine className="h-3 w-32 bg-gold/20" />
                    <SkeletonLine className="mt-3 h-6 w-40" />
                  </div>
                  <SkeletonLine className="h-9 w-9 rounded-lg bg-gold/20" />
                </div>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="mb-3 rounded-lg border border-gold/12 bg-cream/40 px-3 py-2 last:mb-0">
                    <div className="flex items-center justify-between gap-3">
                      <SkeletonLine className="h-4 w-24" />
                      <SkeletonLine className="h-3 w-20" />
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                      <div className={cn('h-full rounded-full bg-gold/45', index === 0 ? 'w-3/4' : index === 1 ? 'w-1/2' : 'w-1/3')} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-gold/20 bg-white/90 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <SkeletonLine className="h-3 w-32 bg-gold/20" />
                    <SkeletonLine className="mt-3 h-6 w-44" />
                  </div>
                  <SkeletonLine className="h-10 w-10 rounded-lg bg-emerald-100" />
                </div>
                <RowListSkeleton rows={2} />
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gold/20 bg-white/90 p-4">
              <SkeletonLine className="h-3 w-40 bg-gold/20" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-lg border border-gold/14 bg-cream/45 p-3">
                    <SkeletonLine className="h-9 w-9 rounded-lg bg-gold/20" />
                    <SkeletonLine className="mt-4 h-4 w-28" />
                    <SkeletonLine className="mt-2 h-3 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardSkeleton>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <CardSkeleton className="rounded-3xl bg-white/90">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <SkeletonLine className="h-3 w-20 bg-gold/20" />
              <SkeletonLine className="mt-3 h-8 w-48" />
            </div>
            <SkeletonButton className="w-24 bg-ink/10" />
          </div>
          <RowListSkeleton rows={2} />
        </CardSkeleton>

        <div className="space-y-6">
          <CardSkeleton className="rounded-3xl bg-[#F8F1E4]">
            <SkeletonLine className="h-3 w-24 bg-gold/20" />
            <SkeletonLine className="mt-3 h-8 w-32" />
            <div className="mt-4">
              <RowListSkeleton rows={1} />
            </div>
          </CardSkeleton>
          <CardSkeleton className="rounded-3xl bg-white/90">
            <SkeletonLine className="h-3 w-28 bg-gold/20" />
            <SkeletonLine className="mt-3 h-8 w-40" />
            <div className="mt-4">
              <RowListSkeleton rows={1} />
            </div>
          </CardSkeleton>
        </div>
      </section>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <CardSkeleton className="overflow-hidden bg-[#fff8ea] p-0">
          <div className="border-b border-gold/20 bg-[#21382B] px-6 py-5 sm:px-8">
            <SkeletonLine className="h-4 w-44 bg-white/25" />
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="h-32 w-32 shrink-0 rounded-3xl border border-gold/30 bg-white shadow-soft" />
              <div className="grid min-w-0 flex-1 gap-3">
                <SkeletonLine className="h-3 w-28 bg-gold/20" />
                <SkeletonLine className="h-11 w-64 max-w-full" />
                <SkeletonLine className="w-72 max-w-full" />
                <SkeletonLine className="h-8 w-40 rounded-full bg-white/75" />
              </div>
            </div>
            <div className="mt-8 rounded-lg border border-gold/18 bg-white/72 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="grid gap-2">
                  <SkeletonLine className="h-3 w-40" />
                  <SkeletonLine className="h-8 w-16" />
                </div>
                <div className="h-7 w-7 rounded-full bg-gold/20" />
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-cream">
                <div className="h-full w-2/3 rounded-full bg-gold/40" />
              </div>
            </div>
          </div>
        </CardSkeleton>

        <CardSkeleton className="bg-white/90">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <SkeletonLine className="h-3 w-28 bg-gold/20" />
              <SkeletonLine className="mt-3 h-8 w-44" />
            </div>
            <SkeletonLine className="h-8 w-20 rounded-full bg-cream" />
          </div>
          <div className="space-y-5">
            <SkeletonLine className="h-12 w-full bg-cream/70" />
            <SkeletonLine className="h-12 w-full bg-cream/70" />
            <SkeletonLine className="h-12 w-full bg-cream/70" />
            <div className="flex flex-wrap gap-3">
              <SkeletonButton className="w-32" />
              <SkeletonButton className="w-36 bg-ink/10" />
            </div>
          </div>
        </CardSkeleton>
      </section>

      <MetricSkeletonRow />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <CardSkeleton className="bg-white/90">
          <SkeletonLine className="h-3 w-36 bg-gold/20" />
          <SkeletonLine className="mt-3 h-8 w-56" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-gold/16 bg-cream/36 p-4">
                <div className="h-5 w-5 rounded bg-gold/20" />
                <SkeletonLine className="mt-4 h-3 w-20" />
                <SkeletonLine className="mt-3 h-6 w-full" />
              </div>
            ))}
          </div>
        </CardSkeleton>
        <CardSkeleton className="bg-[#F8F1E4]">
          <SkeletonLine className="h-3 w-24 bg-gold/20" />
          <SkeletonLine className="mt-3 h-8 w-40" />
          <div className="mt-4">
            <ActionListSkeleton rows={5} />
          </div>
        </CardSkeleton>
      </section>
    </div>
  );
}

function CompareSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <CardSkeleton className="h-full overflow-hidden bg-[#fff8ea] p-0">
          <div className="grid h-full gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="p-6 sm:p-8">
              <SkeletonLine className="h-7 w-52 rounded-full bg-white/70" />
              <SkeletonLine className="mt-5 h-12 w-full max-w-2xl sm:h-14" />
              <SkeletonLine className="mt-3 h-12 w-4/5 max-w-xl sm:h-14" />
              <SkeletonLine className="mt-5 h-5 w-full max-w-lg" />
              <SkeletonLine className="mt-2 h-5 w-4/5 max-w-md" />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="rounded-lg border border-gold/16 bg-white/70 p-4">
                    <SkeletonLine className="h-3 w-28 bg-gold/20" />
                    <SkeletonLine className="mt-3 h-8 w-24" />
                    <SkeletonLine className="mt-2 h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="h-full border-t border-gold/20 bg-[#21382B] p-6 lg:border-l lg:border-t-0">
              <SkeletonLine className="h-3 w-40 bg-white/25" />
              <SkeletonLine className="mt-5 h-16 w-24 bg-white/25" />
              <SkeletonLine className="mt-5 h-4 w-full bg-white/25" />
              <SkeletonLine className="mt-2 h-4 w-4/5 bg-white/25" />
            </div>
          </div>
        </CardSkeleton>

        <CardSkeleton className="bg-white/90">
          <SkeletonLine className="h-3 w-28 bg-gold/20" />
          <SkeletonLine className="mt-3 h-8 w-48" />
          <div className="mt-5">
            <ActionListSkeleton />
          </div>
        </CardSkeleton>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <CardSkeleton key={index} className={index === 0 ? 'bg-white/90' : 'bg-[#FFF8EA]'}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <SkeletonLine className="h-3 w-36 bg-gold/20" />
                <SkeletonLine className="mt-3 h-8 w-56" />
              </div>
              <div className="h-10 w-10 shrink-0 rounded-lg bg-gold/20" />
            </div>
            {index === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <SkeletonLine className="h-3 w-24 bg-ink/10" />
                  <RowListSkeleton rows={3} />
                </div>
                <div className="space-y-2">
                  <SkeletonLine className="h-3 w-32 bg-ink/10" />
                  <RowListSkeleton rows={3} />
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-gold/18 bg-white/70 px-4 py-3">
                  <SkeletonLine className="h-5 w-full" />
                  <div className="mt-3 h-3 rounded-full bg-cream" />
                  <div className="mt-2 flex items-center justify-between">
                    <SkeletonLine className="h-3 w-16" />
                    <SkeletonLine className="h-3 w-16" />
                  </div>
                </div>
                <div className="mt-4">
                  <RowListSkeleton rows={3} />
                </div>
              </>
            )}
          </CardSkeleton>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <CardSkeleton className="bg-white/90">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <SkeletonLine className="h-3 w-32 bg-gold/20" />
              <SkeletonLine className="mt-3 h-8 w-56" />
            </div>
            <SkeletonButton className="w-24 bg-ink/10" />
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 rounded-lg border border-gold/16 bg-cream/36 p-4">
                  <SkeletonLine className="h-5 w-3/5" />
                  <SkeletonLine className="mt-2 w-4/5" />
                  <SkeletonLine className="mt-4 h-3 w-28 bg-gold/20" />
                </div>
              ))}
            </div>
            <div className="flex h-full min-h-80 flex-col rounded-lg border border-gold/16 bg-[#FFF8EA] p-3">
              <SkeletonLine className="h-3 w-24 bg-gold/20" />
              <SkeletonLine className="mt-3 h-7 w-32" />
              <SkeletonLine className="mt-2 h-4 w-full" />
              <div className="mt-4 flex-1 space-y-1.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 rounded-lg border border-gold/12 bg-white/70 px-2.5 py-2">
                    <SkeletonLine className="h-4 w-28" />
                    <div className="h-6 w-6 rounded-md bg-gold/20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardSkeleton>

        <div className="space-y-6">
          <CardSkeleton className="bg-[#F8F1E4]">
            <SkeletonLine className="h-3 w-24 bg-gold/20" />
            <SkeletonLine className="mt-3 h-8 w-44" />
            <div className="mt-4">
              <RowListSkeleton rows={3} />
            </div>
          </CardSkeleton>
          <CardSkeleton className="bg-white/90">
            <SkeletonLine className="h-3 w-24 bg-gold/20" />
            <SkeletonLine className="mt-3 h-8 w-36" />
            <div className="mt-4">
              <RowListSkeleton rows={3} />
            </div>
          </CardSkeleton>
        </div>
      </section>
    </div>
  );
}

function GridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: cards }).map((_, index) => (
        <CardSkeleton key={index} className="min-h-52" />
      ))}
    </div>
  );
}

function AuthSkeleton() {
  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="grid w-full max-w-md gap-5 px-6">
        <SkeletonLine className="h-10 w-52" />
        <div className="grid gap-4">
          <SkeletonLine className="h-12 w-full bg-white/75" />
          <SkeletonLine className="h-12 w-full bg-white/75" />
          <div className="flex items-center justify-between gap-4">
            <SkeletonButton className="w-28" />
            <SkeletonButton className="w-32 bg-ink/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingSkeleton() {
  return (
    <div className="grid gap-12 px-4 py-10">
      <section className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="grid gap-5">
          <SkeletonLine className="h-14 w-full max-w-xl" />
          <SkeletonLine className="w-full max-w-lg" />
          <SkeletonLine className="w-4/5 max-w-md" />
          <div className="flex gap-3">
            <SkeletonButton className="w-36" />
            <SkeletonButton className="w-32 bg-ink/10" />
          </div>
        </div>
        <div className="min-h-[420px] rounded-3xl border border-gold/25 bg-white/60 shadow-soft" />
      </section>
    </div>
  );
}

// Central variant routing lets loading.tsx files stay tiny while still getting
// page-specific skeletons for route transitions and protected auth checks.
function SkeletonBody({ variant }: { variant: PageSkeletonVariant }) {
  if (variant === 'dashboard') return <DashboardSkeleton />;
  if (variant === 'journal') return <JournalSkeleton />;
  if (variant === 'journalEntries') return <JournalEntriesSkeleton />;
  if (variant === 'journalEntryCards') return <JournalEntryCardsSkeleton />;
  if (variant === 'map') return <MapSkeleton />;
  if (variant === 'companion') return <CompanionSkeleton />;
  if (variant === 'companionSuggestions') return <CompanionSuggestionsSkeleton />;
  if (variant === 'companionRail') return <CompanionRailSkeleton />;
  if (variant === 'auth') return <AuthSkeleton />;
  if (variant === 'landing') return <LandingSkeleton />;
  if (variant === 'friends') return <FriendsSkeleton />;
  if (variant === 'profile') return <ProfileSkeleton />;
  if (variant === 'compare') return <CompareSkeleton />;
  return <GridSkeleton />;
}

export function InlineLoadingSkeleton({ variant = 'generic' }: AppPageSkeletonProps) {
  return <SkeletonBody variant={variant} />;
}

// Full-page wrapper used by Next loading.tsx files and client components while
// AuthProvider is still hydrating the signed-in user.
export default function AppPageSkeleton({ variant = 'generic' }: AppPageSkeletonProps) {
  if (variant === 'passport') {
    return <PassportLoadingShell />;
  }

  if (variant === 'landing') {
    return (
      <div className="min-h-screen bg-cream text-ink" aria-busy="true">
        <AppHeader />
        <LandingSkeleton />
      </div>
    );
  }

  if (variant === 'companion') {
    return (
      <div className="min-h-screen bg-cream text-ink" aria-busy="true">
        <AppHeader />
        <CompanionSkeleton />
      </div>
    );
  }

  if (variant === 'auth') {
    return (
      <div className="min-h-screen bg-cream text-ink" aria-busy="true">
        <AppHeader />
        <AuthSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-ink" aria-busy="true">
      <AppHeader />
      <main className="container mx-auto px-4 py-16">
        <PageHeadingSkeleton actions={variant === 'profile' ? 1 : 2} />
        <SkeletonBody variant={variant} />
      </main>
    </div>
  );
}
