'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import { Card, Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { fetchJournalEntries, createJournalEntry } from '@/lib/journalService';
import { placeholderCountries } from '@/lib/placeholderData';

export default function JournalPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();
  const [entries, setEntries] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    countryId: 'US',
    mood: 'nostalgic',
    tags: '',
  });
  const [error, setError] = useState<string | null>(null);

  const currentCountry = useMemo(
    () => placeholderCountries.find((country) => country.id === form.countryId),
    [form.countryId]
  );

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

    loadEntries();
  }, [router, user, isLoading]);

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
      setEntries((current) => [response.data, ...current]);
      setForm({ ...form, title: '', content: '', tags: '' });
      return;
    }

    setError(response.error || 'Could not save entry.');
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
                <Button type="submit" isLoading={loading}>
                  Save Entry
                </Button>
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
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </PageShell>
    </div>
  );
}
