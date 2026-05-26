'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import { Card, Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { fetchJournalEntries, createJournalEntry } from '@/lib/journalService';
import { placeholderCountries } from '@/lib/placeholderData';
import InstagramImportModal from '@/components/social/InstagramImportModal';
import type { JournalEntry } from '@/types';

function getInstagramCallbackState() {
  if (typeof window === 'undefined') {
    return { connected: false, notice: null as string | null };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    connected: params.get('instagram_connected') === 'true',
    notice: params.get('instagram_error'),
  };
}

function getFriendlyInstagramNotice(rawNotice: string | null) {
  if (!rawNotice) {
    return null;
  }

  const normalized = rawNotice.toLowerCase();
  if (normalized.includes('invalid platform app')) {
    return 'Instagram rejected this connection. Meta currently allows API connections for Professional accounts (Creator or Business). Switch the account type in Instagram settings, then reconnect.';
  }

  return rawNotice;
}

export default function JournalPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [instagramModalOpen, setInstagramModalOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [instagramConnected, setInstagramConnected] = useState(
    () => getInstagramCallbackState().connected
  );
  const [instagramNotice] = useState(() =>
    getFriendlyInstagramNotice(getInstagramCallbackState().notice)
  );
  const [form, setForm] = useState({
    title: '',
    content: '',
    countryId: 'US',
    mood: 'nostalgic',
    tags: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [instagramDiagnostics, setInstagramDiagnostics] = useState<string | null>(null);
  const [runningInstagramDiagnostics, setRunningInstagramDiagnostics] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!user) {
      return;
    }

    const loadEntries = async () => {
      setLoading(true);
      const response = await fetchJournalEntries(user.id);
      setLoading(false);
      if (response.success && response.data) {
        setEntries(response.data);
      }
    };

    const loadInstagramConnection = async () => {
      const response = await fetch('/api/instagram/connection');
      if (!response.ok) {
        return;
      }

      const data = await response.json() as { success: boolean; connected?: boolean };
      if (data.success) {
        setInstagramConnected(Boolean(data.connected));
      }
    };

    loadEntries();
    loadInstagramConnection();
  }, [router, user, isLoading]);

  useEffect(() => {
    if (!selectedEntryId && entries.length > 0) {
      setSelectedEntryId(entries[0].id);
    }
  }, [entries, selectedEntryId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (!params.has('instagram_connected') && !params.has('instagram_error')) {
      return;
    }

    params.delete('instagram_connected');
    params.delete('instagram_error');
    const query = params.toString();
    window.history.replaceState(
      {},
      document.title,
      `${window.location.pathname}${query ? `?${query}` : ''}`
    );
  }, []);

  if (isLoading || !user) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);

    const response = await createJournalEntry({
      userId: user.id,
      countryId: form.countryId,
      title: form.title,
      content: form.content,
      mood: form.mood,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });

    setLoading(false);

    if (response.success && response.data) {
      const createdEntry = response.data;
      setEntries((current) => [createdEntry, ...current]);
      setSelectedEntryId(createdEntry.id);
      setForm({ ...form, title: '', content: '', tags: '' });
      return;
    }

    setError(response.error || 'Could not save entry.');
  };

  const runInstagramDiagnostics = async () => {
    setRunningInstagramDiagnostics(true);
    setInstagramDiagnostics(null);

    try {
      const response = await fetch('/api/auth/instagram/diagnostics');
      const data = (await response.json()) as {
        success: boolean;
        checks?: Array<{ ok: boolean; message: string }>;
        summary?: {
          oauthHost?: string;
          scope?: string | null;
          redirectUri?: string | null;
          appIdPrefix?: string;
          appIdSuffix?: string;
        };
      };

      if (!response.ok || !data.success || !data.checks) {
        setInstagramDiagnostics('Diagnostics failed. Check server console for details.');
        return;
      }

      const failedChecks = data.checks.filter((check) => !check.ok);
      if (failedChecks.length === 0) {
        setInstagramDiagnostics(
          `Config checks passed. OAuth host=${data.summary?.oauthHost}, scope=${data.summary?.scope}, redirect=${data.summary?.redirectUri}, appId=${data.summary?.appIdPrefix}...${data.summary?.appIdSuffix}`
        );
        return;
      }

      setInstagramDiagnostics(failedChecks.map((check) => check.message).join(' '));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown diagnostics error';
      setInstagramDiagnostics(message);
    } finally {
      setRunningInstagramDiagnostics(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Travel Journal"
        description="Capture your memories for each destination and sync entries with your Supabase journal."
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-ink mb-2">New Journal Entry</h2>
                <p className="text-sm text-ink/70">
                  Write a quick travel note and keep it saved to your personal journal.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
                <Input
                  label="Country"
                  value={form.countryId}
                  onChange={(e) => setForm({ ...form, countryId: e.target.value })}
                  list="countries"
                />
                <datalist id="countries">
                  {placeholderCountries.map((country) => (
                    <option key={country.id} value={country.id} />
                  ))}
                </datalist>
                <Input
                  label="Mood"
                  value={form.mood}
                  onChange={(e) => setForm({ ...form, mood: e.target.value })}
                />
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">Story</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    rows={6}
                    className="w-full rounded-xl border-2 border-gold/30 bg-white px-4 py-3 text-ink placeholder-ink/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    required
                  />
                </div>
                <Input
                  label="Tags (comma separated)"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                {instagramNotice && (
                  <p className="text-sm text-red-600">Instagram: {instagramNotice}</p>
                )}
                {instagramDiagnostics && (
                  <p className="text-sm text-ink/80">Instagram diagnostics: {instagramDiagnostics}</p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" isLoading={loading}>
                    Save Entry
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (selectedEntryId) {
                        setInstagramModalOpen(true);
                      }
                    }}
                    disabled={!selectedEntryId}
                  >
                    📸 Import from Instagram
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    isLoading={runningInstagramDiagnostics}
                    onClick={runInstagramDiagnostics}
                  >
                    Check Instagram Config
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold mb-4">Recent Entries</h3>
            <div className="space-y-4">
              {loading ? (
                <p className="text-ink/60">Loading entries...</p>
              ) : entries.length === 0 ? (
                <p className="text-ink/60">No journal entries yet.</p>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="rounded-3xl border border-gold/20 bg-cream p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-ink">{entry.title}</h4>
                      <span className="text-xs text-ink/60">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-ink/70 line-clamp-3">{entry.content}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/70">
                      <span>{entry.countryId}</span>
                      <span>{entry.mood}</span>
                      {entry.tags?.map((tag: string) => (
                        <span key={tag} className="rounded-full bg-white px-2 py-1 border border-gold/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3 w-full"
                      onClick={() => {
                        setSelectedEntryId(entry.id);
                        setInstagramModalOpen(true);
                      }}
                    >
                      📸 Add Instagram Media
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </PageShell>
      
      {user && selectedEntryId && (
        <InstagramImportModal
          userId={user.id}
          journalEntryId={selectedEntryId}
          isOpen={instagramModalOpen}
          onClose={() => setInstagramModalOpen(false)}
          onSuccess={() => {
            setInstagramModalOpen(false);
            setInstagramConnected(true);
            setSelectedEntryId(null);
            // Reload entries to show imported media
            const loadEntries = async () => {
              const response = await fetchJournalEntries(user.id);
              if (response.success && response.data) {
                setEntries(response.data);
              }
            };
            loadEntries();
          }}
          isConnected={instagramConnected}
        />
      )}
    </div>
  );
}
