/**
 * Example Integration of Instagram Import into Journal Page
 * 
 * This file shows how to integrate the Instagram import functionality
 * into your existing journal page.
 * 
 * To use this:
 * 1. Copy the relevant parts into your journal/page.tsx
 * 2. Add the import statements
 * 3. Add the state management
 * 4. Add the buttons/modal to your JSX
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import { Card, Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { fetchJournalEntries, createJournalEntry } from '@/lib/journalService';
import { placeholderCountries } from '@/lib/placeholderData';
import type { ExternalMedia, JournalEntry } from '@/types';

// ========== INSTAGRAM IMPORTS ==========
// Add these imports to your journal page
import { InstagramImportModal } from '@/components/journal/imports';

function getInitialInstagramState() {
  if (typeof window === 'undefined') {
    return { connected: false, error: null as string | null };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    connected: params.get('instagram_connected') === 'true',
    error: params.get('instagram_error'),
  };
}

export default function JournalPageWithInstagram() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();
  
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // ========== INSTAGRAM STATE ==========
  const [showInstagramImport, setShowInstagramImport] = useState(false);
  const [selectedEntryForImport, setSelectedEntryForImport] = useState<string | null>(null);
  const [isInstagramConnected, setIsInstagramConnected] = useState(
    () => getInitialInstagramState().connected
  );
  const [instagramError] = useState(() => getInitialInstagramState().error);
  
  const [form, setForm] = useState({
    title: '',
    content: '',
    countryId: 'US',
    mood: 'nostalgic',
    tags: '',
  });
  const [error, setError] = useState<string | null>(null);

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
        setIsInstagramConnected(Boolean(data.connected));
      }
    };

    loadEntries();
    loadInstagramConnection();
  }, [router, user, isLoading]);

  useEffect(() => {
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

  const handleInstagramImport = (entryId: string) => {
    setSelectedEntryForImport(entryId);
    setShowInstagramImport(true);
  };

  const handleInstagramImportSuccess = () => {
    // Refresh entries after successful import
    if (user) {
      const loadEntries = async () => {
        const response = await fetchJournalEntries(user.id);
        if (response.success && response.data) {
          setEntries(response.data);
        }
      };
      loadEntries();
    }
  };

  if (isLoading || !user) {
    return null;
  }

  const currentCountry = placeholderCountries.find((country) => country.id === form.countryId);

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
      setForm({ ...form, title: '', content: '', tags: '' });
      return;
    }

    setError(response.error || 'Failed to create entry');
  };

  return (
    <>
      <AppHeader />
      <PageShell title="Journal" description="Write and manage your travel journal entries with Instagram photos">
        <div className="max-w-4xl mx-auto">
          {/* Journal Entry Form */}
          <Card className="mb-8 p-6">
            <h2 className="text-2xl font-bold mb-4">Create Journal Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <textarea
                placeholder="Write your thoughts..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
                className="w-full p-2 border rounded-lg"
                rows={6}
              />
              <select
                value={form.countryId}
                onChange={(e) => setForm({ ...form, countryId: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                {placeholderCountries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Entry'}
              </Button>
              {error && <p className="text-red-500">{error}</p>}
              {instagramError && <p className="text-red-500">Instagram: {instagramError}</p>}
            </form>
          </Card>

          {/* Journal Entries List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Your Journal Entries</h2>
            {entries.length === 0 ? (
              <p className="text-gray-500">No entries yet</p>
            ) : (
              entries.map((entry) => (
                <Card key={entry.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{entry.title}</h3>
                      <p className="text-gray-600">{currentCountry?.name || 'Unknown'}</p>
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {entry.mood}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{entry.content}</p>

                  {/* ========== INSTAGRAM IMPORT BUTTON ========== */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      onClick={() => handleInstagramImport(entry.id)}
                      className="flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
                      </svg>
                      Import from Instagram
                    </Button>
                  </div>

                  {/* ========== EXTERNAL MEDIA DISPLAY ========== */}
                  {entry.externalMedia && entry.externalMedia.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-3">Imported Media</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {entry.externalMedia.map((media: ExternalMedia) => (
                          <div key={media.id} className="rounded-lg overflow-hidden">
                            <a
                              href={media.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={media.mediaUrl}
                                alt={media.caption}
                                className="w-full h-32 object-cover hover:opacity-75 transition-opacity"
                              />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Instagram Import Modal */}
                  {selectedEntryForImport === entry.id && (
                    <InstagramImportModal
                      userId={user.id}
                      journalEntryId={entry.id}
                      isOpen={showInstagramImport && selectedEntryForImport === entry.id}
                      onClose={() => {
                        setShowInstagramImport(false);
                        setSelectedEntryForImport(null);
                      }}
                      onSuccess={handleInstagramImportSuccess}
                      isConnected={isInstagramConnected}
                    />
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </PageShell>
    </>
  );
}

/**
 * ========== USAGE NOTES ==========
 * 
 * 1. This example shows the basic integration
 * 2. The InstagramImportModal handles the entire import flow
 * 3. It automatically detects if Instagram is connected
 * 4. On successful import, it refreshes the journal entries
 * 
 * 5. Key state to manage:
 *    - showInstagramImport: Whether modal is open
 *    - selectedEntryForImport: Which entry is being imported to
 *    - isInstagramConnected: Whether user has Instagram connected
 * 
 * 6. The modal handles:
 *    - OAuth flow if not connected
 *    - Media fetching and display
 *    - Multi-select of media
 *    - Import and error handling
 * 
 * 7. After import, you should:
 *    - Refresh journal entries
 *    - Show success message
 *    - Display imported media
 */
