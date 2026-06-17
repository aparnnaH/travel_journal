'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Camera,
  Compass,
  IdCard,
  Mail,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Stamp,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import { Button, Card, Input } from '@/components/ui';
import { fetchJournalEntries } from '@/lib/journalService';
import { createOrUpdateProfile, fetchProfile } from '@/lib/profileService';
import { updateUserMetadata } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';
import type { JournalEntry, UserProfile } from '@/types';

type ProfileRecord = Partial<UserProfile> & {
  display_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
};

type ProfileDraft = {
  displayName: string;
  avatar: string;
};

const emptyDraft: ProfileDraft = {
  displayName: '',
  avatar: '',
};

const getInitials = (value: string) => {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'TJ';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not recorded';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const getProfileDisplayName = (profile?: ProfileRecord) => profile?.displayName ?? profile?.display_name ?? '';
const getProfileAvatar = (profile?: ProfileRecord) => profile?.avatar ?? profile?.avatar_url ?? '';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const visitedCountries = useMapStore((state) => state.visitedCountries);
  const countryCities = useMapStore((state) => state.countryCities);
  const router = useRouter();
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [journalCount, setJournalCount] = useState(0);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!user) {
      return;
    }

    let isActive = true;

    const loadProfile = async () => {
      setProfileLoaded(false);
      const [profileResponse, journalResponse] = await Promise.all([
        fetchProfile(user.id),
        fetchJournalEntries(user.id),
      ]);

      if (!isActive) {
        return;
      }

      const profile = profileResponse.success ? (profileResponse.data?.[0] as ProfileRecord | undefined) : undefined;
      setDraft({
        displayName: getProfileDisplayName(profile) || user.displayName || '',
        avatar: getProfileAvatar(profile) || user.avatar || '',
      });

      if (journalResponse.success && journalResponse.data) {
        setJournalCount((journalResponse.data as JournalEntry[]).length);
      }

      setProfileLoaded(true);
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [router, user, isLoading]);

  const profileName = draft.displayName || user?.displayName || user?.email || 'Traveler';
  const avatarUrl = draft.avatar.trim();
  const cityCount = useMemo(
    () => Object.values(countryCities ?? {}).reduce((total, cities) => total + cities.length, 0),
    [countryCities]
  );
  const profileFields = [draft.displayName.trim(), avatarUrl, user?.email ?? ''];
  const completionCount = profileFields.filter(Boolean).length;
  const completionPercent = Math.round((completionCount / profileFields.length) * 100);
  const profileStatus = completionPercent >= 100 ? 'Complete' : completionPercent >= 67 ? 'Almost ready' : 'Needs details';
  const accountSignals = [
    {
      label: 'Email',
      value: user?.email ?? 'Not available',
      icon: Mail,
    },
    {
      label: 'Member since',
      value: formatDate(user?.createdAt),
      icon: IdCard,
    },
    {
      label: 'Profile status',
      value: profileStatus,
      icon: BadgeCheck,
    },
  ];
  const travelStats = [
    {
      label: 'Visited countries',
      value: visitedCountries.length,
      icon: MapPinned,
      href: '/map',
      tone: 'bg-[#E8F1EA] text-[#315F43]',
    },
    {
      label: 'Journal entries',
      value: journalCount,
      icon: BookOpen,
      href: '/journal',
      tone: 'bg-[#EAF0F6] text-[#27516F]',
    },
    {
      label: 'City pins',
      value: cityCount,
      icon: Compass,
      href: '/map',
      tone: 'bg-[#F3E6D8] text-[#71481F]',
    },
  ];

  if (isLoading || !user) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const nextProfile: UserProfile = {
      id: user.id,
      email: user.email,
      displayName: draft.displayName.trim() || undefined,
      avatar: avatarUrl || undefined,
      createdAt: user.createdAt,
    };

    try {
      const profileResult = await createOrUpdateProfile(nextProfile);
      if (!profileResult.success) {
        setError(profileResult.error || 'Unable to save profile.');
        setLoading(false);
        return;
      }

      await updateUserMetadata({
        full_name: draft.displayName.trim() || null,
        avatar_url: avatarUrl || null,
      });
      setUser(nextProfile);
      setSuccessMessage('Profile updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error updating profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Profile"
        description="Shape the identity that appears across your travel archive, journal, companion, and passport."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => router.push('/dashboard')} className="gap-2">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Button>
            <Button onClick={() => router.push('/journal')} className="gap-2">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Journal
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
            <Card className="overflow-hidden border-gold/30 bg-[#fff8ea] p-0" variant="elevated">
              <div className="border-b border-gold/20 bg-[#21382B] px-6 py-5 text-cream sm:px-8">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cream/72">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  Traveler identity
                </p>
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-3xl border border-gold/30 bg-white shadow-soft">
                    {avatarUrl ? (
                      <div
                        role="img"
                        aria-label={`${profileName} avatar`}
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${avatarUrl})` }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#E8F1EA] text-4xl font-serif font-semibold text-[#315F43]">
                        {getInitials(profileName)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Public card</p>
                    <h2 className="mt-2 truncate text-4xl font-serif font-semibold text-ink">{profileName}</h2>
                    <p className="mt-3 break-words text-sm leading-6 text-ink/68">{user.email}</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/72 px-3 py-1.5 text-sm font-semibold text-ink/65">
                      <ShieldCheck className="h-4 w-4 text-[#315F43]" aria-hidden="true" />
                      Signed in account
                    </div>
                  </div>
                </div>

                {completionPercent < 100 ? (
                  <div className="mt-8 rounded-lg border border-gold/18 bg-white/72 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/52">Profile completeness</p>
                        <p className="mt-1 text-2xl font-semibold text-ink">{completionPercent}%</p>
                      </div>
                      <BadgeCheck className="h-7 w-7 text-gold-deep" aria-hidden="true" />
                    </div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-cream">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${completionPercent}%` }} />
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="bg-white/90">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Edit profile</p>
                  <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Traveler details</h2>
                </div>
                <span className="rounded-full border border-gold/25 bg-cream px-3 py-1 text-sm font-semibold text-ink/60">
                  {profileLoaded ? 'Ready' : 'Loading'}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">Email</label>
                  <div className="flex items-center gap-3 rounded-lg border-2 border-gold/30 bg-cream/42 px-4 py-2.5 text-ink">
                    <Mail className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
                    <span className="min-w-0 truncate">{user.email}</span>
                  </div>
                </div>

                <Input
                  label="Display Name"
                  value={draft.displayName}
                  onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder="Your traveler name"
                />
                <Input
                  label="Avatar URL"
                  value={draft.avatar}
                  onChange={(event) => setDraft((current) => ({ ...current, avatar: event.target.value }))}
                  placeholder="https://..."
                  helperText="Optional image URL used in your profile summary."
                />

                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                ) : null}
                {successMessage ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {successMessage}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" isLoading={loading} className="gap-2">
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    Save Profile
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => router.push('/companion')} className="gap-2">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Open companion
                  </Button>
                </div>
              </form>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {travelStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => router.push(stat.href)}
                  className="group rounded-3xl border border-gold/20 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-gold/45 hover:shadow-md-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.tone}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-ink/40 transition group-hover:translate-x-1 group-hover:text-ink" aria-hidden="true" />
                  </div>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-ink/52">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-ink">{stat.value}</p>
                </button>
              );
            })}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="bg-white/90">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Account details</p>
                <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Saved identity signals</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {accountSignals.map((signal) => {
                  const Icon = signal.icon;
                  return (
                    <div key={signal.label} className="rounded-lg border border-gold/16 bg-cream/36 p-4">
                      <Icon className="h-5 w-5 text-gold-deep" aria-hidden="true" />
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-ink/52">{signal.label}</p>
                      <p className="mt-2 break-words text-lg font-semibold text-ink">{signal.value}</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="bg-[#F8F1E4]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-deep">Shortcuts</p>
                  <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Travel surfaces</h2>
                </div>
                <Stamp className="h-6 w-6 text-gold-deep" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Passport', href: '/passport', icon: Stamp },
                  { label: 'Map', href: '/map', icon: MapPinned },
                  { label: 'Dashboard', href: '/dashboard', icon: Compass },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-gold/16 bg-white/70 px-3 py-3 text-left transition hover:border-gold/45 hover:bg-white"
                    >
                      <span className="flex items-center gap-3 font-semibold text-ink">
                        <Icon className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                        {item.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-ink/45 transition group-hover:translate-x-1 group-hover:text-ink" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </Card>
          </section>
        </div>
      </PageShell>
    </div>
  );
}
