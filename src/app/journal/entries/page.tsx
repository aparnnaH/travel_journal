// Saved journal entries browser.
// This page focuses on listing, searching, opening, editing, sharing, deleting,
// and commenting on owned/shared entries outside the Canva-first workspace.
'use client';

import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, Download, MessageCircle, PencilLine, Search, Send, Share2, Star, UserRoundCheck, UsersRound, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import AppPageSkeleton, { InlineLoadingSkeleton } from '@/components/loading/PageSkeletons';
import { Button, Input } from '@/components/ui';
import InstagramEmbed from '@/components/journal/InstagramEmbed';
import { fetchFriends } from '@/lib/friendService';
import {
  createJournalComment,
  deleteJournalEntry,
  fetchJournalEntry,
  fetchJournalComments,
  fetchJournalEntries,
  fetchJournalEntryShares,
  fetchSharedJournalEntry,
  fetchSharedJournalEntries,
  publishJournalEntryToDemoEntries,
  publishJournalEntryToDemoShared,
  saveJournalEntryShares,
  updateJournalEntry,
  updateJournalEntryFavorite,
} from '@/lib/journalService';
import { decodeJournalContentWithCanva } from '@/lib/journalCanvaPayload';
import { sanitizeInstagramEmbedUrls } from '@/lib/instagramEmbeds';
import {
  formatJournalDateRange,
  getJournalDateRangeError,
  getJournalDateRangeErrors,
  getTodayJournalDate,
  normalizeJournalDate,
} from '@/lib/journalDates';
import { placeholderCountries } from '@/lib/placeholderData';
import { hasJournalFavoriteTag, removeJournalFavoriteTags } from '@/lib/journalFavorites';
import { useAuthStore } from '@/store/authStore';
import type { JournalEntry } from '@/types';
import type { Friendship } from '@/types/friends';
import type { JournalComment } from '@/types/journalComments';
import type { SharedJournalEntry } from '@/types/journalSharing';

type SavedEntry = JournalEntry & {
  country_id?: string;
  created_at?: string;
  isSummary?: boolean;
};

type EntryCardData = SavedEntry | SharedJournalEntry;
type JournalSearchScope = 'all' | 'title' | 'country' | 'tag' | 'text';

type EditEntryForm = {
  title: string;
  content: string;
  countryId: string;
  mood: string;
  tags: string;
  tripStartDate: string;
  tripEndDate: string;
};

type InsertedJournalPhoto = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
};

const ENTRY_BATCH_SIZE = 3;
const journalEntryDeepLinkStorageKey = 'travel-journal:country-explorer-entry';
const searchScopeOptions: { value: JournalSearchScope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'title', label: 'Title' },
  { value: 'country', label: 'Country' },
  { value: 'tag', label: 'Tag' },
  { value: 'text', label: 'Text' },
];

// Entry data can be normalized or raw database rows, so these helpers hide
// field-shape differences from the rendering code.
const getEntryDate = (entry: EntryCardData) => entry.createdAt || entry.created_at || new Date().toISOString();
const getEntryCountry = (entry: EntryCardData) => entry.countryId || entry.country_id || '';
const formatEntryCountry = (countryId: string) =>
  placeholderCountries.find((country) => country.id === countryId)?.name || '';
const getEntryCountryLabel = (entry: EntryCardData) => formatEntryCountry(getEntryCountry(entry));
const getEntryContent = (entry: EntryCardData) => decodeJournalContentWithCanva(String(entry.content || '')).content;
const getEntryFallbackTripDate = (entry: EntryCardData) => normalizeJournalDate(getEntryDate(entry));
const getEntryTripStartDate = (entry: EntryCardData) =>
  entry.tripStartDate ||
  entry.trip_start_date ||
  decodeJournalContentWithCanva(String(entry.content || '')).canva?.tripStartDate ||
  getEntryFallbackTripDate(entry);
const getEntryTripEndDate = (entry: EntryCardData) =>
  entry.tripEndDate ||
  entry.trip_end_date ||
  decodeJournalContentWithCanva(String(entry.content || '')).canva?.tripEndDate ||
  getEntryTripStartDate(entry);
const isSummaryEntry = (entry: EntryCardData) => Boolean((entry as { isSummary?: boolean }).isSummary);
const isFavoriteEntry = (entry: EntryCardData) => hasJournalFavoriteTag(entry.tags);
const getVisibleEntryTags = (entry: EntryCardData) => removeJournalFavoriteTags(entry.tags);
// Reads Canva images from structured fields first, then legacy embedded payloads.
const getEntryCanvaPages = (entry: EntryCardData | null) => {
  const fallbackPages = entry ? decodeJournalContentWithCanva(String(entry.content || '')).canva?.pages : [];
  const pages = entry?.canvaPages ?? entry?.canva_pages ?? fallbackPages ?? [];
  return Array.isArray(pages)
    ? pages.filter((page): page is string => typeof page === 'string' && page.startsWith('data:image/'))
    : [];
};
const getEntryCoverPageIndex = (entry: EntryCardData) => {
  const decodedCoverIndex = decodeJournalContentWithCanva(String(entry.content || '')).canva?.coverPageIndex;

  return typeof entry.coverPageIndex === 'number'
    ? entry.coverPageIndex
    : typeof decodedCoverIndex === 'number'
      ? decodedCoverIndex
      : 0;
};
const getEntryCoverPhoto = (entry: EntryCardData) => {
  const decodedCanva = decodeJournalContentWithCanva(String(entry.content || '')).canva;
  const pages = getEntryCanvaPages(entry);
  const coverPageIndex = Math.min(Math.max(getEntryCoverPageIndex(entry), 0), Math.max(0, pages.length - 1));

  return entry.coverPhoto || decodedCanva?.coverPhoto || pages[coverPageIndex] || pages[0] || null;
};
const getEntryInsertedPhotos = (entry: EntryCardData) => {
  const decodedPhotos = decodeJournalContentWithCanva(String(entry.content || '')).canva?.insertedPhotos ?? entry.insertedPhotos ?? [];

  return Array.isArray(decodedPhotos)
    ? decodedPhotos.filter(
        (photo): photo is InsertedJournalPhoto =>
          Boolean(photo) && typeof photo.src === 'string' && photo.src.startsWith('data:image/')
      )
    : [];
};
const getEntryInstagramEmbeds = (entry: EntryCardData) =>
  sanitizeInstagramEmbedUrls(
    decodeJournalContentWithCanva(String(entry.content || '')).canva?.instagramEmbeds ?? entry.instagramEmbeds ?? []
  );
const getEntryCanvaDesignTitle = (entry: EntryCardData) =>
  entry.canvaDesignTitle ||
  entry.canva_design_title ||
  decodeJournalContentWithCanva(String(entry.content || '')).canva?.designTitle ||
  '';
const getEntryCanvaDesignEditUrl = (entry: EntryCardData) =>
  entry.canvaDesignEditUrl ||
  entry.canva_design_edit_url ||
  decodeJournalContentWithCanva(String(entry.content || '')).canva?.designEditUrl ||
  '';
// Summary list responses omit heavy image payloads, so entries may need a full
// hydration fetch before showing a cover.
const needsEntryCoverHydration = (entry: EntryCardData) =>
  !getEntryCoverPhoto(entry) &&
  (isSummaryEntry(entry) || typeof entry.content !== 'string' || entry.content.length === 0);

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getInstagramPostLabel = (url: string, index: number) => {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const postId = pathParts.find((part, partIndex) => ['p', 'reel', 'tv'].includes(pathParts[partIndex - 1] || ''));

    return postId ? `Instagram ${postId}` : `Instagram post ${index + 1}`;
  } catch {
    return `Instagram post ${index + 1}`;
  }
};

