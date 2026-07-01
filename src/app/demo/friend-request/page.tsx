'use client';

import { useEffect, useMemo } from 'react';
import type React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Copy, MailPlus, Share2, UserRoundPlus, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/layout/PageShell';
import { Button, Card } from '@/components/ui';
import {
  demoJournalEntries,
  demoMapState,
  demoUser,
  DEMO_SHARE_RECIPIENT_NAME,
  enableDemoMode,
  seedDemoLocalContext,
} from '@/lib/demoMode';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';

const demoTravelerEmail = demoUser.email;

export default function DemoFriendRequestPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const replaceMapState = useMapStore((state) => state.replaceMapState);

  useEffect(() => {
    enableDemoMode();
    seedDemoLocalContext({ reset: true });
    setLoading(false);
    setUser(demoUser);
    replaceMapState(demoMapState);
  }, [replaceMapState, setLoading, setUser]);

  const sharedEntryCount = demoJournalEntries.length;
  const entryTitles = useMemo(() => demoJournalEntries.map((entry) => entry.title), []);

  const copyEmail = async () => {
    await navigator.clipboard?.writeText(demoTravelerEmail);
  };

  return (
    <main className="min-h-screen bg-cream text-ink">
      <PageShell
        title="Friend Request Demo"
        description="A hidden demo page for checking the friend request and journal-sharing experience."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => router.push('/friends')} className="gap-2">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              Open Friends
            </Button>
            <Button type="button" onClick={() => router.push('/journal/entries?tab=shared')} className="gap-2">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Shared Entries
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <Card className="overflow-hidden border-gold/30 bg-[#fff8ea] p-0" variant="elevated">
              <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="p-6 sm:p-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">
                    <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
                    Demo traveler
                  </div>
                  <h2 className="mt-5 max-w-2xl text-4xl font-serif font-semibold leading-tight text-ink sm:text-5xl">
                    Add {demoUser.displayName} as the friend.
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-7 text-ink/72">
                    From the {DEMO_SHARE_RECIPIENT_NAME} demo account, send the friend request to this demo traveler email.
                    The demo preview treats every seeded journal entry as shared with that account.
                  </p>
                </div>
                <div className="border-t border-gold/20 bg-[#21382B] p-6 text-cream md:border-l md:border-t-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cream/64">Share status</p>
                  <p className="mt-3 text-6xl font-serif font-semibold">{sharedEntryCount}</p>
                  <p className="mt-4 text-sm leading-6 text-cream/74">Existing demo journal entries marked as shared.</p>
                </div>
              </div>
            </Card>

            <section className="grid gap-4 md:grid-cols-3">
              <StatusTile icon={MailPlus} label="Request from" value={DEMO_SHARE_RECIPIENT_NAME} />
              <StatusTile icon={UsersRound} label="Request to" value={demoTravelerEmail} />
              <StatusTile icon={Share2} label="Permission" value="View-only journals" />
            </section>

            <Card className="bg-white/90">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Shared journals</p>
                  <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Entries included in this demo</h2>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/journal/entries?tab=shared')} className="gap-2 self-start">
                  View archive
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {entryTitles.map((title) => (
                  <div key={title} className="rounded-lg border border-gold/16 bg-cream/36 p-4">
                    <CheckCircle2 className="h-5 w-5 text-[#315F43]" aria-hidden="true" />
                    <p className="mt-3 font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-sm text-ink/62">Shared with {DEMO_SHARE_RECIPIENT_NAME}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card className="bg-white/90">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Use this email</p>
              <h2 className="mt-1 break-words text-2xl font-serif font-semibold text-ink">{demoTravelerEmail}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/65">
                This is the demo traveler to add from the {DEMO_SHARE_RECIPIENT_NAME} demo account.
              </p>
              <Button type="button" variant="secondary" onClick={copyEmail} className="mt-5 w-full gap-2">
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy email
              </Button>
            </Card>

            <Card className="bg-[#F8F1E4]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Hidden route</p>
              <p className="mt-2 text-sm leading-6 text-ink/68">
                This page is not linked from navigation. It only prepares local demo state and shows the intended friend
                request and sharing setup.
              </p>
            </Card>
          </aside>
        </div>
      </PageShell>
    </main>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gold/20 bg-white p-5 shadow-soft">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#E8F1EA] text-[#315F43]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-ink/52">{label}</p>
      <p className="mt-2 break-words text-base font-semibold text-ink">{value}</p>
    </div>
  );
}
