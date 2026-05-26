'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { fetchJournalEntries, createJournalEntry } from '@/lib/journalService';
import { placeholderCountries } from '@/lib/placeholderData';
import type { JournalEntry } from '@/types';

type SavedEntry = JournalEntry & {
  country_id?: string;
  created_at?: string;
};

type ScrapbookBaseItem = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
};

type ScrapbookPhotoItem = ScrapbookBaseItem & {
  type: 'photo';
  src: string;
  alt: string;
  caption: string;
};

type ScrapbookNoteItem = ScrapbookBaseItem & {
  type: 'note';
  text: string;
  color: string;
};

type ScrapbookItem = ScrapbookPhotoItem | ScrapbookNoteItem;

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
};

const PHOTO_WIDTH = 190;
const PHOTO_HEIGHT = 246;
const NOTE_WIDTH = 190;
const NOTE_HEIGHT = 178;
const noteColors = ['#fff2a8', '#dcecff', '#ffd8d2', '#dff5d6'];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const readPhotoFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const getEntryDate = (entry: SavedEntry) => entry.createdAt || entry.created_at || new Date().toISOString();
const getEntryCountry = (entry: SavedEntry) => entry.countryId || entry.country_id || '';

export default function JournalPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrapbookLoadedRef = useRef(false);
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scrapbookItems, setScrapbookItems] = useState<ScrapbookItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
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
  const selectedItem = useMemo(
    () => scrapbookItems.find((item) => item.id === selectedItemId) || null,
    [scrapbookItems, selectedItemId]
  );
  const scrapbookStorageKey = useMemo(
    () => (user ? `travel-journal-scrapbook:${user.id}` : null),
    [user]
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
      setEntriesLoading(true);
      const response = await fetchJournalEntries(user.id);
      setEntriesLoading(false);

      if (response.success && response.data) {
        setEntries(response.data as SavedEntry[]);
      }
    };

    loadEntries();
  }, [router, user, isLoading]);

  useEffect(() => {
    if (!scrapbookStorageKey) {
      return;
    }

    let isCurrent = true;
    scrapbookLoadedRef.current = false;

    queueMicrotask(() => {
      if (!isCurrent) {
        return;
      }

      try {
        const savedBoard = window.localStorage.getItem(scrapbookStorageKey);

        if (savedBoard) {
          const parsed = JSON.parse(savedBoard) as { items?: ScrapbookItem[] };
          setScrapbookItems(Array.isArray(parsed.items) ? parsed.items : []);
        } else {
          setScrapbookItems([]);
        }

        setStorageWarning(null);
      } catch {
        setStorageWarning('This scrapbook could not be restored on this device.');
        setScrapbookItems([]);
      } finally {
        scrapbookLoadedRef.current = true;
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [scrapbookStorageKey]);

  useEffect(() => {
    if (!scrapbookStorageKey || !scrapbookLoadedRef.current) {
      return;
    }

    try {
      window.localStorage.setItem(scrapbookStorageKey, JSON.stringify({ items: scrapbookItems }));
    } catch {
      queueMicrotask(() => {
        setStorageWarning('This board is full on this device. Remove a few large photos before adding more.');
      });
    }
  }, [scrapbookItems, scrapbookStorageKey]);

  if (isLoading || !user) {
    return null;
  }

  const bringToFront = (itemId: string) => {
    setScrapbookItems((current) => {
      const nextZIndex = current.reduce((highest, item) => Math.max(highest, item.zIndex), 0) + 1;

      return current.map((item) => (item.id === itemId ? { ...item, zIndex: nextZIndex } : item));
    });
  };

  const updateScrapbookItem = (itemId: string, updates: Partial<ScrapbookItem>) => {
    setScrapbookItems((current) =>
      current.map((item) => (item.id === itemId ? ({ ...item, ...updates } as ScrapbookItem) : item))
    );
  };

  const deleteScrapbookItem = (itemId: string) => {
    setScrapbookItems((current) => current.filter((item) => item.id !== itemId));
    setSelectedItemId((current) => (current === itemId ? null : current));
    setStorageWarning(null);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, item: ScrapbookItem) => {
    const board = boardRef.current;

    if (!board) {
      return;
    }

    event.preventDefault();
    const boardRect = board.getBoundingClientRect();
    setSelectedItemId(item.id);
    bringToFront(item.id);
    setDragState({
      id: item.id,
      offsetX: event.clientX - boardRect.left - item.x,
      offsetY: event.clientY - boardRect.top - item.y,
    });
    board.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const board = boardRef.current;

    if (!board || !dragState) {
      return;
    }

    const boardRect = board.getBoundingClientRect();

    setScrapbookItems((current) =>
      current.map((item) => {
        if (item.id !== dragState.id) {
          return item;
        }

        return {
          ...item,
          x: clamp(event.clientX - boardRect.left - dragState.offsetX, 0, Math.max(0, boardRect.width - item.width)),
          y: clamp(event.clientY - boardRect.top - dragState.offsetY, 0, Math.max(0, boardRect.height - item.height)),
        };
      })
    );
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (boardRef.current?.hasPointerCapture(event.pointerId)) {
      boardRef.current.releasePointerCapture(event.pointerId);
    }

    setDragState(null);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));

    if (files.length === 0) {
      return;
    }

    const currentLength = scrapbookItems.length;
    const boardWidth = boardRef.current?.clientWidth || 720;

    try {
      const photoSources = await Promise.all(files.map(readPhotoFile));
      const newItems = photoSources.map<ScrapbookPhotoItem>((src, index) => {
        const itemNumber = currentLength + index;
        const maxX = Math.max(24, boardWidth - PHOTO_WIDTH - 24);

        return {
          id: createId(),
          type: 'photo',
          src,
          alt: files[index].name,
          caption: files[index].name.replace(/\.[^/.]+$/, ''),
          x: clamp(28 + (itemNumber % 4) * 44, 16, maxX),
          y: 34 + (itemNumber % 3) * 38,
          width: PHOTO_WIDTH,
          height: PHOTO_HEIGHT,
          rotation: [-6, 4, -3, 5][itemNumber % 4],
          zIndex: itemNumber + 1,
        };
      });

      setScrapbookItems((current) => [...current, ...newItems]);
      setSelectedItemId(newItems[newItems.length - 1]?.id || null);
      setStorageWarning(null);
    } catch {
      setStorageWarning('One of those photos could not be added.');
    } finally {
      event.target.value = '';
    }
  };

  const addNote = () => {
    const itemNumber = scrapbookItems.length;
    const boardWidth = boardRef.current?.clientWidth || 720;
    const maxX = Math.max(24, boardWidth - NOTE_WIDTH - 24);
    const note: ScrapbookNoteItem = {
      id: createId(),
      type: 'note',
      text: '',
      color: noteColors[itemNumber % noteColors.length],
      x: clamp(64 + (itemNumber % 5) * 36, 16, maxX),
      y: 78 + (itemNumber % 4) * 42,
      width: NOTE_WIDTH,
      height: NOTE_HEIGHT,
      rotation: [-4, 3, -2, 5][itemNumber % 4],
      zIndex: itemNumber + 1,
    };

    setScrapbookItems((current) => [...current, note]);
    setSelectedItemId(note.id);
    setStorageWarning(null);
  };

  const nudgeSelectedItem = (deltaX: number, deltaY: number) => {
    const boardRect = boardRef.current?.getBoundingClientRect();

    setScrapbookItems((current) =>
      current.map((item) => {
        if (item.id !== selectedItemId) {
          return item;
        }

        return {
          ...item,
          x: clamp(item.x + deltaX, 0, Math.max(0, (boardRect?.width || 720) - item.width)),
          y: clamp(item.y + deltaY, 0, Math.max(0, (boardRect?.height || 620) - item.height)),
        };
      })
    );
  };

  const handleItemKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, itemId: string) => {
    const step = event.shiftKey ? 24 : 8;

    setSelectedItemId(itemId);

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteScrapbookItem(itemId);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nudgeSelectedItem(-step, 0);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      nudgeSelectedItem(step, 0);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      nudgeSelectedItem(0, -step);
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      nudgeSelectedItem(0, step);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    setError(null);
    setSaving(true);

    const response = await createJournalEntry({
      userId: user.id,
      countryId: form.countryId,
      title: form.title,
      content: form.content,
      mood: form.mood,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });

    setSaving(false);

    if (response.success && response.data) {
      setEntries((current) => [response.data as SavedEntry, ...current]);
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
        description="Build each trip as a scrapbook page with photos, notes, and saved memories."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-gold/25 bg-[#fff8ea] p-4 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-ink">Scrapbook Page</h2>
                <p className="text-sm text-ink/65">{currentCountry?.name || form.countryId}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handlePhotoUpload}
                />
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  Add Photos
                </Button>
                <Button type="button" variant="outline" onClick={addNote}>
                  Add Note
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={scrapbookItems.length === 0}
                  onClick={() => {
                    setScrapbookItems([]);
                    setSelectedItemId(null);
                    setStorageWarning(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>

            {storageWarning ? (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {storageWarning}
              </p>
            ) : null}

            <div
              ref={boardRef}
              className="relative h-[620px] overflow-hidden rounded-lg border border-gold/30 bg-[#f4e5bd] shadow-inner touch-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(61, 43, 14, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(61, 43, 14, 0.07) 1px, transparent 1px)',
                backgroundSize: '34px 34px',
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
            >
              {scrapbookItems.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-ink/45">
                  <p className="max-w-sm text-lg">No photos or notes yet.</p>
                </div>
              ) : null}

              {scrapbookItems.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={item.type === 'photo' ? `Photo ${item.caption}` : 'Scrapbook note'}
                  className={[
                    'absolute select-none outline-none transition-shadow',
                    dragState?.id === item.id ? 'cursor-grabbing' : 'cursor-grab',
                    selectedItemId === item.id ? 'drop-shadow-2xl' : 'drop-shadow-md',
                  ].join(' ')}
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    minHeight: item.height,
                    transform: `rotate(${item.rotation}deg)`,
                    zIndex: item.zIndex,
                  }}
                  onPointerDown={(event) => handlePointerDown(event, item)}
                  onKeyDown={(event) => handleItemKeyDown(event, item.id)}
                >
                  {item.type === 'photo' ? (
                    <div
                      className={[
                        'border bg-white p-2 pb-9',
                        selectedItemId === item.id ? 'border-gold-deep' : 'border-ink/10',
                      ].join(' ')}
                    >
                      <Image
                        src={item.src}
                        alt={item.alt}
                        width={PHOTO_WIDTH - 16}
                        height={150}
                        unoptimized
                        className="h-[150px] w-full bg-cream object-cover"
                      />
                      <input
                        aria-label="Photo caption"
                        value={item.caption}
                        onChange={(event) => updateScrapbookItem(item.id, { caption: event.target.value })}
                        onPointerDown={(event) => event.stopPropagation()}
                        className="absolute inset-x-3 bottom-2 bg-transparent text-center font-script text-lg text-ink outline-none"
                      />
                    </div>
                  ) : (
                    <div
                      className={[
                        'h-full border p-3 shadow-soft',
                        selectedItemId === item.id ? 'border-gold-deep' : 'border-ink/10',
                      ].join(' ')}
                      style={{ backgroundColor: item.color }}
                    >
                      <div className="mb-2 h-3 w-12 bg-white/55" />
                      <textarea
                        aria-label="Note text"
                        value={item.text}
                        onChange={(event) => updateScrapbookItem(item.id, { text: event.target.value })}
                        onPointerDown={(event) => event.stopPropagation()}
                        placeholder="Memory..."
                        className="h-[128px] w-full resize-none bg-transparent font-script text-2xl leading-7 text-ink outline-none placeholder:text-ink/35"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-gold/25 bg-white p-5 shadow-soft">
              <h3 className="mb-4 text-xl font-semibold text-ink">Entry Details</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
                <Input
                  label="Country"
                  value={form.countryId}
                  onChange={(event) => setForm({ ...form, countryId: event.target.value })}
                  list="countries"
                />
                <datalist id="countries">
                  {placeholderCountries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </datalist>
                <Input
                  label="Mood"
                  value={form.mood}
                  onChange={(event) => setForm({ ...form, mood: event.target.value })}
                />
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">Story</label>
                  <textarea
                    value={form.content}
                    onChange={(event) => setForm({ ...form, content: event.target.value })}
                    rows={5}
                    className="w-full rounded-lg border-2 border-gold/30 bg-cream/50 px-4 py-3 text-ink placeholder-ink/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    required
                  />
                </div>
                <Input
                  label="Tags"
                  value={form.tags}
                  onChange={(event) => setForm({ ...form, tags: event.target.value })}
                  placeholder="market, sunset, train"
                />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <Button type="submit" isLoading={saving} className="w-full">
                  Save Entry
                </Button>
              </form>
            </section>

            <section className="rounded-lg border border-gold/25 bg-white p-5 shadow-soft">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-ink">Selected Piece</h3>
                {selectedItem ? <span className="text-xs uppercase tracking-wide text-ink/50">{selectedItem.type}</span> : null}
              </div>
              {selectedItem ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => bringToFront(selectedItem.id)}>
                    Bring Front
                  </Button>
                  <Button type="button" variant="outline" onClick={() => deleteScrapbookItem(selectedItem.id)}>
                    Remove
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => nudgeSelectedItem(-16, 0)}>
                    Left
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => nudgeSelectedItem(16, 0)}>
                    Right
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => nudgeSelectedItem(0, -16)}>
                    Up
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => nudgeSelectedItem(0, 16)}>
                    Down
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-ink/60">No piece selected.</p>
              )}
            </section>

            <section className="rounded-lg border border-gold/25 bg-white p-5 shadow-soft">
              <h3 className="mb-4 text-xl font-semibold text-ink">Recent Entries</h3>
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {entriesLoading ? (
                  <p className="text-ink/60">Loading entries...</p>
                ) : entries.length === 0 ? (
                  <p className="text-ink/60">No journal entries yet.</p>
                ) : (
                  entries.map((entry) => (
                    <article key={entry.id} className="rounded-lg border border-gold/20 bg-cream/55 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-semibold text-ink">{entry.title}</h4>
                        <time className="shrink-0 text-xs text-ink/60" dateTime={getEntryDate(entry)}>
                          {new Date(getEntryDate(entry)).toLocaleDateString()}
                        </time>
                      </div>
                      <p className="mt-2 line-clamp-3 text-ink/70">{entry.content}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/70">
                        {getEntryCountry(entry) ? <span>{getEntryCountry(entry)}</span> : null}
                        {entry.mood ? <span>{entry.mood}</span> : null}
                        {entry.tags?.map((tag) => (
                          <span key={tag} className="rounded-full border border-gold/20 bg-white px-2 py-1">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </PageShell>
    </div>
  );
}