const createStandaloneJournalHtml = (entry: EntryCardData, options?: { sharedBy?: string }) => {
  const title = entry.title.trim() || 'Travel Journal Entry';
  const countryLabel = getEntryCountryLabel(entry);
  const dateRange = formatJournalDateRange(getEntryTripStartDate(entry), getEntryTripEndDate(entry));
  const exportedAt = new Date().toLocaleDateString();
  const canvaPages = getEntryCanvaPages(entry);
  const insertedPhotos = getEntryInsertedPhotos(entry);
  const instagramEmbeds = getEntryInstagramEmbeds(entry);
  const story = getEntryContent(entry).trim();
  const tags = getVisibleEntryTags(entry);
  const canvaDesignTitle = getEntryCanvaDesignTitle(entry);
  const canvaDesignEditUrl = getEntryCanvaDesignEditUrl(entry);
  const metaItems = [
    countryLabel,
    dateRange,
    entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : '',
    options?.sharedBy ? `Shared by ${options.sharedBy}` : '',
  ].filter(Boolean);
  const renderImageFigure = (src: string, label: string, caption?: string) => `
    <figure class="memory-figure">
      <img src="${src}" alt="${escapeHtml(label)}" />
      ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}
    </figure>`;
  const renderInstagramPreviewCard = (url: string, index: number) => {
    const label = getInstagramPostLabel(url, index);
    const safeUrl = escapeHtml(url);

    return `
    <blockquote class="instagram-media instagram-embed-shell" data-instgrm-permalink="${safeUrl}" data-instgrm-version="14">
      <article class="instagram-card">
        <div class="instagram-visual" aria-hidden="true">
          <span class="instagram-lens"></span>
          <span class="instagram-dot"></span>
        </div>
        <div class="instagram-copy">
          <p class="instagram-kicker">Instagram memory</p>
          <h3>${escapeHtml(label)}</h3>
          <p>${safeUrl}</p>
          <a href="${safeUrl}" target="_blank" rel="noreferrer">Open on Instagram</a>
        </div>
      </article>
    </blockquote>`;
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - Travel Journal</title>
  <style>
    :root { color-scheme: light; --ink: #2f271f; --muted: #765f45; --paper: #fffaf0; --line: #e8d8b8; --gold: #b6842d; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f7f0df; color: var(--ink); font-family: Georgia, 'Times New Roman', serif; }
    main { width: min(920px, calc(100% - 32px)); margin: 32px auto; border: 1px solid var(--line); background: var(--paper); padding: clamp(22px, 4vw, 44px); box-shadow: 0 24px 70px rgba(47, 39, 31, 0.14); }
    .eyebrow { margin: 0 0 10px; color: var(--gold); font: 700 12px/1.4 Arial, sans-serif; letter-spacing: 0.16em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(34px, 7vw, 68px); line-height: 0.96; letter-spacing: 0; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 22px 0 0; padding: 0; list-style: none; font: 700 13px/1.4 Arial, sans-serif; color: var(--muted); }
    .meta li, .tag { border: 1px solid var(--line); border-radius: 999px; background: #fffdf7; padding: 7px 10px; }
    section { margin-top: 30px; }
    h2 { margin: 0 0 14px; font: 700 18px/1.2 Arial, sans-serif; color: var(--ink); }
    .story { white-space: pre-wrap; font-size: 18px; line-height: 1.8; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .memory-figure { margin: 0; overflow: hidden; border: 1px solid var(--line); background: #fffdf7; }
    .memory-figure img { display: block; width: 100%; height: auto; }
    figcaption { padding: 10px 12px; font: 700 13px/1.4 Arial, sans-serif; color: var(--muted); }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .links { margin: 0; padding-left: 20px; font: 15px/1.7 Arial, sans-serif; }
    .instagram-list { display: grid; gap: 14px; }
    .instagram-embed-shell { margin: 0; min-width: 0 !important; max-width: 540px !important; width: 100% !important; border: 0; background: transparent; }
    .instagram-card { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 16px; align-items: center; border: 1px solid var(--line); background: #fffdf7; padding: 14px; }
    .instagram-visual { position: relative; aspect-ratio: 1; border-radius: 24px; background: linear-gradient(135deg, #f9ce34 0%, #ee2a7b 45%, #6228d7 100%); box-shadow: inset 0 0 0 7px rgba(255, 255, 255, 0.76); }
    .instagram-lens { position: absolute; inset: 29%; border: 6px solid #fff; border-radius: 999px; }
    .instagram-dot { position: absolute; right: 25%; top: 24%; width: 11px; height: 11px; border-radius: 999px; background: #fff; }
    .instagram-copy { min-width: 0; font-family: Arial, sans-serif; }
    .instagram-kicker { margin: 0 0 4px; color: var(--gold); font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
    .instagram-copy h3 { margin: 0; font-size: 18px; line-height: 1.25; }
    .instagram-copy p { margin: 6px 0 10px; overflow-wrap: anywhere; color: var(--muted); font-size: 13px; line-height: 1.5; }
    .instagram-copy a { display: inline-flex; border: 1px solid var(--line); background: #fff7e6; padding: 8px 10px; border-radius: 999px; font-size: 13px; font-weight: 700; text-decoration: none; }
    a { color: #7a4c09; }
    footer { margin-top: 36px; border-top: 1px solid var(--line); padding-top: 16px; color: var(--muted); font: 13px/1.6 Arial, sans-serif; }
    @media (max-width: 560px) { .instagram-card { grid-template-columns: 72px minmax(0, 1fr); } .instagram-visual { border-radius: 18px; } }
    @media print { body { background: #fff; } main { width: 100%; margin: 0; border: 0; box-shadow: none; } }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Travel Journal Memory</p>
    <h1>${escapeHtml(title)}</h1>
    ${metaItems.length ? `<ul class="meta">${metaItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
    ${canvaPages.length ? `<section><h2>Canva Pages</h2><div class="grid">${canvaPages.map((page, index) => renderImageFigure(page, `Canva page ${index + 1}`)).join('')}</div></section>` : ''}
    ${insertedPhotos.length ? `<section><h2>Memory Photos</h2><div class="grid">${insertedPhotos.map((photo, index) => renderImageFigure(photo.src, photo.alt || `Memory photo ${index + 1}`, photo.caption)).join('')}</div></section>` : ''}
    ${instagramEmbeds.length ? `<section><h2>Instagram Posts</h2><div class="instagram-list">${instagramEmbeds.map((embed, index) => renderInstagramPreviewCard(embed.url, index)).join('')}</div></section>` : ''}
    ${story ? `<section><h2>Story</h2><div class="story">${escapeHtml(story)}</div></section>` : ''}
    ${tags.length ? `<section><h2>Tags</h2><div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div></section>` : ''}
    ${canvaDesignEditUrl ? `<section><h2>Saved Links</h2><ul class="links"><li><a href="${escapeHtml(canvaDesignEditUrl)}">${escapeHtml(canvaDesignTitle || 'Open Canva design')}</a></li></ul></section>` : ''}
    <footer>Exported from Travel Journal on ${escapeHtml(exportedAt)}. This file is a standalone memory snapshot; live Canva editing still requires Canva.</footer>
  </main>
  ${instagramEmbeds.length ? '<script async src="https://www.instagram.com/embed.js"></script>' : ''}
</body>
</html>`;
};

const createJournalExportFileName = (entry: EntryCardData) => {
  const cleanTitle = (entry.title || 'travel-journal-entry')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

  return `${cleanTitle || 'travel-journal-entry'}.html`;
};

const readCountryExplorerEntryHandoff = (entryId: string) => {
  try {
    const rawEntry = window.sessionStorage.getItem(journalEntryDeepLinkStorageKey);
    if (!rawEntry) return null;

    window.sessionStorage.removeItem(journalEntryDeepLinkStorageKey);
    const parsedEntry = JSON.parse(rawEntry) as SavedEntry;

    return parsedEntry?.id === entryId ? parsedEntry : null;
  } catch {
    return null;
  }
};

// Protected entries page that coordinates owned entries, shared entries, search,
// editing, sharing, comments, and deletion.
export default function JournalEntriesPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkedEntryId = searchParams.get('entryId')?.trim() ?? '';
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [entryCount, setEntryCount] = useState(0);
  const [hasMoreEntries, setHasMoreEntries] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entryPage, setEntryPage] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sharedEntries, setSharedEntries] = useState<SharedJournalEntry[]>([]);
  const [sharedEntryCount, setSharedEntryCount] = useState(0);
  const [hasMoreSharedEntries, setHasMoreSharedEntries] = useState(false);
  const [sharedEntryPage, setSharedEntryPage] = useState(0);
  const [sharedEntriesLoading, setSharedEntriesLoading] = useState(true);
  const [sharedLoadError, setSharedLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<JournalSearchScope>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [acceptedFriends, setAcceptedFriends] = useState<Friendship[]>([]);
  const [openedEntry, setOpenedEntry] = useState<SavedEntry | null>(null);
  const [openedSharedEntry, setOpenedSharedEntry] = useState<SharedJournalEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<SavedEntry | null>(null);
  const [editForm, setEditForm] = useState<EditEntryForm>({
    title: '',
    content: '',
    countryId: '',
    mood: '',
    tags: '',
    tripStartDate: getTodayJournalDate(),
    tripEndDate: getTodayJournalDate(),
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [entryPendingDelete, setEntryPendingDelete] = useState<SavedEntry | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sharingEntryId, setSharingEntryId] = useState<string | null>(null);
  const [selectedShareFriendIds, setSelectedShareFriendIds] = useState<string[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [commentEntryId, setCommentEntryId] = useState<string | null>(null);
  const [commentsByEntry, setCommentsByEntry] = useState<Record<string, JournalComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSavingEntryId, setCommentSavingEntryId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [demoCopyNotice, setDemoCopyNotice] = useState<{ title: string } | null>(null);
  const [demoCopySaving, setDemoCopySaving] = useState(false);
  const [demoSharedCopySaving, setDemoSharedCopySaving] = useState(false);
  const [exportingEntryId, setExportingEntryId] = useState<string | null>(null);
  const [demoPublishAccess, setDemoPublishAccess] = useState<{ userId: string; canPublish: boolean } | null>(null);
  const openedDeepLinkEntryIdRef = useRef<string | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const activeSearchQuery = deferredSearchQuery.trim();
  const isSearching = activeSearchQuery.length > 0;
  const hasEntryFilters = isSearching || showFavoritesOnly;
  const entryPageStart = entryCount === 0 ? 0 : entryPage * ENTRY_BATCH_SIZE + 1;
  const entryPageEnd = Math.min(entryPage * ENTRY_BATCH_SIZE + entries.length, entryCount);
  const sharedEntryPageStart = sharedEntryCount === 0 ? 0 : sharedEntryPage * ENTRY_BATCH_SIZE + 1;
  const sharedEntryPageEnd = Math.min(sharedEntryPage * ENTRY_BATCH_SIZE + sharedEntries.length, sharedEntryCount);
  const canPublishEntriesToDemo = Boolean(user && demoPublishAccess?.userId === user.id && demoPublishAccess.canPublish);
  const editCountryOptions = useMemo(() => {
    const countryOptions = new Map(
      placeholderCountries.map((country) => [
        country.id,
        {
          id: country.id,
          name: country.name,
        },
      ])
    );

    if (editingEntry) {
      const currentCountryId = getEntryCountry(editingEntry);
      const currentCountryName = formatEntryCountry(currentCountryId);

      if (currentCountryId && currentCountryName && !countryOptions.has(currentCountryId)) {
        countryOptions.set(currentCountryId, {
          id: currentCountryId,
          name: currentCountryName,
        });
      }
    }

    return Array.from(countryOptions.values()).sort((firstCountry, secondCountry) =>
      firstCountry.name.localeCompare(secondCountry.name, undefined, { sensitivity: 'base' })
    );
  }, [editingEntry]);
  const editDateRangeErrors = getJournalDateRangeErrors(editForm.tripStartDate, editForm.tripEndDate);

  useEffect(() => {
    // Protects the entries page and loads accepted friends for sharing controls.
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!user) {
      return;
    }

    let isCurrent = true;

    const loadInitialEntries = async () => {
      setEntriesLoading(true);
      setLoadError(null);

      const response = await fetchJournalEntries({
        limit: ENTRY_BATCH_SIZE,
        offset: entryPage * ENTRY_BATCH_SIZE,
        summary: true,
        search: activeSearchQuery,
        searchScope,
        favoriteOnly: showFavoritesOnly,
      });

      if (!isCurrent) {
        return;
      }

      setEntriesLoading(false);

      if (!response.success || !response.data) {
        setLoadError(response.error || 'Could not load journal entries.');
        return;
      }

      setEntries(response.data as SavedEntry[]);
      setEntryCount(response.count ?? response.data.length);
      setHasMoreEntries(Boolean(response.hasMore));
    };

    void loadInitialEntries();

    return () => {
      isCurrent = false;
    };
  }, [activeSearchQuery, entryPage, router, searchScope, showFavoritesOnly, user, isLoading]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isCurrent = true;

    const loadDemoPublishAccess = async () => {
      const response = await fetch('/api/demo/publish');
      const result = (await response.json().catch(() => null)) as { success?: boolean; canPublish?: boolean } | null;

      if (!isCurrent) {
        return;
      }

      setDemoPublishAccess({
        userId: user.id,
        canPublish: Boolean(response.ok && result?.success && result.canPublish),
      });
    };

    void loadDemoPublishAccess();

    return () => {
      isCurrent = false;
    };
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!user) {
      return;
    }

    let isCurrent = true;

    const loadInitialSharedEntries = async () => {
      setSharedEntriesLoading(true);
      setSharedLoadError(null);

      const response = await fetchSharedJournalEntries({
        limit: ENTRY_BATCH_SIZE,
        offset: sharedEntryPage * ENTRY_BATCH_SIZE,
        summary: true,
        search: activeSearchQuery,
        searchScope,
      });

      if (!isCurrent) {
        return;
      }

      setSharedEntriesLoading(false);

      if (!response.success || !response.data) {
        setSharedLoadError(response.error || 'Could not load shared journal entries.');
        return;
      }

      setSharedEntries(response.data);
      setSharedEntryCount(response.count ?? response.data.length);
      setHasMoreSharedEntries(Boolean(response.hasMore));
    };

    void loadInitialSharedEntries();

    return () => {
      isCurrent = false;
    };
  }, [activeSearchQuery, router, searchScope, sharedEntryPage, user, isLoading]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!user) {
      return;
    }

    const loadFriends = async () => {
      const response = await fetchFriends();

      if (response.success && response.data) {
        setAcceptedFriends(response.data.friends);
      }
    };

    void loadFriends();
  }, [router, user, isLoading]);

  // Summary entries omit heavy image payloads, so this fetches the full row when needed.
  const loadFullEntry = async (entry: SavedEntry) => {
    if (!isSummaryEntry(entry) && typeof entry.content === 'string' && entry.content.length > 0) {
      return entry;
    }

    const response = await fetchJournalEntry(entry.id);

    if (!response.success || !response.data) {
      setLoadError(response.error || 'Could not load this journal entry.');
      return entry;
    }

    const fullEntry = response.data as SavedEntry;
    setEntries((current) =>
      current.map((currentEntry) =>
        currentEntry.id === fullEntry.id ? { ...currentEntry, ...fullEntry, isSummary: false } : currentEntry
      )
    );

    return fullEntry;
  };

  // Opens an owned entry, hydrating it first if the card only has summary data.
  const openSavedEntry = async (entry: SavedEntry) => {
    const fullEntry = await loadFullEntry(entry);
    setOpenedSharedEntry(null);
    setOpenedEntry(fullEntry);
  };

  useEffect(() => {
    if (!user || !deepLinkedEntryId || openedDeepLinkEntryIdRef.current === deepLinkedEntryId) {
      return;
    }

    let isCurrent = true;
    openedDeepLinkEntryIdRef.current = deepLinkedEntryId;

    const openDeepLinkedEntry = async () => {
      const handoffEntry = readCountryExplorerEntryHandoff(deepLinkedEntryId);

      if (handoffEntry && isCurrent) {
        setOpenedSharedEntry(null);
        setOpenedEntry(handoffEntry);
      }

      const response = await fetchJournalEntry(deepLinkedEntryId);

      if (!isCurrent) {
        return;
      }

      if (!response.success || !response.data) {
        setLoadError(response.error || 'Could not load this journal entry.');
        return;
      }

      const fullEntry = response.data as SavedEntry;
      setEntries((current) => {
        const hasEntry = current.some((entry) => entry.id === fullEntry.id);

        return hasEntry
          ? current.map((entry) =>
              entry.id === fullEntry.id ? { ...entry, ...fullEntry, isSummary: false } : entry
            )
          : current;
      });
      setOpenedSharedEntry(null);
      setOpenedEntry({ ...fullEntry, isSummary: false });
    };

    // Country Explorer links here with ?entryId=... so users land directly in
    // the same journal-entry modal used by the archive cards.
    void openDeepLinkedEntry();

    return () => {
      isCurrent = false;
    };
  }, [deepLinkedEntryId, user]);

  // Hydrates a shared entry before opening if summary mode omitted heavy data.
  const loadFullSharedEntry = async (entry: SharedJournalEntry) => {
    if (!isSummaryEntry(entry) && typeof entry.content === 'string' && entry.content.length > 0) {
      return entry;
    }

    const response = await fetchSharedJournalEntry(entry.id);

    if (!response.success || !response.data) {
      setSharedLoadError(response.error || 'Could not load this shared journal entry.');
      return entry;
    }

    const fullEntry = response.data;
    setSharedEntries((current) =>
      current.map((currentEntry) =>
        currentEntry.id === fullEntry.id && currentEntry.sharedBy.id === fullEntry.sharedBy.id
          ? { ...currentEntry, ...fullEntry, isSummary: false }
          : currentEntry
      )
    );

    return fullEntry;
  };

  useEffect(() => {
    if (!user || entries.length === 0) {
      return;
    }

    const summaryEntriesWithoutCovers = entries.filter(needsEntryCoverHydration);

    if (summaryEntriesWithoutCovers.length === 0) {
      return;
    }

    let isCurrent = true;

    const hydrateVisibleEntryCovers = async () => {
      const hydratedEntries = await Promise.all(
        summaryEntriesWithoutCovers.map(async (entry) => {
          const response = await fetchJournalEntry(entry.id);

          return response.success && response.data ? (response.data as SavedEntry) : null;
        })
      );

      if (!isCurrent) {
        return;
      }

      const hydratedById = new Map(
        hydratedEntries
          .filter((entry): entry is SavedEntry => Boolean(entry))
          .map((entry) => [entry.id, entry])
      );

      if (hydratedById.size === 0) {
        return;
      }

      setEntries((current) =>
        current.map((entry) =>
          hydratedById.has(entry.id)
            ? { ...entry, ...hydratedById.get(entry.id), isSummary: false }
            : entry
        )
      );
    };

    void hydrateVisibleEntryCovers();

    return () => {
      isCurrent = false;
    };
  }, [entries, user]);

  useEffect(() => {
    if (!user || sharedEntries.length === 0) {
      return;
    }

    const summarySharedEntriesWithoutCovers = sharedEntries.filter(
      needsEntryCoverHydration
    );

    if (summarySharedEntriesWithoutCovers.length === 0) {
      return;
    }

    let isCurrent = true;

    const hydrateVisibleSharedEntryCovers = async () => {
      const hydratedEntries = await Promise.all(
        summarySharedEntriesWithoutCovers.map(async (entry) => {
          const response = await fetchSharedJournalEntry(entry.id);

          return response.success && response.data ? response.data : null;
        })
      );

      if (!isCurrent) {
        return;
      }

      const hydratedByKey = new Map(
        hydratedEntries
          .filter((entry): entry is SharedJournalEntry => Boolean(entry))
          .map((entry) => [`${entry.id}:${entry.sharedBy.id}`, entry])
      );

      if (hydratedByKey.size === 0) {
        return;
      }

      setSharedEntries((current) =>
        current.map((entry) => {
          const hydratedEntry = hydratedByKey.get(`${entry.id}:${entry.sharedBy.id}`);

          return hydratedEntry ? { ...entry, ...hydratedEntry, isSummary: false } : entry;
        })
      );
    };

    void hydrateVisibleSharedEntryCovers();

    return () => {
      isCurrent = false;
    };
  }, [sharedEntries, user]);

  // Opens a shared entry modal.
  const openSharedEntry = async (entry: SharedJournalEntry) => {
    const fullEntry = await loadFullSharedEntry(entry);

    setOpenedEntry(null);
    setOpenedSharedEntry(fullEntry);
  };

  // Sends owned entries back to the full journal workspace for editing.
  const openEditEntry = (entry: SavedEntry) => {
    router.push(`/journal?editEntryId=${encodeURIComponent(entry.id)}`);
  };

  const closeEditEntry = () => {
    if (editSaving) {
      return;
    }

    setEditingEntry(null);
    setEditError(null);
  };

  // Persists full journal edits through the journal service.
  const saveEditedEntry = async () => {
    if (!editingEntry) {
      return;
    }

    const cleanTitle = editForm.title.trim();
    const cleanContent = editForm.content.trim();
    const cleanCountryId = editForm.countryId.trim();
    const cleanMood = editForm.mood.trim();
    const tripDateError = getJournalDateRangeError(editForm.tripStartDate, editForm.tripEndDate);

    if (!cleanTitle || !cleanContent || !cleanCountryId || !cleanMood) {
      setEditError('Add a journal name, story, country, and mood before saving.');
      return;
    }

    if (tripDateError) {
      setEditError(tripDateError);
      return;
    }

    setEditSaving(true);
    setEditError(null);

    const response = await updateJournalEntry({
      entryId: editingEntry.id,
      title: cleanTitle,
      content: cleanContent,
      countryId: cleanCountryId,
      mood: cleanMood,
      tags: editForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      tripStartDate: editForm.tripStartDate,
      tripEndDate: editForm.tripEndDate,
    });

    setEditSaving(false);

    if (!response.success || !response.data) {
      setEditError(response.error || 'Could not update this journal entry.');
      return;
    }

    const updatedEntry = response.data as SavedEntry;

    setEntries((current) => current.map((entry) => (entry.id === updatedEntry.id ? { ...entry, ...updatedEntry } : entry)));
    setOpenedEntry((current) => (current?.id === updatedEntry.id ? { ...current, ...updatedEntry } : current));
    setEditingEntry(null);
    setNotice(`Updated "${updatedEntry.title}".`);
  };

  const requestDeleteEntry = (entry: SavedEntry) => {
    setEntryPendingDelete(entry);
    setDeleteError(null);
    setSharingEntryId(null);
    setCommentEntryId(null);
  };

  // Deletes the selected owned entry and removes it from local list state.
  const confirmDeleteEntry = async () => {
    if (!entryPendingDelete) {
      return;
    }

    setDeleteSaving(true);
    setDeleteError(null);

    const response = await deleteJournalEntry(entryPendingDelete.id);
    setDeleteSaving(false);

    if (!response.success) {
      setDeleteError(response.error || 'Could not delete this journal entry.');
      return;
    }

    setEntries((current) => current.filter((entry) => entry.id !== entryPendingDelete.id));
    setEntryCount((current) => Math.max(0, current - 1));
    setCommentsByEntry((current) => {
      const nextComments = { ...current };
      delete nextComments[entryPendingDelete.id];
      return nextComments;
    });
    setOpenedEntry((current) => (current?.id === entryPendingDelete.id ? null : current));
    setNotice(`Deleted "${entryPendingDelete.title}".`);
    setEntryPendingDelete(null);
  };

  // Loads current share recipients before opening the share panel.
  const openSharePanel = async (entry: SavedEntry) => {
    setSharingEntryId(entry.id);
    setCommentEntryId(null);
    setShareLoading(true);
    setShareError(null);
    setShareNotice(null);

    try {
      const response = await fetchJournalEntryShares(entry.id);
      setShareLoading(false);

      if (!response.success) {
        setShareError(response.error || 'Unable to load share settings.');
        setSelectedShareFriendIds([]);
        return;
      }

      const recipients = response.data ?? [];
      setSelectedShareFriendIds(recipients.map((recipient) => recipient.id));
    } catch {
      setShareLoading(false);
      setSelectedShareFriendIds([]);
      setShareError('Unable to load share settings. Please refresh and try again.');
    }
  };

  const mergeUpdatedFavoriteEntries = (updatedEntries: SavedEntry[]) => {
    if (updatedEntries.length === 0) {
      return;
    }

    const updatedById = new Map(updatedEntries.map((entry) => [entry.id, entry]));

    let removedVisibleFavorites = 0;

    setEntries((current) => {
      const nextEntries = current
        .map((entry) => {
          const updatedEntry = updatedById.get(entry.id);
          return updatedEntry ? { ...entry, ...updatedEntry } : entry;
        })
        .filter((entry) => (showFavoritesOnly ? isFavoriteEntry(entry) : true));

      removedVisibleFavorites = showFavoritesOnly ? current.length - nextEntries.length : 0;

      return nextEntries;
    });
    if (removedVisibleFavorites > 0) {
      setEntryCount((count) => Math.max(0, count - removedVisibleFavorites));
    }
    setOpenedEntry((current) => {
      if (!current) return current;

      const updatedEntry = updatedById.get(current.id);
      return updatedEntry ? { ...current, ...updatedEntry } : current;
    });
  };

  const toggleFavoriteEntry = async (entry: SavedEntry) => {
    const countryLabel = getEntryCountryLabel(entry) || 'this country';
    const nextFavoriteState = !isFavoriteEntry(entry);

    setNotice(null);

    const response = await updateJournalEntryFavorite({
      entryId: entry.id,
      favoriteForCountry: nextFavoriteState,
    });

    if (!response.success || !response.data) {
      setNotice(response.error || 'Could not update this favorite.');
      return;
    }

    mergeUpdatedFavoriteEntries((response.updatedEntries ?? [response.data]) as SavedEntry[]);
    setNotice(
      nextFavoriteState
        ? `Added to favorites for ${countryLabel}.`
        : `Removed from favorites for ${countryLabel}.`
    );
  };

  const toggleShareFriend = (friendId: string) => {
    setSelectedShareFriendIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId]
    );
  };

  // Replaces share recipients for an owned entry.
  const saveEntryShares = async (entryId: string) => {
    setShareSaving(true);
    setShareError(null);
    setShareNotice(null);

    try {
      const response = await saveJournalEntryShares(entryId, selectedShareFriendIds);
      setShareSaving(false);

      if (!response.success) {
        setShareError(response.error || 'Unable to save sharing settings.');
        return;
      }

      setShareNotice(selectedShareFriendIds.length > 0 ? 'Sharing updated.' : 'Sharing removed.');
    } catch {
      setShareSaving(false);
      setShareError('Unable to save sharing settings. Please refresh and try again.');
    }
  };

  const publishOpenedEntryToDemo = async (entry: SavedEntry) => {
    setDemoCopySaving(true);
    const response = await publishJournalEntryToDemoEntries(entry);
    setDemoCopySaving(false);

    if (!response.success) {
      setNotice(response.error || 'Could not copy this entry to the demo entries.');
      setDemoCopyNotice(null);
      return;
    }

    setNotice(`Copied "${entry.title}" to the demo entries.`);
    setDemoCopyNotice({ title: entry.title });
  };

  const publishOpenedEntryToDemoShared = async (entry: SavedEntry) => {
    setDemoSharedCopySaving(true);
    const loadedComments = commentsByEntry[entry.id];
    const commentsResponse = loadedComments
      ? { success: true, data: loadedComments }
      : await fetchJournalComments(entry.id);

    if (!commentsResponse.success) {
      setDemoSharedCopySaving(false);
      setNotice(commentsResponse.error || 'Could not load comments before copying this entry to demo shared entries.');
      setDemoCopyNotice(null);
      return;
    }

    const commentsToCopy = commentsResponse.data ?? [];
    const response = await publishJournalEntryToDemoShared(entry, commentsToCopy);
    setDemoSharedCopySaving(false);

    if (!response.success) {
      setNotice(response.error || 'Could not copy this entry to demo shared entries.');
      setDemoCopyNotice(null);
      return;
    }

    setNotice(`Copied "${entry.title}" to demo shared entries.`);
    setDemoCopyNotice({ title: entry.title });
    setCommentsByEntry((current) => ({
      ...current,
      [entry.id]: commentsToCopy,
    }));
  };

  const downloadStandaloneHtml = async (entry: EntryCardData, options?: { sharedBy?: string }) => {
    setExportingEntryId(entry.id);
    setNotice(null);

    try {
      const html = createStandaloneJournalHtml(entry, options);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = createJournalExportFileName(entry);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice(`Exported "${entry.title}" as standalone HTML.`);
    } catch {
      setNotice('Could not export this journal entry.');
    } finally {
      setExportingEntryId(null);
    }
  };

  // Loads comments for the selected owned/shared entry.
  const openCommentPanel = async (entryId: string) => {
    setCommentEntryId(entryId);
    setSharingEntryId(null);
    setCommentError(null);
    setCommentsLoading(true);

    const response = await fetchJournalComments(entryId);
    setCommentsLoading(false);

    if (!response.success) {
      setCommentError(response.error || 'Unable to load comments.');
      return;
    }

    setCommentsByEntry((current) => ({
      ...current,
      [entryId]: response.data ?? [],
    }));
  };

  // Sends a comment and appends it to the local comment thread.
  const sendComment = async (entryId: string) => {
    const draft = commentDrafts[entryId]?.trim() ?? '';

    if (!draft) {
      setCommentError('Write a comment before sending.');
      return;
    }

    setCommentSavingEntryId(entryId);
    setCommentError(null);

    const response = await createJournalComment(entryId, draft);
    setCommentSavingEntryId(null);

    if (!response.success || !response.data) {
      setCommentError(response.error || 'Unable to save comment.');
      return;
    }

    const savedComment = response.data;

    setCommentsByEntry((current) => ({
      ...current,
      [entryId]: [...(current[entryId] ?? []), savedComment],
    }));
    setCommentDrafts((current) => ({
      ...current,
      [entryId]: '',
    }));
  };

  const renderEntryAlbumCover = (entry: EntryCardData, className = 'mb-3 aspect-[4/3]') => {
    const coverPhoto = getEntryCoverPhoto(entry);

    if (!coverPhoto) {
      if (!needsEntryCoverHydration(entry)) {
        return null;
      }

      return (
        <div
          aria-label={`${entry.title} album cover loading`}
          className={[
            className,
            'overflow-hidden rounded-md border border-gold/20 bg-cream shadow-inner',
          ].join(' ')}
        >
          <div className="h-full w-full animate-pulse bg-gradient-to-br from-gold/16 via-white/70 to-teal/12" />
        </div>
      );
    }

    return (
      <div
        role="img"
        aria-label={`${entry.title} album cover`}
        className={[className, 'rounded-md border border-gold/20 bg-cream bg-cover bg-center shadow-inner'].join(' ')}
        style={{ backgroundImage: `url(${coverPhoto})` }}
      />
    );
  };

  const renderCommentPanel = (entryId: string) => {
    if (commentEntryId !== entryId) {
      return null;
    }

    const comments = commentsByEntry[entryId] ?? [];

    return (
      <div className="mt-3 rounded-lg border border-gold/18 bg-white/75 p-3" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Comments</p>
            <p className="text-xs text-ink/55">A private thread for this entry.</p>
          </div>
          <button
            type="button"
            onClick={() => setCommentEntryId(null)}
            className="rounded-md p-1 text-ink/45 transition hover:bg-cream hover:text-ink"
            aria-label="Close comments"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {commentsLoading ? (
          <p className="text-sm text-ink/60">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="rounded-md border border-dashed border-gold/20 bg-cream/35 px-3 py-2 text-sm text-ink/60">
            No comments yet.
          </p>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => (
              <article key={comment.id} className="rounded-md border border-gold/14 bg-cream/35 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-ink">{comment.author.displayName || comment.author.email}</p>
                  <time className="shrink-0 text-[11px] text-ink/45" dateTime={comment.createdAt}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/75">{comment.body}</p>
              </article>
            ))}
          </div>
        )}
        {commentError ? <p className="mt-3 text-sm text-red-600">{commentError}</p> : null}
        <div className="mt-3 flex gap-2">
          <input
            value={commentDrafts[entryId] ?? ''}
            onChange={(event) =>
              setCommentDrafts((current) => ({
                ...current,
                [entryId]: event.target.value,
              }))
            }
            placeholder="Write a comment"
            className="min-w-0 flex-1 rounded-lg border border-gold/25 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-gold focus:ring-2 focus:ring-gold/25"
          />
          <Button
            type="button"
            size="sm"
            isLoading={commentSavingEntryId === entryId}
            onClick={() => sendComment(entryId)}
            className="gap-2"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send
          </Button>
        </div>
      </div>
    );
  };

  const renderSharePanel = (entry: SavedEntry) => {
    if (sharingEntryId !== entry.id) {
      return null;
    }

    return (
      <div className="mt-3 rounded-lg border border-gold/18 bg-white/75 p-3" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Share with friends</p>
            <p className="text-xs text-ink/55">Friends get view-only access to this entry.</p>
          </div>
          <button
            type="button"
            onClick={() => setSharingEntryId(null)}
            className="rounded-md p-1 text-ink/45 transition hover:bg-cream hover:text-ink"
            aria-label="Close sharing panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {shareLoading ? (
          <p className="text-sm text-ink/60">Loading sharing settings...</p>
        ) : acceptedFriends.length === 0 ? (
          <div className="rounded-md border border-dashed border-gold/25 bg-cream/40 p-3">
            <p className="text-sm font-semibold text-ink">No friends in your Travel Circle yet.</p>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => router.push('/friends')}>
              Open Travel Circle
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {acceptedFriends.map((friendship) => {
              const label = friendship.profile.displayName || friendship.profile.email;
              const checked = selectedShareFriendIds.includes(friendship.profile.id);

              return (
                <label
                  key={friendship.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-gold/14 bg-cream/35 px-3 py-2 text-sm text-ink transition hover:border-gold/35"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-gold"
                    checked={checked}
                    onChange={() => toggleShareFriend(friendship.profile.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                </label>
              );
            })}
          </div>
        )}
        {shareError ? <p className="mt-3 text-sm text-red-600">{shareError}</p> : null}
        {shareNotice ? <p className="mt-3 text-sm text-emerald-700">{shareNotice}</p> : null}
        <Button
          type="button"
          size="sm"
          className="mt-3 w-full"
          isLoading={shareSaving}
          disabled={shareLoading || acceptedFriends.length === 0}
          onClick={() => saveEntryShares(entry.id)}
        >
          Save sharing
        </Button>
      </div>
    );
  };

  const renderFavoriteButton = (entry: SavedEntry, className = '') => {
    const favorite = isFavoriteEntry(entry);
    const countryLabel = getEntryCountryLabel(entry) || 'this country';

    return (
      <button
        type="button"
        className={[
          'inline-flex h-9 w-9 items-center justify-center rounded-md border transition',
          favorite
            ? 'border-gold/55 bg-gold/20 text-gold-deep hover:bg-gold/30'
            : 'border-gold/20 bg-white/85 text-ink/45 hover:border-gold/45 hover:text-gold-deep',
          className,
        ].join(' ')}
        onClick={(event) => {
          event.stopPropagation();
          void toggleFavoriteEntry(entry);
        }}
        aria-label={favorite ? `Remove favorite for ${countryLabel}` : `Add to favorites for ${countryLabel}`}
        title={favorite ? `Favorite for ${countryLabel}` : `Add to favorites for ${countryLabel}`}
      >
        <Star className={favorite ? 'h-4 w-4 fill-current' : 'h-4 w-4'} aria-hidden="true" />
      </button>
    );
  };

  const renderEntryCard = (entry: SavedEntry) => (
    <article
      key={entry.id}
      className="cursor-pointer rounded-lg border border-gold/20 bg-white p-4 shadow-soft transition hover:border-gold/45 hover:bg-[#fff8ea]"
      onClick={() => void openSavedEntry(entry)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void openSavedEntry(entry);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open journal entry ${entry.title}`}
    >
      <div className="relative">
        {renderEntryAlbumCover(entry)}
        {renderFavoriteButton(entry, 'absolute right-2 top-2 shadow-sm')}
      </div>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-ink">{entry.title}</h3>
        {isFavoriteEntry(entry) ? (
          <span className="shrink-0 rounded-full border border-gold/30 bg-gold/12 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gold-deep">
            Favorite
          </span>
        ) : null}
      </div>
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/18 bg-cream/55 px-2.5 py-1 text-xs font-semibold text-ink/60">
        <CalendarDays className="h-3.5 w-3.5 text-gold-deep" aria-hidden="true" />
        {formatJournalDateRange(getEntryTripStartDate(entry), getEntryTripEndDate(entry))}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/70">
        {getEntryCountryLabel(entry) ? <span>{getEntryCountryLabel(entry)}</span> : null}
        {entry.mood ? <span>{entry.mood}</span> : null}
        {getVisibleEntryTags(entry).slice(0, 5).map((tag) => (
          <span key={tag} className="rounded-full border border-gold/20 bg-cream px-2 py-1">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );

  const renderSharedEntryCard = (entry: SharedJournalEntry) => (
    <article
      key={`${entry.id}-${entry.sharedBy.id}`}
      className="cursor-pointer rounded-lg border border-gold/20 bg-white p-4 shadow-soft transition hover:border-gold/45 hover:bg-[#fff8ea]"
      onClick={() => openSharedEntry(entry)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openSharedEntry(entry);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open shared journal entry ${entry.title}`}
    >
      {renderEntryAlbumCover(entry)}
      <div>
        <h3 className="font-semibold text-ink">{entry.title}</h3>
      </div>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold-deep">
        From {entry.sharedBy.displayName || entry.sharedBy.email}
      </p>
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/18 bg-cream/55 px-2.5 py-1 text-xs font-semibold text-ink/60">
        <CalendarDays className="h-3.5 w-3.5 text-gold-deep" aria-hidden="true" />
        {formatJournalDateRange(getEntryTripStartDate(entry), getEntryTripEndDate(entry))}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/70">
        {getEntryCountryLabel(entry) ? <span>{getEntryCountryLabel(entry)}</span> : null}
        {entry.mood ? <span>{entry.mood}</span> : null}
        {getVisibleEntryTags(entry).slice(0, 5).map((tag) => (
          <span key={tag} className="rounded-full border border-gold/20 bg-cream px-2 py-1">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );

  const renderOpenedEntryModal = () => {
    if (!openedEntry) {
      return null;
    }

    const canvaPages = getEntryCanvaPages(openedEntry);
    const insertedPhotos = getEntryInsertedPhotos(openedEntry);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
        role="presentation"
        onClick={() => setOpenedEntry(null)}
      >
        <article
          className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gold/25 bg-white p-6 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="opened-entry-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">Journal entry</p>
              <h2 id="opened-entry-title" className="mt-2 text-3xl font-serif font-semibold leading-tight text-ink">
                {openedEntry.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpenedEntry(null)}
              className="rounded-md p-2 text-ink/45 transition hover:bg-cream hover:text-ink"
              aria-label="Close journal entry"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink/68">
            <time className="rounded-full border border-gold/18 bg-cream/55 px-3 py-1" dateTime={getEntryDate(openedEntry)}>
              {new Date(getEntryDate(openedEntry)).toLocaleDateString()}
            </time>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/18 bg-cream/55 px-3 py-1">
              <CalendarDays className="h-4 w-4 text-gold-deep" aria-hidden="true" />
              {formatJournalDateRange(getEntryTripStartDate(openedEntry), getEntryTripEndDate(openedEntry))}
            </span>
            {getEntryCountryLabel(openedEntry) ? (
              <span className="rounded-full border border-gold/18 bg-cream/55 px-3 py-1">
                {getEntryCountryLabel(openedEntry)}
              </span>
            ) : null}
            {openedEntry.mood ? (
              <span className="rounded-full border border-gold/18 bg-cream/55 px-3 py-1 capitalize">{openedEntry.mood}</span>
            ) : null}
          </div>

          {renderEntryAlbumCover(openedEntry, 'mt-6 aspect-[16/9]')}

          {canvaPages.length ? (
            <section className="mt-6 rounded-lg border border-gold/18 bg-cream/45 p-4">
              <h3 className="text-sm font-semibold text-ink">Canva pages</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {canvaPages.map((page, index) => (
                  <div
                    key={`${openedEntry.id}-canva-page-${index}`}
                    role="img"
                    aria-label={`${openedEntry.title} Canva page ${index + 1}`}
                    className="aspect-[4/3] rounded-md border border-gold/20 bg-white bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${page})` }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {insertedPhotos.length ? (
            <section className="mt-6 rounded-lg border border-gold/18 bg-cream/45 p-4">
              <h3 className="text-sm font-semibold text-ink">Memory photos</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {insertedPhotos.map((photo, index) => (
                  <figure key={photo.id} className="overflow-hidden rounded-md border border-gold/20 bg-white">
                    <div
                      role="img"
                      aria-label={photo.alt || `Memory photo ${index + 1}`}
                      className="aspect-[4/3] bg-cream bg-cover bg-center"
                      style={{ backgroundImage: `url(${photo.src})` }}
                    />
                    {photo.caption ? <figcaption className="p-2 text-xs font-semibold text-ink/62">{photo.caption}</figcaption> : null}
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <InstagramEmbed embeds={getEntryInstagramEmbeds(openedEntry)} />

          {getEntryContent(openedEntry).trim() ? (
            <section className="mt-6 rounded-lg border border-gold/18 bg-cream/45 p-4">
              <div className="whitespace-pre-wrap text-base leading-8 text-ink/78">{getEntryContent(openedEntry)}</div>
            </section>
          ) : null}

	          <div className="mt-6 flex flex-wrap gap-2 border-t border-gold/16 pt-4">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => openEditEntry(openedEntry)}
            >
              <PencilLine className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => openSharePanel(openedEntry)}>
              <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Share
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              isLoading={exportingEntryId === openedEntry.id}
              onClick={() => void downloadStandaloneHtml(openedEntry)}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Export HTML
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void toggleFavoriteEntry(openedEntry)}>
              <Star className={isFavoriteEntry(openedEntry) ? 'mr-2 h-4 w-4 fill-current' : 'mr-2 h-4 w-4'} aria-hidden="true" />
              {isFavoriteEntry(openedEntry) ? 'Favorited' : 'Favorite'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => openCommentPanel(openedEntry.id)}>
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Comments
            </Button>
            {canPublishEntriesToDemo ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  isLoading={demoCopySaving}
                  onClick={() => void publishOpenedEntryToDemo(openedEntry)}
                >
                  <UserRoundCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                  Copy to demo entries
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  isLoading={demoSharedCopySaving}
                  onClick={() => void publishOpenedEntryToDemoShared(openedEntry)}
                >
                  <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Copy to demo shared
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-red-700 hover:bg-red-50"
              onClick={() => requestDeleteEntry(openedEntry)}
            >
	              Delete
	            </Button>
	          </div>
            {demoCopyNotice ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">Copied to demo</p>
                      <p className="mt-1 text-sm leading-6 text-emerald-800">
                        <span className="font-semibold">{demoCopyNotice.title}</span> was saved to the demo.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/demo?next=/journal/entries"
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  >
                    Open demo
                  </Link>
                </div>
              </div>
            ) : null}
            {notice && notice.startsWith('Could not copy') ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {notice}
              </div>
            ) : null}
	          {renderSharePanel(openedEntry)}
	          {renderCommentPanel(openedEntry.id)}
	        </article>
      </div>
    );
  };

  const renderOpenedSharedEntryModal = () => {
    if (!openedSharedEntry) {
      return null;
    }

    const canvaPages = getEntryCanvaPages(openedSharedEntry);
    const insertedPhotos = getEntryInsertedPhotos(openedSharedEntry);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
        role="presentation"
        onClick={() => setOpenedSharedEntry(null)}
      >
        <article
          className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gold/25 bg-white p-6 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="opened-shared-entry-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
                Shared by {openedSharedEntry.sharedBy.displayName || openedSharedEntry.sharedBy.email}
              </p>
              <h2 id="opened-shared-entry-title" className="mt-2 text-3xl font-serif font-semibold leading-tight text-ink">
                {openedSharedEntry.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpenedSharedEntry(null)}
              className="rounded-md p-2 text-ink/45 transition hover:bg-cream hover:text-ink"
              aria-label="Close shared journal entry"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink/68">
            <time className="rounded-full border border-gold/18 bg-cream/55 px-3 py-1" dateTime={openedSharedEntry.sharedAt}>
              Shared {new Date(openedSharedEntry.sharedAt).toLocaleDateString()}
            </time>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/18 bg-cream/55 px-3 py-1">
              <CalendarDays className="h-4 w-4 text-gold-deep" aria-hidden="true" />
              {formatJournalDateRange(getEntryTripStartDate(openedSharedEntry), getEntryTripEndDate(openedSharedEntry))}
            </span>
            {getEntryCountryLabel(openedSharedEntry) ? (
              <span className="rounded-full border border-gold/18 bg-cream/55 px-3 py-1">
                {getEntryCountryLabel(openedSharedEntry)}
              </span>
            ) : null}
            {openedSharedEntry.mood ? (
              <span className="rounded-full border border-gold/18 bg-cream/55 px-3 py-1 capitalize">
                {openedSharedEntry.mood}
              </span>
            ) : null}
          </div>

          {renderEntryAlbumCover(openedSharedEntry, 'mt-6 aspect-[16/9]')}

          {canvaPages.length ? (
            <section className="mt-6 rounded-lg border border-gold/18 bg-cream/45 p-4">
              <h3 className="text-sm font-semibold text-ink">Canva pages</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {canvaPages.map((page, index) => (
                  <div
                    key={`${openedSharedEntry.id}-canva-page-${index}`}
                    role="img"
                    aria-label={`${openedSharedEntry.title} Canva page ${index + 1}`}
                    className="aspect-[4/3] rounded-md border border-gold/20 bg-white bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${page})` }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {insertedPhotos.length ? (
            <section className="mt-6 rounded-lg border border-gold/18 bg-cream/45 p-4">
              <h3 className="text-sm font-semibold text-ink">Memory photos</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {insertedPhotos.map((photo, index) => (
                  <figure key={photo.id} className="overflow-hidden rounded-md border border-gold/20 bg-white">
                    <div
                      role="img"
                      aria-label={photo.alt || `Memory photo ${index + 1}`}
                      className="aspect-[4/3] bg-cream bg-cover bg-center"
                      style={{ backgroundImage: `url(${photo.src})` }}
                    />
                    {photo.caption ? <figcaption className="p-2 text-xs font-semibold text-ink/62">{photo.caption}</figcaption> : null}
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <InstagramEmbed embeds={getEntryInstagramEmbeds(openedSharedEntry)} />

          {getEntryContent(openedSharedEntry).trim() ? (
            <section className="mt-6 rounded-lg border border-gold/18 bg-cream/45 p-4">
              <div className="whitespace-pre-wrap text-base leading-8 text-ink/78">{getEntryContent(openedSharedEntry)}</div>
            </section>
          ) : null}

	          <div className="mt-6 flex flex-wrap gap-2 border-t border-gold/16 pt-4">
	            <Button type="button" size="sm" variant="secondary" onClick={() => openCommentPanel(openedSharedEntry.id)}>
	              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
	              Comments
	            </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                isLoading={exportingEntryId === openedSharedEntry.id}
                onClick={() =>
                  void downloadStandaloneHtml(openedSharedEntry, {
                    sharedBy: openedSharedEntry.sharedBy.displayName || openedSharedEntry.sharedBy.email,
                  })
                }
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Export HTML
              </Button>
	          </div>
	          {renderCommentPanel(openedSharedEntry.id)}
	        </article>
      </div>
    );
  };

  const renderEditEntryModal = () => {
    if (!editingEntry) {
      return null;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
        role="presentation"
        onClick={closeEditEntry}
      >
        <section
          className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gold/25 bg-white p-6 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-entry-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">Edit journal</p>
              <h2 id="edit-entry-title" className="mt-2 text-3xl font-serif font-semibold text-ink">Update entry</h2>
            </div>
            <button
              type="button"
              onClick={closeEditEntry}
              className="rounded-md p-2 text-ink/45 transition hover:bg-cream hover:text-ink"
              aria-label="Close edit journal"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveEditedEntry();
            }}
          >
            <Input
              label="Journal name"
              value={editForm.title}
              onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
              required
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-ink" htmlFor="edit-entry-country">Country</label>
              <select
                id="edit-entry-country"
                value={editCountryOptions.some((country) => country.id === editForm.countryId) ? editForm.countryId : ''}
                onChange={(event) => setEditForm((current) => ({ ...current, countryId: event.target.value }))}
                className="w-full rounded-lg border-2 border-gold/30 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
                required
              >
                <option value="">Choose a country</option>
                {editCountryOptions.map((country) => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Mood"
              value={editForm.mood}
              onChange={(event) => setEditForm((current) => ({ ...current, mood: event.target.value }))}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Trip start"
                type="date"
                value={editForm.tripStartDate}
                max={editForm.tripEndDate}
                error={editDateRangeErrors.startDate}
                onChange={(event) => setEditForm((current) => ({ ...current, tripStartDate: event.target.value }))}
                required
              />
              <Input
                label="Trip end"
                type="date"
                value={editForm.tripEndDate}
                min={editForm.tripStartDate}
                error={editDateRangeErrors.endDate}
                onChange={(event) => setEditForm((current) => ({ ...current, tripEndDate: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink" htmlFor="edit-entry-story">Story</label>
              <textarea
                id="edit-entry-story"
                value={editForm.content}
                onChange={(event) => setEditForm((current) => ({ ...current, content: event.target.value }))}
                rows={8}
                className="w-full resize-y rounded-lg border-2 border-gold/30 bg-cream/50 px-4 py-3 text-ink placeholder-ink/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                required
              />
            </div>
            <Input
              label="Tags"
              value={editForm.tags}
              onChange={(event) => setEditForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="market, sunset, train"
            />
            {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2 border-t border-gold/16 pt-4">
              <Button type="button" variant="ghost" onClick={closeEditEntry} disabled={editSaving}>Cancel</Button>
              <Button type="submit" isLoading={editSaving}>Save Changes</Button>
            </div>
          </form>
        </section>
      </div>
    );
  };

  if (isLoading || !user) {
    return <AppPageSkeleton variant="journalEntries" />;
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Journal Entries"
        description="All your travel memories live here, ready to revisit whenever the moment calls."
        actions={
          <Link
            href="/journal"
            className="inline-flex items-center justify-center rounded-lg border-2 border-gold bg-cream px-4 py-2.5 text-base font-medium text-ink transition-all hover:bg-gold/10"
          >
            Back to Journal
          </Link>
        }
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink/62">
            Showing {entryPageStart}-{entryPageEnd} of {entryCount} {hasEntryFilters ? 'matching ' : ''}entries
          </p>
          {notice ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>{notice}</span>
              <button type="button" className="rounded p-1 hover:bg-white" onClick={() => setNotice(null)} aria-label="Dismiss message">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        {demoCopyNotice ? (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">Copied to demo</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    <span className="font-semibold">{demoCopyNotice.title}</span> was saved to the demo.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href="/demo?next=/journal/entries"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  Open demo
                </Link>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300"
                  onClick={() => setDemoCopyNotice(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <section className="mb-5 rounded-lg border border-gold/20 bg-white p-4 shadow-soft">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
            <label className="relative block">
              <span className="sr-only">Search journal entries</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setEntryPage(0);
                  setSharedEntryPage(0);
                  setEntriesLoading(true);
                  setSharedEntriesLoading(true);
                }}
                placeholder="Search title, country, tag, or story text"
                className="w-full rounded-lg border border-gold/25 bg-cream/40 py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-gold focus:ring-2 focus:ring-gold/25"
              />
            </label>
            <label className="block">
              <span className="sr-only">Search by</span>
              <select
                value={searchScope}
                onChange={(event) => {
                  setSearchScope(event.target.value as JournalSearchScope);
                  setEntryPage(0);
                  setSharedEntryPage(0);
                  setEntriesLoading(true);
                  setSharedEntriesLoading(true);
                }}
                className="h-full w-full rounded-lg border border-gold/25 bg-cream/40 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
              >
                {searchScopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant={showFavoritesOnly ? 'primary' : 'secondary'}
              className="gap-2"
              onClick={() => {
                setShowFavoritesOnly((current) => !current);
                setEntryPage(0);
                setEntriesLoading(true);
              }}
            >
              <Star className={showFavoritesOnly ? 'h-4 w-4 fill-current' : 'h-4 w-4'} aria-hidden="true" />
              Favorites
            </Button>
            {searchQuery || searchScope !== 'all' || showFavoritesOnly ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setSearchScope('all');
                  setShowFavoritesOnly(false);
                  setEntryPage(0);
                  setSharedEntryPage(0);
                  setEntriesLoading(true);
                  setSharedEntriesLoading(true);
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </section>

        {loadError ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p> : null}

        {entriesLoading ? (
          <InlineLoadingSkeleton variant="journalEntryCards" />
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-gold/20 bg-white p-8 text-center text-ink/60 shadow-soft">
            {showFavoritesOnly ? 'No favorite journal entries yet.' : isSearching ? 'No matching journal entries.' : 'No journal entries yet.'}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry) => renderEntryCard(entry))}
          </div>
        )}

        {entryCount > ENTRY_BATCH_SIZE ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={entriesLoading || entryPage === 0}
              onClick={() => {
                setEntryPage((current) => Math.max(0, current - 1));
                setEntriesLoading(true);
              }}
            >
              Previous
            </Button>
            <span className="text-sm font-semibold text-ink/55">
              Page {entryPage + 1} of {Math.max(1, Math.ceil(entryCount / ENTRY_BATCH_SIZE))}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={entriesLoading || !hasMoreEntries}
              onClick={() => {
                setEntryPage((current) => current + 1);
                setEntriesLoading(true);
              }}
            >
              Next
            </Button>
          </div>
        ) : null}

        <section className="mt-10 border-t border-gold/18 pt-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">Shared library</p>
              <h2 className="mt-1 text-2xl font-serif font-semibold text-ink">Shared With Me</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-white px-3 py-1.5 text-xs font-semibold text-ink/60">
              <UsersRound className="h-4 w-4 text-gold-deep" aria-hidden="true" />
              {sharedEntryPageStart}-{sharedEntryPageEnd} of {sharedEntryCount}
            </span>
          </div>

          {sharedLoadError ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{sharedLoadError}</p>
          ) : null}

          {sharedEntriesLoading ? (
            <InlineLoadingSkeleton variant="journalEntryCards" />
          ) : sharedEntries.length === 0 ? (
            <div className="rounded-lg border border-gold/20 bg-white p-8 text-center text-ink/60 shadow-soft">
              {isSearching ? 'No matching shared entries.' : 'No shared journal entries yet.'}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sharedEntries.map((entry) => renderSharedEntryCard(entry))}
            </div>
          )}

          {sharedEntryCount > ENTRY_BATCH_SIZE ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={sharedEntriesLoading || sharedEntryPage === 0}
                onClick={() => {
                  setSharedEntryPage((current) => Math.max(0, current - 1));
                  setSharedEntriesLoading(true);
                }}
              >
                Previous
              </Button>
              <span className="text-sm font-semibold text-ink/55">
                Page {sharedEntryPage + 1} of {Math.max(1, Math.ceil(sharedEntryCount / ENTRY_BATCH_SIZE))}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={sharedEntriesLoading || !hasMoreSharedEntries}
                onClick={() => {
                  setSharedEntryPage((current) => current + 1);
                  setSharedEntriesLoading(true);
                }}
              >
                Next
              </Button>
            </div>
          ) : null}
        </section>

        {renderOpenedEntryModal()}
        {renderOpenedSharedEntryModal()}
        {renderEditEntryModal()}

        {entryPendingDelete ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" role="presentation" onClick={() => setEntryPendingDelete(null)}>
            <section
              className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-entry-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Delete journal</p>
              <h2 id="delete-entry-title" className="mt-2 text-2xl font-serif font-semibold text-ink">
                Delete {entryPendingDelete.title}?
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                This will permanently remove the journal entry, its comments, and its sharing settings.
              </p>
              {deleteError ? <p className="mt-3 text-sm text-red-600">{deleteError}</p> : null}
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEntryPendingDelete(null)} disabled={deleteSaving}>
                  Cancel
                </Button>
                <Button type="button" className="bg-red-700 text-white hover:bg-red-800" isLoading={deleteSaving} onClick={() => void confirmDeleteEntry()}>
                  Delete Entry
                </Button>
              </div>
            </section>
          </div>
        ) : null}
      </PageShell>
    </div>
  );
}
