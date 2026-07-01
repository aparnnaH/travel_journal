// Main journal workspace.
// This route coordinates Canva imports, journal entry persistence, visited-map
// country linking, scrapbook canvas state, trip import, sharing, comments,
// dictation, and Memory Keeper support. It is intentionally client-heavy because
// these workflows depend on browser files, local storage, and interactive UI.
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { CalendarDays, Check, ChevronLeft, ChevronRight, ExternalLink, FileUp, ImagePlus, MessageCircle, Mic, Palette, PencilLine, Search, Send, Share2, Type, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import AppPageSkeleton from '@/components/loading/PageSkeletons';
import { Button, Input } from '@/components/ui';
import ImportTripModal from '@/components/import/ImportTripModal';
import MemoryKeeperCard from '@/components/memory/MemoryKeeperCard';
import InstagramEmbed from '@/components/journal/InstagramEmbed';
import ScrapbookCanvas from '@/components/journal/canvas/ScrapbookCanvas';
import PhotoTray from '@/components/journal/scrapbook/PhotoTray';
import { useJournalLayoutStore } from '@/hooks/journal-layout/JournalLayoutStore';
import { appendImportedTripToStorage, getScrapbookStorageKey } from '@/lib/ai/storage';
import { useAuthStore } from '@/store/authStore';
import { useMapStore } from '@/store/mapStore';
import { fetchFriends } from '@/lib/friendService';
import {
  createJournalComment,
  createJournalEntry,
  deleteJournalEntry,
  fetchJournalEntry,
  fetchJournalComments,
  fetchJournalEntryShares,
  saveJournalEntryShares,
  updateJournalEntry,
  updateJournalEntryTitle,
} from '@/lib/journalService';
import { decodeJournalContentWithCanva } from '@/lib/journalCanvaPayload';
import { normalizeInstagramEmbedUrl, sanitizeInstagramEmbedUrls } from '@/lib/instagramEmbeds';
import { createCanvaDesign, createCanvaExport, fetchCanvaDesigns, fetchCanvaExport } from '@/lib/canvaService';
import {
  formatJournalDateRange,
  getJournalDateRangeError,
  getJournalDateRangeErrors,
  getTodayJournalDate,
  normalizeJournalDate,
} from '@/lib/journalDates';
import { placeholderCountries } from '@/lib/placeholderData';
import { createCanvaImportPages } from '@/services/import/canvaImportService';
import {
  BOARD_FALLBACK_WIDTH,
  BOARD_HEIGHT,
  MAX_PHOTO_WIDTH,
  MAX_NOTE_HEIGHT,
  MAX_NOTE_WIDTH,
  MIN_NOTE_HEIGHT,
  MIN_NOTE_WIDTH,
  MIN_PHOTO_WIDTH,
  NOTE_HEIGHT,
  NOTE_WIDTH,
  PHOTO_HEIGHT,
  PHOTO_WIDTH,
  clamp,
  createId,
  createScrapbookPage,
  decorationOptions,
  drawingColors,
  getPhotoHeight,
  getNoteHeightForText,
  normalizeScrapbookPage,
  noteColors,
  scrapbookThemes,
  templateLabels,
} from '@/lib/canvas/scrapbook';
import type { JournalEntry } from '@/types';
import type { Friendship } from '@/types/friends';
import type { JournalComment } from '@/types/journalComments';
import type { JournalShareRecipient, SharedJournalEntry } from '@/types/journalSharing';
import type { TripImportResult } from '@/types/trips';
import type { CanvaDesign } from '@/types/canva';
import type { MemoryKeeperTripContext } from '@/services/memoryKeeperService';
import type {
  DrawingPoint,
  PhotoAsset,
  ScrapbookDecorationItem,
  ScrapbookDecorationKind,
  ScrapbookItem,
  ScrapbookNoteItem,
  ScrapbookPageData,
  ScrapbookPhotoItem,
  ScrapbookTemplateId,
  ScrapbookThemeId,
} from '@/lib/canvas/scrapbook';

type SavedEntry = JournalEntry & {
  country_id?: string;
  created_at?: string;
};

type CanvaImportedPreview = {
  design: CanvaDesign;
  title: string;
  dataUrls: string[];
};

type InsertedJournalPhoto = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
};

type EditEntryForm = {
  title: string;
  content: string;
  countryId: string;
  mood: string;
  tags: string;
  tripStartDate: string;
  tripEndDate: string;
};

type ParsedTripNotice = {
  title: string;
  summary: string;
  countryName: string;
  dateLabel: string;
  pageCount: number;
  stampCount: number;
  dayTitles: string[];
  tags: string[];
  canvaTitle?: string;
  canvaPageCount?: number;
};

type SavedEntryNotice = {
  entry: SavedEntry;
  message: string;
  parsedTrip?: ParsedTripNotice;
};

type VisitedJournalCountry = {
  id: string;
  name: string;
  searchText: string;
};

// Small delay helper used when polling asynchronous Canva export jobs.
const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));
const SCRAPBOOK_STORAGE_WARNING_BYTES = 3_500_000;
const MAX_INSERTED_JOURNAL_PHOTOS = 8;

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
};

type ResizeState = {
  id: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
};

type RotateState = {
  id: string;
  centerX: number;
  centerY: number;
};

type DictationTarget =
  | {
      type: 'story';
    }
  | {
      type: 'note';
      itemId: string;
    };

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

// Adds speech-recognition text to an existing draft without losing spacing.
const appendDictationText = (currentValue: string, transcript: string) => {
  const cleanTranscript = transcript.trim();

  if (!cleanTranscript) {
    return currentValue;
  }

  if (!currentValue.trim()) {
    return cleanTranscript;
  }

  const separator = /\s$/.test(currentValue) ? '' : ' ';
  return `${currentValue}${separator}${cleanTranscript}`;
};

// Converts a local image file into a data URL for immediate scrapbook/journal use.
const readPhotoFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

// Saved entries may contain normalized or database field names, so these helpers
// hide field-shape differences from the UI.
const getEntryDate = (entry: SavedEntry) => entry.createdAt || entry.created_at || new Date().toISOString();
const getEntryCountry = (entry: SavedEntry | SharedJournalEntry) => entry.countryId || entry.country_id || '';
const formatEntryCountry = (countryId: string) =>
  placeholderCountries.find((country) => country.id === countryId)?.name || '';
const getEntryCountryLabel = (entry: SavedEntry | SharedJournalEntry) => formatEntryCountry(getEntryCountry(entry));
// Reads Canva pages from structured columns first, then legacy embedded content.
const getEntryCanvaPages = (entry: SavedEntry | SharedJournalEntry | null) => {
  const fallbackPages = entry ? decodeJournalContentWithCanva(String(entry.content || '')).canva?.pages : [];
  const pages = entry?.canvaPages ?? entry?.canva_pages ?? fallbackPages ?? [];
  return Array.isArray(pages)
    ? pages.filter((page): page is string => typeof page === 'string' && page.startsWith('data:image/'))
    : [];
};
const getEntryCanvaTitle = (entry: SavedEntry | SharedJournalEntry) =>
  entry.canvaDesignTitle ||
  entry.canva_design_title ||
  decodeJournalContentWithCanva(String(entry.content || '')).canva?.designTitle ||
  entry.title;
const getEntryCanvaEditUrl = (entry: SavedEntry | SharedJournalEntry) =>
  entry.canvaDesignEditUrl ||
  entry.canva_design_edit_url ||
  decodeJournalContentWithCanva(String(entry.content || '')).canva?.designEditUrl ||
  null;
const getEntryContent = (entry: SavedEntry | SharedJournalEntry) =>
  decodeJournalContentWithCanva(String(entry.content || '')).content;
const getEntryFallbackTripDate = (entry: SavedEntry | SharedJournalEntry) =>
  normalizeJournalDate(entry.createdAt || entry.created_at || new Date().toISOString());
const getEntryTripStartDate = (entry: SavedEntry | SharedJournalEntry) =>
  entry.tripStartDate ||
  entry.trip_start_date ||
  decodeJournalContentWithCanva(String(entry.content || '')).canva?.tripStartDate ||
  getEntryFallbackTripDate(entry);
const getEntryTripEndDate = (entry: SavedEntry | SharedJournalEntry) =>
  entry.tripEndDate ||
  entry.trip_end_date ||
  decodeJournalContentWithCanva(String(entry.content || '')).canva?.tripEndDate ||
  getEntryTripStartDate(entry);
const getEntryCoverPageIndex = (entry: SavedEntry | SharedJournalEntry) => {
  const decodedCoverIndex = decodeJournalContentWithCanva(String(entry.content || '')).canva?.coverPageIndex;

  return typeof entry.coverPageIndex === 'number'
    ? entry.coverPageIndex
    : typeof decodedCoverIndex === 'number'
      ? decodedCoverIndex
      : 0;
};
const getEntryCoverPhoto = (entry: SavedEntry | SharedJournalEntry) => {
  const decodedCanva = decodeJournalContentWithCanva(String(entry.content || '')).canva;
  const pages = getEntryCanvaPages(entry);
  const coverPageIndex = clamp(getEntryCoverPageIndex(entry), 0, Math.max(0, pages.length - 1));

  return entry.coverPhoto || decodedCanva?.coverPhoto || pages[coverPageIndex] || pages[0] || null;
};
const getEntryInsertedPhotos = (entry: SavedEntry | SharedJournalEntry) => {
  const decodedPhotos = decodeJournalContentWithCanva(String(entry.content || '')).canva?.insertedPhotos ?? entry.insertedPhotos ?? [];

  return Array.isArray(decodedPhotos)
    ? decodedPhotos.filter(
        (photo): photo is InsertedJournalPhoto =>
          Boolean(photo) && typeof photo.src === 'string' && photo.src.startsWith('data:image/')
      )
    : [];
};
const getEntryInstagramEmbeds = (entry: SavedEntry | SharedJournalEntry) =>
  sanitizeInstagramEmbedUrls(
    decodeJournalContentWithCanva(String(entry.content || '')).canva?.instagramEmbeds ?? entry.instagramEmbeds ?? []
  );

// Extracts scrapbook photos into the compact input shape expected by Memory Keeper.
const getMemoryKeeperPhotos = (pages: ScrapbookPageData[]) =>
  pages
    .flatMap((page) => [
      ...page.photoTray.map((photo) => ({
        alt: photo.alt || page.title,
        caption: photo.caption,
      })),
      ...page.items
        .filter((item): item is ScrapbookPhotoItem => item.type === 'photo')
        .map((photo) => ({
          alt: photo.alt || page.title,
          caption: photo.caption,
        })),
    ])
    .filter((photo) => photo.alt || photo.caption)
    .slice(0, 12);

const MEMORY_KEEPER_NOISE_PATTERN =
  /\b(?:create a memory keeper feature|add the feature|do not use ai|quick action buttons|please implement|requirements|hard-coded faq|existing project structure|you have a boarding pass|want to create a travel-day entry|want me to help turn|memory prompt|journal entries|photos if available|passport stamps|boarding passes|generate helpful memory prompts|fix grammar|make more descriptive|write from photos|create caption|turn into journal entry|summarize trip)\b/i;

const isMemoryKeeperSourceLine = (line: string) =>
  Boolean(line.trim()) && !MEMORY_KEEPER_NOISE_PATTERN.test(line);

const isMemoryKeeperBoardingPassLabel = (label: string) => {
  const cleanLabel = label.trim();

  if (!isMemoryKeeperSourceLine(cleanLabel)) {
    return false;
  }

  return /\b(?:boarding pass|flight|airline|airport|depart|arrival|gate|terminal)\b/i.test(cleanLabel);
};

const getMemoryKeeperBoardingPasses = (pages: ScrapbookPageData[], content: string) => {
  const ticketPasses = pages.flatMap((page) =>
    page.items
      .filter((item): item is ScrapbookDecorationItem => item.type === 'decoration' && item.kind === 'ticket')
      .filter((ticket) => isMemoryKeeperBoardingPassLabel(ticket.label))
      .map((ticket) => ({
        label: ticket.label || `Ticket on ${page.title}`,
      }))
  );
  const travelLine = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => isMemoryKeeperBoardingPassLabel(line));
  const routeMatch = travelLine?.match(/\b(?:from\s+)?([A-Z][A-Za-z .'-]{2,})\s+(?:to|->)\s+([A-Z][A-Za-z .'-]{2,})\b/);
  const contentPass = routeMatch && !/\b(?:create|want|turn|write|entry|memory)\b/i.test(routeMatch[2])
    ? [
        {
          label: `${routeMatch[1].trim()} to ${routeMatch[2].trim()}`,
          route: `${routeMatch[1].trim()} to ${routeMatch[2].trim()}`,
        },
      ]
    : [];

  return [...ticketPasses, ...contentPass].slice(0, 4);
};

const getMemoryKeeperItineraryItems = (parsedTrip: ParsedTripNotice | undefined, pages: ScrapbookPageData[], content: string) => {
  const dayItems =
    parsedTrip?.dayTitles.map((dayTitle) => ({
      title: dayTitle,
      dayTitle,
    })) ?? [];
  const noteItems = pages.flatMap((page) =>
    page.items
      .filter((item): item is ScrapbookNoteItem => item.type === 'note')
      .filter((note) => isMemoryKeeperSourceLine(note.text))
      .map((note) => ({
        title: note.text.split('\n')[0]?.trim() || page.title,
        detail: note.text,
        dayTitle: page.title,
      }))
  );
  const contentItems = content
    .split('\n')
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((line) => line.length >= 8 && line.length <= 140 && isMemoryKeeperSourceLine(line))
    .filter((line, index, lines) => lines.findIndex((candidate) => candidate.toLowerCase() === line.toLowerCase()) === index)
    .slice(0, 10)
    .map((line) => ({
      title: line,
    }));

  return [...dayItems, ...noteItems, ...contentItems].slice(0, 12);
};

// Determines whether the current journal draft has meaningful user-entered content.
const isFormDraftEmpty = (draft: {
  title: string;
  content: string;
  countryId: string;
  tags: string;
}) => !draft.title.trim() && !draft.content.trim() && !draft.countryId.trim() && !draft.tags.trim();

const normalizeCountrySearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getRegionDisplayName = (countryId: string) => {
  if (!/^[A-Z]{2}$/i.test(countryId)) {
    return null;
  }

  try {
    const displayName = new Intl.DisplayNames(['en'], { type: 'region' }).of(countryId.toUpperCase());
    return displayName && displayName !== countryId.toUpperCase() ? displayName : null;
  } catch {
    return null;
  }
};

// Browser speech recognition is vendor-prefixed in some browsers, so access is
// guarded and normalized here.
const getSpeechRecognition = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
};

const isSameDictationTarget = (firstTarget: DictationTarget | null, secondTarget: DictationTarget) => {
  if (!firstTarget || firstTarget.type !== secondTarget.type) {
    return false;
  }

  if (firstTarget.type === 'story' && secondTarget.type === 'story') {
    return true;
  }

  if (firstTarget.type === 'note' && secondTarget.type === 'note') {
    return firstTarget.itemId === secondTarget.itemId;
  }

  return false;
};

// Orchestrates the full journal workspace.
export default function JournalPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const visitedMapCountries = useMapStore((state) => state.visitedCountries);
  const mapCountryLabels = useMapStore((state) => state.countryLabels);
  const activeTool = useJournalLayoutStore((state) => state.activeTool);
  const setActiveTool = useJournalLayoutStore((state) => state.setActiveTool);
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const insertedPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrapbookLoadedRef = useRef(false);
  const [openedEntry, setOpenedEntry] = useState<SavedEntry | null>(null);
  const [acceptedFriends, setAcceptedFriends] = useState<Friendship[]>([]);
  const [savedEntryNotice, setSavedEntryNotice] = useState<SavedEntryNotice | null>(null);
  const [importedTripWorkspaceNotice, setImportedTripWorkspaceNotice] = useState<SavedEntryNotice | null>(null);
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
  const [shareRecipientsByEntry, setShareRecipientsByEntry] = useState<Record<string, JournalShareRecipient[]>>({});
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
  const [saving, setSaving] = useState(false);
  const [scrapbookPages, setScrapbookPages] = useState<ScrapbookPageData[]>(() => [
    createScrapbookPage(1, 'page-1'),
  ]);
  const [activePageId, setActivePageId] = useState('page-1');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [rotateState, setRotateState] = useState<RotateState | null>(null);
  const [drawingStrokeId, setDrawingStrokeId] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState(drawingColors[0]);
  const [boardWidth, setBoardWidth] = useState(BOARD_FALLBACK_WIDTH);
  const [dictationTarget, setDictationTarget] = useState<DictationTarget | null>(null);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [canvaModalOpen, setCanvaModalOpen] = useState(false);
  const [canvaDesigns, setCanvaDesigns] = useState<CanvaDesign[]>([]);
  const [canvaQuery, setCanvaQuery] = useState('');
  const [canvaLoading, setCanvaLoading] = useState(false);
  const [canvaError, setCanvaError] = useState<string | null>(null);
  const [canvaImportingDesignId, setCanvaImportingDesignId] = useState<string | null>(null);
  const [canvaCreatingDesign, setCanvaCreatingDesign] = useState(false);
  const [canvaImportedPreview, setCanvaImportedPreview] = useState<CanvaImportedPreview | null>(null);
  const [canvaPreviewPageIndex, setCanvaPreviewPageIndex] = useState(0);
  const [canvaPreviewTurnDirection, setCanvaPreviewTurnDirection] = useState<'next' | 'previous'>('next');
  const [canvaCoverPageIndex, setCanvaCoverPageIndex] = useState(0);
  const [insertedJournalPhotos, setInsertedJournalPhotos] = useState<InsertedJournalPhoto[]>([]);
  const [instagramEmbedUrl, setInstagramEmbedUrl] = useState('');
  const [instagramError, setInstagramError] = useState<string | null>(null);
  const [openedCanvaPageIndex, setOpenedCanvaPageIndex] = useState(0);
  const [openedCanvaTurnDirection, setOpenedCanvaTurnDirection] = useState<'next' | 'previous'>('next');
  const [renamingEntryId, setRenamingEntryId] = useState<string | null>(null);
  const [renameTitleDraft, setRenameTitleDraft] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [localScrapbookBackupOpen, setLocalScrapbookBackupOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    countryId: '',
    mood: 'nostalgic',
    tags: '',
    tripStartDate: getTodayJournalDate(),
    tripEndDate: getTodayJournalDate(),
  });
  const [error, setError] = useState<string | null>(null);

  const currentCountry = useMemo(
    () => placeholderCountries.find((country) => country.id === form.countryId),
    [form.countryId]
  );
  const visitedJournalCountries = useMemo<VisitedJournalCountry[]>(() => {
    const countryOptions = new Map<string, VisitedJournalCountry>();

    visitedMapCountries.forEach((countryId) => {
      const knownCountry = placeholderCountries.find((country) => country.id === countryId);
      const name = mapCountryLabels[countryId] || knownCountry?.name || getRegionDisplayName(countryId) || countryId;

      countryOptions.set(countryId, {
        id: countryId,
        name,
        searchText: normalizeCountrySearchText(`${name} ${countryId}`),
      });
    });

    return Array.from(countryOptions.values()).sort((firstCountry, secondCountry) =>
      firstCountry.name.localeCompare(secondCountry.name, undefined, { sensitivity: 'base' })
    );
  }, [mapCountryLabels, visitedMapCountries]);
  const selectedVisitedCountry = useMemo(
    () => visitedJournalCountries.find((country) => country.id === form.countryId) || null,
    [form.countryId, visitedJournalCountries]
  );
  const filteredVisitedCountries = useMemo(() => {
    const query = normalizeCountrySearchText(countrySearch);
    const countryOptions = query
      ? visitedJournalCountries.filter((country) => country.searchText.includes(query))
      : visitedJournalCountries;

    return countryOptions.slice(0, 8);
  }, [countrySearch, visitedJournalCountries]);
  const editCountryOptions = useMemo(() => {
    const countryOptions = new Map(visitedJournalCountries.map((country) => [country.id, country]));

    if (editingEntry) {
      const currentCountryId = getEntryCountry(editingEntry);
      const currentCountryName = formatEntryCountry(currentCountryId);

      if (currentCountryId && currentCountryName && !countryOptions.has(currentCountryId)) {
        countryOptions.set(currentCountryId, {
          id: currentCountryId,
          name: currentCountryName,
          searchText: normalizeCountrySearchText(`${currentCountryName} ${currentCountryId}`),
        });
      }
    }

    return Array.from(countryOptions.values()).sort((firstCountry, secondCountry) =>
      firstCountry.name.localeCompare(secondCountry.name, undefined, { sensitivity: 'base' })
    );
  }, [editingEntry, visitedJournalCountries]);
  const suggestedVisitedCountry = useMemo(() => {
    if (selectedVisitedCountry) {
      return null;
    }

    const journalText = normalizeCountrySearchText(`${form.title} ${form.content} ${form.tags}`);

    if (!journalText) {
      return null;
    }

    const searchableJournalText = ` ${journalText} `;
    return (
      visitedJournalCountries.find((country) => {
        const countryName = normalizeCountrySearchText(country.name);

        return countryName.length >= 3 && searchableJournalText.includes(` ${countryName} `);
      }) || null
    );
  }, [form.content, form.tags, form.title, selectedVisitedCountry, visitedJournalCountries]);
  const currentPage = useMemo(
    () => scrapbookPages.find((page) => page.id === activePageId) || scrapbookPages[0],
    [activePageId, scrapbookPages]
  );
  const scrapbookItems = useMemo(() => currentPage?.items ?? [], [currentPage]);
  const selectedItem = useMemo(
    () => scrapbookItems.find((item) => item.id === selectedItemId) || null,
    [scrapbookItems, selectedItemId]
  );
  const currentTheme = scrapbookThemes.find((theme) => theme.id === currentPage?.theme) || scrapbookThemes[0];
  const scrapbookStorageKey = useMemo(
    () => (user ? getScrapbookStorageKey(user.id) : null),
    [user]
  );

  const loadFullEntry = async (entry: SavedEntry) => {
    if (typeof entry.content === 'string' && entry.content.length > 0) {
      return entry;
    }

    const response = await fetchJournalEntry(entry.id);

    if (!response.success || !response.data) {
      setError(response.error || 'Could not load this journal entry.');
      return entry;
    }

    const fullEntry = response.data as SavedEntry;

    return fullEntry;
  };

  const openSavedEntry = async (entry: SavedEntry) => {
    const fullEntry = await loadFullEntry(entry);

    setOpenedCanvaPageIndex(0);
    setOpenedCanvaTurnDirection('next');
    setRenamingEntryId(null);
    setRenameTitleDraft(fullEntry.title);
    setRenameError(null);
    setOpenedEntry(fullEntry);
  };

  const openEditEntry = async (entry: SavedEntry) => {
    const fullEntry = await loadFullEntry(entry);

    setEditingEntry(fullEntry);
    setEditForm({
      title: fullEntry.title,
      content: getEntryContent(fullEntry),
      countryId: getEntryCountry(fullEntry),
      mood: fullEntry.mood || '',
      tags: fullEntry.tags?.join(', ') || '',
      tripStartDate: normalizeJournalDate(getEntryTripStartDate(fullEntry)),
      tripEndDate: normalizeJournalDate(getEntryTripEndDate(fullEntry), normalizeJournalDate(getEntryTripStartDate(fullEntry))),
    });
    setEditError(null);
    setOpenedEntry(null);
    setSharingEntryId(null);
    setCommentEntryId(null);
  };

  const closeEditEntry = () => {
    if (editSaving) {
      return;
    }

    setEditingEntry(null);
    setEditError(null);
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!user) {
      return;
    }

    const loadFriends = async () => {
      const friendsResponse = await fetchFriends();
      if (friendsResponse.success && friendsResponse.data) {
        setAcceptedFriends(friendsResponse.data.friends);
      }
    };

    loadFriends();
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
          const parsed = JSON.parse(savedBoard) as {
            activePageId?: string;
            items?: ScrapbookItem[];
            pages?: Array<Partial<ScrapbookPageData>>;
          };

          if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
            const normalizedPages = parsed.pages.map((page, index) => normalizeScrapbookPage(page, index + 1));
            setScrapbookPages(normalizedPages);
            setActivePageId(
              normalizedPages.some((page) => page.id === parsed.activePageId)
                ? String(parsed.activePageId)
                : normalizedPages[0].id
            );
          } else if (Array.isArray(parsed.items)) {
            const migratedPage = {
              ...createScrapbookPage(1, 'page-1'),
              items: parsed.items,
            };
            setScrapbookPages([migratedPage]);
            setActivePageId(migratedPage.id);
          } else {
            const firstPage = createScrapbookPage(1, 'page-1');
            setScrapbookPages([firstPage]);
            setActivePageId(firstPage.id);
          }
        } else {
          const firstPage = createScrapbookPage(1, 'page-1');
          setScrapbookPages([firstPage]);
          setActivePageId(firstPage.id);
        }

        setStorageWarning(null);
      } catch {
        setStorageWarning('This scrapbook could not be restored on this device.');
        const firstPage = createScrapbookPage(1, 'page-1');
        setScrapbookPages([firstPage]);
        setActivePageId(firstPage.id);
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
      const serializedBoard = JSON.stringify({ pages: scrapbookPages, activePageId });
      window.localStorage.setItem(scrapbookStorageKey, serializedBoard);

      if (serializedBoard.length > SCRAPBOOK_STORAGE_WARNING_BYTES) {
        queueMicrotask(() => {
          setStorageWarning('This scrapbook is getting large on this device. Save finished entries or remove a few large photos before adding more.');
        });
      } else {
        queueMicrotask(() => {
          setStorageWarning(null);
        });
      }
    } catch {
      queueMicrotask(() => {
        setStorageWarning('This board is full on this device. Remove a few large photos before adding more.');
      });
    }
  }, [activePageId, scrapbookPages, scrapbookStorageKey]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const board = boardRef.current;

    if (!board) {
      return;
    }

    const updateBoardWidth = () => {
      setBoardWidth(board.clientWidth || BOARD_FALLBACK_WIDTH);
    };
    const observer = new ResizeObserver(updateBoardWidth);
    observer.observe(board);
    queueMicrotask(updateBoardWidth);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (isLoading || !user) {
    return <AppPageSkeleton variant="journal" />;
  }

  const updateCurrentPage = (updater: (page: ScrapbookPageData) => ScrapbookPageData) => {
    setScrapbookPages((current) =>
      current.map((page) => (page.id === activePageId ? updater(page) : page))
    );
  };

  const updateScrapbookItems = (updater: (items: ScrapbookItem[]) => ScrapbookItem[]) => {
    updateCurrentPage((page) => ({
      ...page,
      items: updater(page.items),
    }));
  };

  const addPage = () => {
    const nextPage = createScrapbookPage(scrapbookPages.length + 1);
    setScrapbookPages((current) => [...current, nextPage]);
    setActivePageId(nextPage.id);
    setSelectedItemId(null);
    setStorageWarning(null);
  };

  const updatePageTheme = (theme: ScrapbookThemeId) => {
    updateCurrentPage((page) => ({
      ...page,
      theme,
    }));
  };

  const setPageTemplate = (template: ScrapbookTemplateId) => {
    const boardWidth = boardRef.current?.clientWidth || BOARD_FALLBACK_WIDTH;

    updateCurrentPage((page) => {
      const photos = page.items.filter((item): item is ScrapbookPhotoItem => item.type === 'photo');
      let photoIndex = 0;
      let noteIndex = 0;

      const nextItems = page.items.map((item) => {
        if (item.type === 'photo') {
          const index = photoIndex;
          photoIndex += 1;

          if (template === 'polaroid-wall') {
            const width = 170;
            const gap = 22;
            const columns = Math.max(1, Math.floor((boardWidth - 56) / (width + gap)));

            return {
              ...item,
              width,
              height: getPhotoHeight(width),
              x: 28 + (index % columns) * (width + gap),
              y: 32 + Math.floor(index / columns) * 220,
              rotation: [-3, 2, -2, 3][index % 4],
            };
          }

          if (template === 'timeline') {
            const width = 150;
            const isLeft = index % 2 === 0;

            return {
              ...item,
              width,
              height: getPhotoHeight(width),
              x: isLeft ? Math.max(24, boardWidth / 2 - width - 64) : Math.min(boardWidth - width - 24, boardWidth / 2 + 64),
              y: 44 + index * 122,
              rotation: isLeft ? -3 : 3,
            };
          }

          if (template === 'collage') {
            const width = [210, 180, 160, 190][index % 4];

            return {
              ...item,
              width,
              height: getPhotoHeight(width),
              x: clamp(56 + (index % 5) * 74, 20, Math.max(20, boardWidth - width - 20)),
              y: 48 + (index % 4) * 88,
              rotation: [-8, 6, -4, 9, 2][index % 5],
            };
          }

          if (template === 'postcard') {
            const width = Math.min(290, boardWidth * 0.44);

            return {
              ...item,
              width,
              height: getPhotoHeight(width),
              x: 34,
              y: 44 + index * 34,
              rotation: index === 0 ? -2 : 3,
            };
          }

          if (template === 'diary') {
            const width = 150;

            return {
              ...item,
              width,
              height: getPhotoHeight(width),
              x: clamp(boardWidth - width - 48, 24, boardWidth - width - 24),
              y: 42 + index * 166,
              rotation: [-2, 2][index % 2],
            };
          }

          return item;
        }

        if (item.type === 'note') {
          const index = noteIndex;
          noteIndex += 1;

          if (template === 'timeline') {
            return {
              ...item,
              x: clamp(boardWidth / 2 - item.width / 2, 20, boardWidth - item.width - 20),
              y: 72 + index * 150,
              rotation: 0,
            };
          }

          if (template === 'postcard') {
            return {
              ...item,
              x: clamp(boardWidth * 0.6, 24, boardWidth - item.width - 24),
              y: 74 + index * 184,
              rotation: 0,
            };
          }

          if (template === 'diary') {
            return {
              ...item,
              x: 38,
              y: 48 + index * 188,
              width: Math.max(160, Math.min(360, boardWidth - 96)),
              rotation: -1,
            };
          }
        }

        return item;
      });

      const timelineLine: ScrapbookDecorationItem | null =
        template === 'timeline'
          ? {
              id: `timeline-${page.id}`,
              type: 'decoration',
              kind: 'tape',
              label: '',
              color: '#8b6035',
              x: boardWidth / 2 - 3,
              y: 30,
              width: 6,
              height: Math.min(BOARD_HEIGHT - 60, Math.max(240, photos.length * 126)),
              rotation: 0,
              zIndex: 0,
            }
          : null;

      return {
        ...page,
        template,
        theme: template === 'postcard' ? 'postcard' : page.theme,
        items: timelineLine
          ? [timelineLine, ...nextItems.filter((item) => item.id !== timelineLine.id)]
          : nextItems.filter((item) => !item.id.startsWith('timeline-')),
      };
    });
  };

  const bringToFront = (itemId: string) => {
    updateScrapbookItems((current) => {
      const nextZIndex = current.reduce((highest, item) => Math.max(highest, item.zIndex), 0) + 1;

      return current.map((item) => (item.id === itemId ? { ...item, zIndex: nextZIndex } : item));
    });
  };

  const updateScrapbookItem = (itemId: string, updates: Partial<ScrapbookItem>) => {
    updateScrapbookItems((current) =>
      current.map((item) => (item.id === itemId ? ({ ...item, ...updates } as ScrapbookItem) : item))
    );
  };

  const deleteScrapbookItem = (itemId: string) => {
    updateScrapbookItems((current) => current.filter((item) => item.id !== itemId));
    setSelectedItemId((current) => (current === itemId ? null : current));
    setDictationTarget((current) => (current?.type === 'note' && current.itemId === itemId ? null : current));
    setStorageWarning(null);
  };

  const appendTranscriptToTarget = (target: DictationTarget, transcript: string) => {
    if (target.type === 'story') {
      setForm((current) => ({
        ...current,
        content: appendDictationText(current.content, transcript),
      }));
      return;
    }

    updateScrapbookItems((current) =>
      current.map((item) => {
        if (item.type !== 'note' || item.id !== target.itemId) {
          return item;
        }

        return {
          ...item,
          text: appendDictationText(item.text, transcript),
        };
      })
    );
  };

  const stopDictation = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.stop();
    setDictationTarget(null);
  };

  const toggleDictation = (target: DictationTarget) => {
    if (isSameDictationTarget(dictationTarget, target)) {
      stopDictation();
      return;
    }

    const currentRecognition = recognitionRef.current;
    recognitionRef.current = null;
    currentRecognition?.stop();

    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setDictationError('Voice dictation is not available in this browser.');
      setDictationTarget(null);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];

        if (result.isFinal) {
          finalTranscript = `${finalTranscript} ${result[0].transcript}`;
        }
      }

      appendTranscriptToTarget(target, finalTranscript);
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      setDictationTarget(null);
      setDictationError(
        event.error === 'not-allowed'
          ? 'Microphone permission was blocked.'
          : 'Voice dictation stopped. Try again when you are ready.'
      );
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setDictationTarget(null);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setDictationTarget(target);
      setDictationError(null);
    } catch {
      setDictationTarget(null);
      setDictationError('Voice dictation could not start.');
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, item: ScrapbookItem) => {
    const board = boardRef.current;

    if (!board || drawingMode) {
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

  const getBoardPoint = (event: React.PointerEvent<HTMLDivElement> | React.DragEvent<HTMLDivElement>) => {
    const board = boardRef.current;

    if (!board) {
      return { x: 24, y: 24 };
    }

    const boardRect = board.getBoundingClientRect();
    return {
      x: clamp(event.clientX - boardRect.left, 0, boardRect.width),
      y: clamp(event.clientY - boardRect.top, 0, boardRect.height),
    };
  };

  const handleBoardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingMode || event.currentTarget !== event.target) {
      return;
    }

    const strokeId = createId();
    const point = getBoardPoint(event);
    setDrawingStrokeId(strokeId);
    updateCurrentPage((page) => ({
      ...page,
      drawings: [
        ...page.drawings,
        {
          id: strokeId,
          color: drawingColor,
          width: 3,
          points: [point],
        },
      ],
    }));
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const board = boardRef.current;

    if (!board) {
      return;
    }

    if (drawingStrokeId) {
      const point = getBoardPoint(event);
      updateCurrentPage((page) => ({
        ...page,
        drawings: page.drawings.map((stroke) =>
          stroke.id === drawingStrokeId
            ? {
                ...stroke,
                points: [...stroke.points, point],
              }
            : stroke
        ),
      }));
      return;
    }

    if (resizeState) {
      const boardRect = board.getBoundingClientRect();
      const nextWidth = clamp(resizeState.startWidth + event.clientX - resizeState.startX, MIN_PHOTO_WIDTH, MAX_PHOTO_WIDTH);
      const nextNoteWidth = clamp(resizeState.startWidth + event.clientX - resizeState.startX, MIN_NOTE_WIDTH, MAX_NOTE_WIDTH);
      const nextNoteHeight = clamp(resizeState.startHeight + event.clientY - resizeState.startY, MIN_NOTE_HEIGHT, MAX_NOTE_HEIGHT);

      updateScrapbookItems((current) =>
        current.map((item) => {
          if (item.id !== resizeState.id) {
            return item;
          }

          if (item.type === 'note') {
            return {
              ...item,
              width: Math.min(nextNoteWidth, Math.max(MIN_NOTE_WIDTH, boardRect.width - item.x)),
              height: Math.min(nextNoteHeight, Math.max(MIN_NOTE_HEIGHT, boardRect.height - item.y)),
            };
          }

          if (item.type !== 'photo') {
            return item;
          }

          return {
            ...item,
            width: Math.min(nextWidth, Math.max(MIN_PHOTO_WIDTH, boardRect.width - item.x)),
            height: getPhotoHeight(Math.min(nextWidth, Math.max(MIN_PHOTO_WIDTH, boardRect.width - item.x))),
          };
        })
      );
      return;
    }

    if (rotateState) {
      const angle = Math.atan2(event.clientY - rotateState.centerY, event.clientX - rotateState.centerX) * (180 / Math.PI) + 90;

      updateScrapbookItems((current) =>
        current.map((item) => (item.id === rotateState.id ? { ...item, rotation: Math.round(angle) } : item))
      );
      return;
    }

    if (!dragState) {
      return;
    }

    const boardRect = board.getBoundingClientRect();

    updateScrapbookItems((current) =>
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
    setResizeState(null);
    setRotateState(null);
    setDrawingStrokeId(null);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));

    if (files.length === 0) {
      return;
    }

    try {
      const photoSources = await Promise.all(files.map(readPhotoFile));
      const newAssets = photoSources.map<PhotoAsset>((src, index) => ({
        id: createId(),
        src,
        alt: files[index].name,
        caption: files[index].name.replace(/\.[^/.]+$/, ''),
      }));

      updateCurrentPage((page) => ({
        ...page,
        photoTray: [...page.photoTray, ...newAssets],
      }));
      setStorageWarning(null);
    } catch {
      setStorageWarning('One of those photos could not be added.');
    } finally {
      event.target.value = '';
    }
  };

  const handleInsertedPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    const remainingPhotoSlots = MAX_INSERTED_JOURNAL_PHOTOS - insertedJournalPhotos.length;

    if (files.length === 0) {
      return;
    }

    if (remainingPhotoSlots <= 0) {
      setStorageWarning(`You can insert up to ${MAX_INSERTED_JOURNAL_PHOTOS} photos per journal for now.`);
      event.target.value = '';
      return;
    }

    const acceptedFiles = files.slice(0, remainingPhotoSlots);

    try {
      const photoSources = await Promise.all(acceptedFiles.map(readPhotoFile));
      const newPhotos = photoSources.map<InsertedJournalPhoto>((src, index) => ({
        id: createId(),
        src,
        alt: acceptedFiles[index].name,
        caption: acceptedFiles[index].name.replace(/\.[^/.]+$/, ''),
      }));

      setInsertedJournalPhotos((current) => [...current, ...newPhotos]);
      setStorageWarning(
        files.length > remainingPhotoSlots
          ? `Added ${remainingPhotoSlots} photo${remainingPhotoSlots === 1 ? '' : 's'}. You can insert up to ${MAX_INSERTED_JOURNAL_PHOTOS} photos per journal for now.`
          : null
      );
    } catch {
      setStorageWarning('One of those photos could not be inserted.');
    } finally {
      event.target.value = '';
    }
  };

  const updateInsertedPhotoCaption = (photoId: string, caption: string) => {
    setInsertedJournalPhotos((current) =>
      current.map((photo) => (photo.id === photoId ? { ...photo, caption } : photo))
    );
  };

  const removeInsertedPhoto = (photoId: string) => {
    setInsertedJournalPhotos((current) => current.filter((photo) => photo.id !== photoId));
  };

  const addNote = () => {
    const itemNumber = scrapbookItems.length;
    const boardWidth = boardRef.current?.clientWidth || BOARD_FALLBACK_WIDTH;
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

    updateScrapbookItems((current) => [...current, note]);
    setSelectedItemId(note.id);
    setStorageWarning(null);
  };

  const addDecoration = (kind: ScrapbookDecorationKind) => {
    setActiveTool('stickers');
    const option = decorationOptions.find((item) => item.kind === kind) || decorationOptions[0];
    const itemNumber = scrapbookItems.length;
    const boardWidth = boardRef.current?.clientWidth || BOARD_FALLBACK_WIDTH;
    const sizes: Record<ScrapbookDecorationKind, { width: number; height: number }> = {
      tape: { width: 130, height: 32 },
      pin: { width: 34, height: 34 },
      paper: { width: 158, height: 128 },
      ticket: { width: 170, height: 82 },
      sticker: { width: 98, height: 68 },
    };
    const size = sizes[kind];
    const decoration: ScrapbookDecorationItem = {
      id: createId(),
      type: 'decoration',
      kind,
      label: option.label,
      color: option.color,
      x: clamp(86 + (itemNumber % 5) * 36, 18, Math.max(18, boardWidth - size.width - 18)),
      y: 74 + (itemNumber % 4) * 44,
      width: size.width,
      height: size.height,
      rotation: [-8, 6, -3, 5][itemNumber % 4],
      zIndex: itemNumber + 1,
    };

    updateScrapbookItems((current) => [...current, decoration]);
    setSelectedItemId(decoration.id);
    setStorageWarning(null);
  };

  const placePhotoFromTray = (asset: PhotoAsset, point?: DrawingPoint) => {
    const boardWidth = boardRef.current?.clientWidth || BOARD_FALLBACK_WIDTH;
    const itemNumber = scrapbookItems.length;
    const maxX = Math.max(24, boardWidth - PHOTO_WIDTH - 24);
    const photo: ScrapbookPhotoItem = {
      id: createId(),
      type: 'photo',
      src: asset.src,
      alt: asset.alt,
      caption: asset.caption,
      x: point ? clamp(point.x - PHOTO_WIDTH / 2, 16, maxX) : clamp(28 + (itemNumber % 4) * 44, 16, maxX),
      y: point ? clamp(point.y - PHOTO_HEIGHT / 2, 16, BOARD_HEIGHT - PHOTO_HEIGHT - 16) : 34 + (itemNumber % 3) * 38,
      width: PHOTO_WIDTH,
      height: PHOTO_HEIGHT,
      rotation: [-6, 4, -3, 5][itemNumber % 4],
      zIndex: itemNumber + 1,
    };

    updateScrapbookItems((current) => [...current, photo]);
    setSelectedItemId(photo.id);
    setStorageWarning(null);
  };

  const handlePhotoDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const assetId = event.dataTransfer.getData('text/scrapbook-photo');
    const asset = currentPage?.photoTray.find((photo) => photo.id === assetId);

    if (!asset) {
      return;
    }

    placePhotoFromTray(asset, getBoardPoint(event));
  };

  const handleDndDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== 'scrapbook-canvas-dropzone') {
      return;
    }

    const assetId = event.active.data.current?.assetId;

    if (typeof assetId !== 'string') {
      return;
    }

    const asset = currentPage?.photoTray.find((photo) => photo.id === assetId);

    if (asset) {
      placePhotoFromTray(asset);
    }
  };

  const clearCurrentPage = () => {
    updateCurrentPage((page) => ({
      ...page,
      items: [],
      drawings: [],
    }));
    setSelectedItemId(null);
    setDrawingStrokeId(null);
    setStorageWarning(null);
  };

  const undoLastDrawing = () => {
    updateCurrentPage((page) => ({
      ...page,
      drawings: page.drawings.slice(0, -1),
    }));
  };

  const startItemResize = (event: React.PointerEvent<HTMLButtonElement>, item: ScrapbookPhotoItem | ScrapbookNoteItem) => {
    const board = boardRef.current;

    if (!board) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelectedItemId(item.id);
    bringToFront(item.id);
    setResizeState({
      id: item.id,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: item.width,
      startHeight: item.height,
    });
    board.setPointerCapture(event.pointerId);
  };

  const startItemRotate = (event: React.PointerEvent<HTMLButtonElement>, item: ScrapbookItem) => {
    const board = boardRef.current;

    if (!board) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const boardRect = board.getBoundingClientRect();
    setSelectedItemId(item.id);
    bringToFront(item.id);
    setRotateState({
      id: item.id,
      centerX: boardRect.left + item.x + item.width / 2,
      centerY: boardRect.top + item.y + item.height / 2,
    });
    board.setPointerCapture(event.pointerId);
  };

  const nudgeSelectedItem = (deltaX: number, deltaY: number) => {
    const boardRect = boardRef.current?.getBoundingClientRect();

    updateScrapbookItems((current) =>
      current.map((item) => {
        if (item.id !== selectedItemId) {
          return item;
        }

        return {
          ...item,
          x: clamp(item.x + deltaX, 0, Math.max(0, (boardRect?.width || BOARD_FALLBACK_WIDTH) - item.width)),
          y: clamp(item.y + deltaY, 0, Math.max(0, (boardRect?.height || BOARD_HEIGHT) - item.height)),
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

  const resizeItemFromMoveable = (itemId: string, width: number, height: number) => {
    updateScrapbookItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        if (item.type === 'note') {
          return {
            ...item,
            width: clamp(width, MIN_NOTE_WIDTH, MAX_NOTE_WIDTH),
            height: clamp(height, MIN_NOTE_HEIGHT, MAX_NOTE_HEIGHT),
          };
        }

        if (item.type === 'photo') {
          return {
            ...item,
            width,
            height: getPhotoHeight(width),
          };
        }

        return item;
      })
    );
  };

  const updateNoteText = (itemId: string, text: string) => {
    updateScrapbookItems((current) =>
      current.map((item) => {
        if (item.id !== itemId || item.type !== 'note') {
          return item;
        }

        return {
          ...item,
          text,
          height: Math.max(item.height, getNoteHeightForText(text, item.width)),
        };
      })
    );
  };

  const rotateItemFromMoveable = (itemId: string, rotation: number) => {
    updateScrapbookItem(itemId, { rotation });
  };

  const handleTripImported = async (result: TripImportResult) => {
    if (!result.scrapbookPages.length) {
      return;
    }

    if (user) {
      try {
        appendImportedTripToStorage(user.id, result.trip);
      } catch {
        setStorageWarning('Trip pages were imported, but AI companion history could not be cached on this device.');
      }
    }

    setScrapbookPages((current) => [...current, ...result.scrapbookPages]);
    setActivePageId(result.scrapbookPages[0].id);
    setSelectedItemId(null);
    setDrawingMode(false);
    setActiveTool('select');
    const importedStartDate = normalizeJournalDate(result.trip.dateRange?.start);
    const importedEndDate = normalizeJournalDate(result.trip.dateRange?.end, importedStartDate);
    const importedEntryForm = {
      title: result.journalDraft.title,
      content: result.journalDraft.content,
      countryId: result.journalDraft.countryId,
      mood: result.journalDraft.mood,
      tags: result.journalDraft.tags.join(', '),
      tripStartDate: importedStartDate,
      tripEndDate: importedEndDate,
    };
    const importedCountry = visitedJournalCountries.find((country) => country.id === result.journalDraft.countryId);
    const linkedCanvaPreview = canvaImportedPreview;
    const linkedCanvaPageCount = linkedCanvaPreview?.dataUrls.length ?? 0;

    setForm(importedEntryForm);
    setCountrySearch(
      importedCountry?.name || ''
    );
    setError(null);
    setStorageWarning(null);

    const importDetails = `Imported ${result.scrapbookPages.length} draft page${
      result.scrapbookPages.length === 1 ? '' : 's'
    }${
      result.passportStampIds.length
        ? ` with ${result.passportStampIds.length} passport stamp link${
            result.passportStampIds.length === 1 ? '' : 's'
          }`
        : ''
    }.`;

    if (!importedCountry) {
      setImportedTripWorkspaceNotice(null);
      setImportNotice(`${importDetails} Pick a visited country to save the journal entry.`);
      setError('Pick a country you have marked on the map before saving this imported trip.');
      return;
    }

    const tripDateError = getJournalDateRangeError(importedStartDate, importedEndDate);

    if (tripDateError) {
      setImportedTripWorkspaceNotice(null);
      setImportNotice(`${importDetails} Fix the trip dates to save the journal entry.`);
      setError(tripDateError);
      return;
    }

    setSaving(true);

    try {
      const response = await createJournalEntry({
        countryId: importedEntryForm.countryId,
        title: importedEntryForm.title,
        content: importedEntryForm.content,
        mood: importedEntryForm.mood,
        tags: result.journalDraft.tags,
        canvaDesignId: linkedCanvaPreview?.design.id,
        canvaDesignTitle: linkedCanvaPreview?.title,
        canvaDesignEditUrl: linkedCanvaPreview ? getCanvaEditUrl(linkedCanvaPreview.design) : undefined,
        canvaPages: linkedCanvaPreview?.dataUrls,
        tripStartDate: importedEntryForm.tripStartDate,
        tripEndDate: importedEntryForm.tripEndDate,
        coverPhoto: null,
        coverPageIndex: linkedCanvaPreview ? canvaCoverPageIndex : null,
        insertedPhotos: insertedJournalPhotos,
      });

      if (response.success && response.data) {
        const savedEntry = response.data as SavedEntry;
        const today = getTodayJournalDate();
        const savedNotice = {
          entry: savedEntry,
          message: 'Imported',
          parsedTrip: {
            title: result.trip.title,
            summary: result.trip.summary,
            countryName: importedCountry.name,
            dateLabel: result.trip.dateRange?.label || formatJournalDateRange(importedStartDate, importedEndDate),
            pageCount: result.scrapbookPages.length,
            stampCount: result.passportStampIds.length,
            dayTitles: result.trip.timeline.map((day) => day.title).slice(0, 3),
            tags: result.journalDraft.tags.slice(0, 4),
            canvaTitle: linkedCanvaPreview?.title,
            canvaPageCount: linkedCanvaPageCount || undefined,
          },
        } satisfies SavedEntryNotice;

        setSavedEntryNotice(savedNotice);
        setImportedTripWorkspaceNotice(savedNotice);
        setForm({
          title: '',
          content: '',
          countryId: '',
          mood: 'nostalgic',
          tags: '',
          tripStartDate: today,
          tripEndDate: today,
        });
        setCountrySearch('');
        setCanvaImportedPreview(null);
        setCanvaCoverPageIndex(0);
        setInsertedJournalPhotos([]);
        setCanvaPreviewPageIndex(0);
        setCanvaPreviewTurnDirection('next');
        setImportNotice(
          `${importDetails} Created "${savedEntry.title}"${
            linkedCanvaPreview ? ` and linked ${linkedCanvaPageCount} Canva page${linkedCanvaPageCount === 1 ? '' : 's'}.` : '.'
          }`
        );
        return;
      }

      setImportedTripWorkspaceNotice(null);
      setImportNotice(`${importDetails} The entry draft is ready, but it could not be saved.`);
      setError(response.error || 'Could not create the imported journal entry.');
    } catch {
      setImportedTripWorkspaceNotice(null);
      setImportNotice(`${importDetails} The entry draft is ready, but it could not be saved.`);
      setError('Could not create the imported journal entry.');
    } finally {
      setSaving(false);
    }
  };

  const loadCanvaDesigns = async (query = canvaQuery) => {
    setCanvaLoading(true);
    setCanvaError(null);

    const response = await fetchCanvaDesigns(query);
    setCanvaLoading(false);

    if (response.success && response.data) {
      setCanvaDesigns(response.data);
      return;
    }

    setCanvaDesigns([]);
    setCanvaError(response.error || 'Could not load Canva designs.');
  };

  const openCanvaModal = () => {
    setCanvaModalOpen(true);
    void loadCanvaDesigns('');
  };

  const connectCanva = () => {
    window.location.href = `/api/canva/oauth/start?returnTo=${encodeURIComponent('/journal')}`;
  };

  const getCanvaEditUrl = (design: CanvaDesign) => {
    const editUrl = new URL(design.urls.edit_url);
    editUrl.searchParams.set('correlation_state', `journal-${design.id}`.slice(0, 50));
    return editUrl.toString();
  };

  const openCanvaPopup = (design: CanvaDesign) => {
    const popupWidth = Math.min(1440, Math.max(1024, window.screen.availWidth - 96));
    const popupHeight = Math.min(980, Math.max(720, window.screen.availHeight - 96));
    const left = Math.max(0, Math.round((window.screen.availWidth - popupWidth) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - popupHeight) / 2));
    const popup = window.open(
      getCanvaEditUrl(design),
      `canva-journal-${design.id}`,
      `popup=yes,width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      window.open(getCanvaEditUrl(design), '_blank', 'noopener,noreferrer');
      return;
    }

    popup.focus();
  };

  const turnCanvaPreviewToPage = (pageIndex: number) => {
    if (!canvaImportedPreview) {
      return;
    }

    const nextIndex = clamp(pageIndex, 0, canvaImportedPreview.dataUrls.length - 1);
    setCanvaPreviewTurnDirection(nextIndex >= canvaPreviewPageIndex ? 'next' : 'previous');
    setCanvaPreviewPageIndex(nextIndex);
  };

  const turnOpenedCanvaToPage = (pageCount: number, pageIndex: number) => {
    if (pageCount <= 0) {
      return;
    }

    const nextIndex = clamp(pageIndex, 0, pageCount - 1);
    setOpenedCanvaTurnDirection(nextIndex >= openedCanvaPageIndex ? 'next' : 'previous');
    setOpenedCanvaPageIndex(nextIndex);
  };

  const createCanvaJournalPage = async () => {
    setCanvaCreatingDesign(true);
    setCanvaError(null);

    const response = await createCanvaDesign(form.title || `Travel Journal Page ${scrapbookPages.length + 1}`);
    setCanvaCreatingDesign(false);

    if (!response.success || !response.data) {
      setCanvaError(response.error || 'Could not create a Canva page.');
      setCanvaModalOpen(true);
      return;
    }

    if (response.warning) {
      setCanvaError(response.warning);
    }

    setCanvaImportedPreview(null);
    setCanvaCoverPageIndex(0);
    setLocalScrapbookBackupOpen(false);
    openCanvaPopup(response.data);
  };

  const importCanvaDesign = async (design: CanvaDesign) => {
    setCanvaImportingDesignId(design.id);
    setCanvaError(null);

    try {
      const exportResponse = await createCanvaExport(design.id, 'jpg');

      if (!exportResponse.success || !exportResponse.data) {
        setCanvaImportingDesignId(null);
        setCanvaError(exportResponse.error || 'Could not start Canva export.');
        return;
      }

      let completedExport = null as Awaited<ReturnType<typeof fetchCanvaExport>>['data'] | null;

      for (let attempt = 0; attempt < 18; attempt += 1) {
        const exportStatusResponse = await fetchCanvaExport(exportResponse.data.id);

        if (!exportStatusResponse.success || !exportStatusResponse.data) {
          setCanvaImportingDesignId(null);
          setCanvaError(exportStatusResponse.error || 'Could not load Canva export.');
          return;
        }

        if (exportStatusResponse.data.status === 'failed') {
          setCanvaImportingDesignId(null);
          setCanvaError(exportStatusResponse.data.error?.message || 'Canva export failed.');
          return;
        }

        if (exportStatusResponse.data.status === 'success') {
          const downloadableExportResponse = await fetchCanvaExport(exportResponse.data.id, true);

          if (!downloadableExportResponse.success || !downloadableExportResponse.data) {
            setCanvaImportingDesignId(null);
            setCanvaError(downloadableExportResponse.error || 'Could not download the exported Canva page.');
            return;
          }

          completedExport = downloadableExportResponse.data;
          break;
        }

        await wait(1500);
      }

      const dataUrls = completedExport?.dataUrls || [];

      if (!dataUrls.length) {
        setCanvaImportingDesignId(null);
        setCanvaError('Canva export is still preparing. Try Import again in a few seconds.');
        return;
      }

      const result = createCanvaImportPages({
        design,
        dataUrls,
        startPageNumber: scrapbookPages.length + 1,
        boardWidth: visibleBoardWidth,
      });

      setScrapbookPages((current) => [...current, ...result.scrapbookPages]);
      setActivePageId(result.scrapbookPages[0].id);
      setSelectedItemId(null);
      setDrawingMode(false);
      setActiveTool('select');
      setForm((current) => ({
        ...current,
        title: result.title,
        content: current.content || `Imported Canva design: ${result.title}`,
        tags: current.tags ? `${current.tags}, canva` : 'canva',
      }));
      setImportNotice(
        `Imported ${result.scrapbookPages.length} Canva page${result.scrapbookPages.length === 1 ? '' : 's'} from ${result.title}.`
      );
      setCanvaImportedPreview({
        design,
        title: result.title,
        dataUrls,
      });
      setCanvaPreviewPageIndex(0);
      setCanvaCoverPageIndex(0);
      setLocalScrapbookBackupOpen(false);
      setCanvaImportingDesignId(null);
      setCanvaModalOpen(false);
    } catch (error) {
      setCanvaImportingDesignId(null);
      setCanvaError(error instanceof Error ? error.message : 'Could not import this Canva design.');
    }
  };

  const saveCurrentJournalEntry = async () => {
    if (!user) {
      return;
    }

    const cleanInstagramUrl = instagramEmbedUrl.trim();
    const normalizedInstagramUrl = cleanInstagramUrl
      ? normalizeInstagramEmbedUrl(cleanInstagramUrl)
      : null;
    const tripDateError = getJournalDateRangeError(form.tripStartDate, form.tripEndDate);

    if (cleanInstagramUrl && !normalizedInstagramUrl) {
      setInstagramError('Paste a public Instagram post or Reel URL.');
      setError('Fix or clear the Instagram URL before saving this journal.');
      return;
    }

    if (tripDateError) {
      setError(tripDateError);
      return;
    }

    if (!selectedVisitedCountry) {
      setError('Pick a country you have marked on the map before saving this journal.');
      return;
    }

    setError(null);
    setInstagramError(null);
    setSaving(true);

    const response = await createJournalEntry({
      countryId: form.countryId,
      title: form.title,
      content: form.content,
      mood: form.mood,
      tags: Array.from(
        new Set([
          ...form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          ...(normalizedInstagramUrl ? ['instagram'] : []),
        ])
      ),
      canvaDesignId: canvaImportedPreview?.design.id,
      canvaDesignTitle: canvaImportedPreview?.title,
      canvaDesignEditUrl: canvaImportedPreview ? getCanvaEditUrl(canvaImportedPreview.design) : undefined,
      canvaPages: canvaImportedPreview?.dataUrls,
      tripStartDate: form.tripStartDate,
      tripEndDate: form.tripEndDate,
      coverPhoto: null,
      coverPageIndex: canvaImportedPreview ? canvaCoverPageIndex : null,
      insertedPhotos: insertedJournalPhotos,
      instagramEmbeds: normalizedInstagramUrl ? [normalizedInstagramUrl] : [],
    });

    setSaving(false);

    if (response.success && response.data) {
      const savedEntry = response.data as SavedEntry;

      setSavedEntryNotice({
        entry: savedEntry,
        message: 'Saved',
      });
      const today = getTodayJournalDate();
      setForm({ ...form, title: '', content: '', countryId: '', tags: '', tripStartDate: today, tripEndDate: today });
      setCountrySearch('');
      setCanvaImportedPreview(null);
      setCanvaCoverPageIndex(0);
      setInsertedJournalPhotos([]);
      setInstagramEmbedUrl('');
      setInstagramError(null);
      setCanvaPreviewPageIndex(0);
      setCanvaPreviewTurnDirection('next');
      return;
    }

    setError(response.error || 'Could not save entry.');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void saveCurrentJournalEntry();
  };

  const saveOpenedEntryTitle = async () => {
    if (!user || !openedEntry) {
      return;
    }

    const cleanTitle = renameTitleDraft.trim();

    if (!cleanTitle) {
      setRenameError('Add a journal name before saving.');
      return;
    }

    if (cleanTitle === openedEntry.title) {
      setRenamingEntryId(null);
      setRenameError(null);
      return;
    }

    setRenameSaving(true);
    setRenameError(null);

    const response = await updateJournalEntryTitle({
      entryId: openedEntry.id,
      title: cleanTitle,
    });

    setRenameSaving(false);

    if (!response.success || !response.data) {
      setRenameError(response.error || 'Could not rename this journal.');
      return;
    }

    const updatedEntry = response.data as SavedEntry;

    setOpenedEntry((current) => (current?.id === updatedEntry.id ? { ...current, ...updatedEntry } : current));
    setRenameTitleDraft(updatedEntry.title);
    setRenamingEntryId(null);
  };

  const saveEditedEntry = async () => {
    if (!user || !editingEntry) {
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

    setOpenedEntry((current) => (current?.id === updatedEntry.id ? { ...current, ...updatedEntry } : current));
    setSavedEntryNotice({
      entry: updatedEntry,
      message: 'Updated',
    });
    setEditingEntry(null);
  };

  const requestDeleteEntry = (entry: SavedEntry) => {
    setEntryPendingDelete(entry);
    setDeleteError(null);
    setSharingEntryId(null);
    setCommentEntryId(null);
  };

  const cancelDeleteEntry = () => {
    if (deleteSaving) {
      return;
    }

    setEntryPendingDelete(null);
    setDeleteError(null);
  };

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

    setShareRecipientsByEntry((current) => {
      const nextRecipients = { ...current };
      delete nextRecipients[entryPendingDelete.id];
      return nextRecipients;
    });
    setCommentsByEntry((current) => {
      const nextComments = { ...current };
      delete nextComments[entryPendingDelete.id];
      return nextComments;
    });
    setCommentDrafts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[entryPendingDelete.id];
      return nextDrafts;
    });
    setOpenedEntry((current) => (current?.id === entryPendingDelete.id ? null : current));
    setSavedEntryNotice((current) => (current?.entry.id === entryPendingDelete.id ? null : current));
    setEntryPendingDelete(null);
  };

  const openSharePanel = async (entry: SavedEntry) => {
    setSharingEntryId(entry.id);
    setShareLoading(true);
    setShareError(null);
    setShareNotice(null);

    const response = await fetchJournalEntryShares(entry.id);
    setShareLoading(false);

    if (!response.success) {
      setShareError(response.error || 'Unable to load share settings.');
      setSelectedShareFriendIds([]);
      return;
    }

    const recipients = response.data ?? [];
    setShareRecipientsByEntry((current) => ({
      ...current,
      [entry.id]: recipients,
    }));
    setSelectedShareFriendIds(recipients.map((recipient) => recipient.id));
  };

  const toggleShareFriend = (friendId: string) => {
    setSelectedShareFriendIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId]
    );
  };

  const saveEntryShares = async (entryId: string) => {
    setShareSaving(true);
    setShareError(null);
    setShareNotice(null);

    const response = await saveJournalEntryShares(entryId, selectedShareFriendIds);
    setShareSaving(false);

    if (!response.success) {
      setShareError(response.error || 'Unable to save sharing settings.');
      return;
    }

    setShareRecipientsByEntry((current) => ({
      ...current,
      [entryId]: response.data ?? [],
    }));
    setShareNotice(selectedShareFriendIds.length > 0 ? 'Sharing updated.' : 'Sharing removed.');
  };

  const openCommentPanel = async (entryId: string) => {
    setCommentEntryId(entryId);
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
            <p className="text-xs text-ink/55">A private thread for this shared entry.</p>
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
          <p className="rounded-md border border-dashed border-gold/25 bg-cream/40 p-3 text-sm text-ink/60">
            No comments yet.
          </p>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => (
              <article key={comment.id} className="rounded-md border border-gold/14 bg-cream/35 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-ink">
                    {comment.author.displayName || comment.author.email}
                  </p>
                  <time className="shrink-0 text-[11px] text-ink/45" dateTime={comment.createdAt}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <p className="mt-1 text-sm leading-5 text-ink/72">{comment.body}</p>
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

  const isStoryDictating = dictationTarget?.type === 'story';
  const isSelectedNoteDictating =
    selectedItem?.type === 'note' &&
    dictationTarget?.type === 'note' &&
    dictationTarget.itemId === selectedItem.id;
  const visibleBoardWidth = boardWidth || BOARD_FALLBACK_WIDTH;
  const hasPageContent = scrapbookItems.length > 0 || (currentPage?.drawings.length || 0) > 0;
  const canvaNeedsConnection = canvaError?.toLowerCase().includes('not connected');
  const hasVisitedCountryLink = Boolean(selectedVisitedCountry);
  const dateRangeErrors = getJournalDateRangeErrors(form.tripStartDate, form.tripEndDate);
  const editDateRangeErrors = getJournalDateRangeErrors(editForm.tripStartDate, editForm.tripEndDate);
  const hasValidDateRange = !dateRangeErrors.startDate && !dateRangeErrors.endDate;
  const cleanInstagramEmbedUrl = instagramEmbedUrl.trim();
  const normalizedInstagramEmbedUrl = cleanInstagramEmbedUrl
    ? normalizeInstagramEmbedUrl(cleanInstagramEmbedUrl)
    : null;
  const hasInstagramEmbedDraft = cleanInstagramEmbedUrl.length > 0;
  const hasValidInstagramEmbed = !hasInstagramEmbedDraft || Boolean(normalizedInstagramEmbedUrl);
  const canSaveCurrentEntry =
    form.title.trim().length > 0 &&
    form.content.trim().length > 0 &&
    form.tripStartDate.length > 0 &&
    form.tripEndDate.length > 0 &&
    hasVisitedCountryLink &&
    hasValidDateRange;
  const hasImportedTripWorkspaceContent = Boolean(importedTripWorkspaceNotice || !isFormDraftEmpty(form));

  const renderCanvaPolaroidStrip = ({
    pages,
    activePageIndex,
    title,
    idBase,
    onSelect,
    coverPageIndex,
    onSetCover,
  }: {
    pages: string[];
    activePageIndex: number;
    title: string;
    idBase: string;
    onSelect: (pageIndex: number) => void;
    coverPageIndex?: number | null;
    onSetCover?: (pageIndex: number) => void;
  }) => {
    if (!pages.length) {
      return null;
    }

    return (
      <div className="mx-auto mt-4 max-w-4xl rounded-lg border border-gold/20 bg-white/82 p-3 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <ImagePlus className="h-4 w-4 text-gold-deep" aria-hidden="true" />
          <span>Memory polaroids</span>
        </div>
        <div className="flex gap-3 overflow-x-auto px-1 pb-2 pt-1">
          {pages.map((page, index) => {
            const selected = activePageIndex === index;
            const isCover = coverPageIndex === index;
            const rotationClass = ['-rotate-2', 'rotate-[1.5deg]', '-rotate-1', 'rotate-2'][index % 4];

            return (
              <article
                key={`${idBase}-polaroid-${index}`}
                className={[
                  'relative shrink-0 rounded-sm bg-white p-2 pb-3 shadow-[0_10px_22px_rgba(61,43,14,0.16)] transition-transform hover:-translate-y-1',
                  rotationClass,
                  selected ? 'ring-2 ring-gold-deep' : 'ring-1 ring-gold/18',
                ].join(' ')}
              >
                {isCover ? (
                  <span className="absolute -right-2 -top-2 rounded-full bg-gold-deep px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cream shadow-soft">
                    Cover
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Open ${title} page ${index + 1}`}
                  className="block focus:outline-none focus:ring-2 focus:ring-gold"
                  onClick={() => onSelect(index)}
                >
                  <span
                    role="img"
                    aria-label={`${title} polaroid ${index + 1}`}
                    className="block h-24 w-20 rounded-[2px] bg-cream bg-cover bg-center sm:h-28 sm:w-24"
                    style={{ backgroundImage: `url(${page})` }}
                  />
                </button>
                <span className="mt-2 block max-w-24 truncate text-center text-xs font-semibold text-ink/62">
                  Page {index + 1}
                </span>
                {onSetCover ? (
                  <button
                    type="button"
                    className="mt-2 w-full rounded-md border border-gold/25 bg-cream/70 px-2 py-1 text-[11px] font-semibold text-ink transition hover:bg-gold/15 focus:outline-none focus:ring-2 focus:ring-gold"
                    onClick={() => onSetCover(index)}
                  >
                    {isCover ? 'Cover photo' : 'Set cover'}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEntryAlbumCover = (entry: SavedEntry | SharedJournalEntry, className = 'mb-3 aspect-[4/3]') => {
    const coverPhoto = getEntryCoverPhoto(entry);

    if (!coverPhoto) {
      return null;
    }

    return (
      <div
        role="img"
        aria-label={`${entry.title} album cover`}
        className={[
          className,
          'rounded-md border border-gold/20 bg-cream bg-cover bg-center shadow-inner',
        ].join(' ')}
        style={{ backgroundImage: `url(${coverPhoto})` }}
      />
    );
  };

  const renderInsertedPhotoGrid = (
    photos: InsertedJournalPhoto[],
    options?: {
      editable?: boolean;
    }
  ) => {
    if (!photos.length) {
      return null;
    }

    return (
      <div className="mx-auto mt-4 max-w-4xl rounded-lg border border-gold/20 bg-white/86 p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <ImagePlus className="h-4 w-4 text-gold-deep" aria-hidden="true" />
          <span>Memory photos</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <figure key={photo.id} className="overflow-hidden rounded-md border border-gold/20 bg-cream/45">
              <div
                role="img"
                aria-label={photo.alt || `Memory photo ${index + 1}`}
                className="aspect-[4/3] bg-cream bg-cover bg-center"
                style={{ backgroundImage: `url(${photo.src})` }}
              />
              <figcaption className="space-y-2 p-2">
                {options?.editable ? (
                  <>
                    <input
                      value={photo.caption ?? ''}
                      onChange={(event) => updateInsertedPhotoCaption(photo.id, event.target.value)}
                      aria-label={`Caption for memory photo ${index + 1}`}
                      placeholder="Caption"
                      className="w-full rounded-md border border-gold/25 bg-white px-2 py-1.5 text-xs text-ink outline-none transition placeholder:text-ink/40 focus:border-gold focus:ring-2 focus:ring-gold/20"
                    />
                    <button
                      type="button"
                      className="text-xs font-semibold text-ink/55 transition hover:text-red-600"
                      onClick={() => removeInsertedPhoto(photo.id)}
                    >
                      Remove
                    </button>
                  </>
                ) : photo.caption ? (
                  <span className="block text-xs font-semibold text-ink/62">{photo.caption}</span>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    );
  };

  const renderMemoryPhotoTray = () => (
    <section className="mx-auto mt-4 max-w-4xl rounded-lg border border-gold/20 bg-white/88 p-4 shadow-soft">
      <input
        ref={insertedPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={insertedJournalPhotos.length >= MAX_INSERTED_JOURNAL_PHOTOS}
        onChange={handleInsertedPhotoUpload}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gold/15 text-gold-deep">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">Memory photos</h3>
            <p className="text-xs font-semibold text-ink/50">
              {insertedJournalPhotos.length} / {MAX_INSERTED_JOURNAL_PHOTOS} photos
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          disabled={insertedJournalPhotos.length >= MAX_INSERTED_JOURNAL_PHOTOS}
          onClick={() => insertedPhotoInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Add Photos
        </Button>
      </div>

      {insertedJournalPhotos.length ? (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {insertedJournalPhotos.map((photo, index) => (
            <figure key={photo.id} className="w-44 shrink-0 overflow-hidden rounded-md border border-gold/20 bg-cream/45">
              <div
                role="img"
                aria-label={photo.alt || `Memory photo ${index + 1}`}
                className="aspect-[4/3] bg-cream bg-cover bg-center"
                style={{ backgroundImage: `url(${photo.src})` }}
              />
              <figcaption className="space-y-2 p-2">
                <input
                  value={photo.caption ?? ''}
                  onChange={(event) => updateInsertedPhotoCaption(photo.id, event.target.value)}
                  aria-label={`Caption for memory photo ${index + 1}`}
                  placeholder="Caption"
                  className="w-full rounded-md border border-gold/25 bg-white px-2 py-1.5 text-xs text-ink outline-none transition placeholder:text-ink/40 focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
                <button
                  type="button"
                  className="text-xs font-semibold text-ink/55 transition hover:text-red-600"
                  onClick={() => removeInsertedPhoto(photo.id)}
                >
                  Remove
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center rounded-lg border border-dashed border-gold/30 bg-cream/45 px-4 py-8 text-sm font-semibold text-ink/62 transition hover:border-gold hover:bg-gold/10 focus:outline-none focus:ring-2 focus:ring-gold"
          onClick={() => insertedPhotoInputRef.current?.click()}
        >
          Add memory photos
        </button>
      )}
    </section>
  );

  const renderInstagramAttachment = () => (
    <section className="mx-auto mt-4 max-w-4xl rounded-lg border border-gold/20 bg-white/88 p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Instagram post</h3>
          <p className="mt-1 text-xs leading-5 text-ink/55">
            Optional. Add one public Instagram post or Reel to this same journal entry.
          </p>
        </div>
        {hasInstagramEmbedDraft && hasValidInstagramEmbed ? (
          <a
            href={normalizedInstagramEmbedUrl || cleanInstagramEmbedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gold-deep transition hover:text-ink"
          >
            Preview on Instagram
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <Input
        label="Instagram post URL"
        value={instagramEmbedUrl}
        onChange={(event) => {
          setInstagramEmbedUrl(event.target.value);
          setInstagramError(null);
        }}
        placeholder="https://www.instagram.com/p/..."
        className="mt-3"
      />
      <div className="mt-3 rounded-lg border border-gold/18 bg-cream/45 px-4 py-3 text-sm leading-6 text-ink/68">
        Instagram embeds only work for public posts from public accounts. If the post is deleted, made private,
        restricted, or Instagram blocks embedding for it, it may not appear in the journal.
      </div>
      {instagramError ? <p className="mt-2 text-sm text-red-600">{instagramError}</p> : null}
      {hasInstagramEmbedDraft && !hasValidInstagramEmbed ? (
        <p className="mt-2 text-sm text-red-600">Paste a public Instagram post or Reel URL.</p>
      ) : null}
    </section>
  );

  const renderCountrySearch = (inputId: string) => (
    <div>
      <label className="mb-2 block text-sm font-medium text-ink" htmlFor={inputId}>
        Country
      </label>
      <div className="relative">
        <input
          id={inputId}
          value={countrySearch}
          onChange={(event) => {
            setCountrySearch(event.target.value);
            setCountryPickerOpen(true);
            setForm((current) => ({
              ...current,
              countryId: selectedVisitedCountry?.name === event.target.value ? current.countryId : '',
            }));
          }}
          onFocus={() => setCountryPickerOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setCountryPickerOpen(false), 120);
          }}
          placeholder="Search your visited countries"
          className="w-full rounded-lg border-2 border-gold/30 bg-white px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-gold focus:ring-2 focus:ring-gold/30"
          role="combobox"
          aria-expanded={countryPickerOpen}
          aria-controls={`${inputId}-options`}
          aria-autocomplete="list"
        />
        {countryPickerOpen ? (
          <div
            id={`${inputId}-options`}
            className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gold/25 bg-white p-1 shadow-soft"
            role="listbox"
          >
            {filteredVisitedCountries.length ? (
              filteredVisitedCountries.map((country) => (
                <button
                  key={`${inputId}-${country.id}`}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-ink transition hover:bg-cream focus:bg-cream focus:outline-none"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setForm((current) => ({ ...current, countryId: country.id }));
                    setCountrySearch(country.name);
                    setCountryPickerOpen(false);
                  }}
                  role="option"
                  aria-selected={form.countryId === country.id}
                >
                  <span className="min-w-0 truncate">{country.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-ink/45">{country.id}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-ink/60">No visited countries match.</p>
            )}
          </div>
        ) : null}
      </div>
      {suggestedVisitedCountry ? (
        <div className="mt-2 rounded-lg border border-gold/25 bg-gold/10 px-3 py-2 text-sm text-ink">
          <p className="font-semibold">Suggestion: is this journal linked to {suggestedVisitedCountry.name}?</p>
          <button
            type="button"
            className="mt-2 rounded-md border border-gold/30 bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setForm((current) => ({ ...current, countryId: suggestedVisitedCountry.id }));
              setCountrySearch(suggestedVisitedCountry.name);
              setCountryPickerOpen(false);
            }}
          >
            Link to {suggestedVisitedCountry.name}
          </button>
        </div>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-ink/55">
        If the country does not appear, please select it on the map first.
      </p>
    </div>
  );

  const renderCanvaImportedPreview = (preview: CanvaImportedPreview) => {
    const activePageIndex = clamp(canvaPreviewPageIndex, 0, preview.dataUrls.length - 1);
    const activePageSrc = preview.dataUrls[activePageIndex];

    return (
      <div className="bg-cream">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/20 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gold/15 text-gold-deep">
              <Palette className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink/50" htmlFor="canva-journal-name">
                Journal name
              </label>
              <input
                id="canva-journal-name"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="mt-1 w-full min-w-[220px] rounded-md border border-gold/25 bg-cream px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                required
              />
              <p className="text-xs text-ink/50">
                Page {activePageIndex + 1} of {preview.dataUrls.length}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {preview.dataUrls.length > 1 ? (
              <div className="flex items-center gap-2 rounded-lg border border-gold/25 bg-cream px-2">
                <button
                  type="button"
                  aria-label="Previous Canva page"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={activePageIndex === 0}
                  onClick={() => turnCanvaPreviewToPage(activePageIndex - 1)}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="min-w-16 text-center text-xs font-semibold text-ink/60">
                  {activePageIndex + 1} / {preview.dataUrls.length}
                </span>
                <button
                  type="button"
                  aria-label="Next Canva page"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={activePageIndex >= preview.dataUrls.length - 1}
                  onClick={() => turnCanvaPreviewToPage(activePageIndex + 1)}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setCanvaImportedPreview(null);
                setCanvaCoverPageIndex(0);
              }}
            >
              Edit Again
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => openCanvaPopup(preview.design)}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Pop-up
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={saving}
              disabled={!canSaveCurrentEntry}
              onClick={() => void saveCurrentJournalEntry()}
            >
              Save Entry
            </Button>
          </div>
        </div>
        <div className="bg-[#e8dcc2] p-4 [perspective:1800px] [background-image:linear-gradient(90deg,rgba(61,43,14,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.38),rgba(255,255,255,0))] sm:p-6">
          <motion.figure
            key={`${preview.design.id}-${activePageIndex}`}
            initial={{
              opacity: 0.82,
              rotateY: canvaPreviewTurnDirection === 'next' ? -14 : 14,
              x: canvaPreviewTurnDirection === 'next' ? 22 : -22,
            }}
            animate={{ opacity: 1, rotateY: 0, x: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="relative mx-auto w-full max-w-4xl rounded-md border border-gold/20 bg-[#fbf4e5] p-2 shadow-[0_24px_54px_rgba(61,43,14,0.22)]"
          >
            <div aria-hidden="true" className="absolute inset-y-4 left-2 w-8 rounded-l-sm bg-gradient-to-r from-ink/12 via-ink/4 to-transparent" />
            <div aria-hidden="true" className="absolute inset-y-5 right-2 w-5 rounded-r-sm bg-gradient-to-l from-white/70 to-transparent" />
            <div
              role="img"
              aria-label={`${preview.title} page ${activePageIndex + 1}`}
              className="relative min-h-[560px] w-full rounded-sm border border-ink/10 bg-white bg-contain bg-center bg-no-repeat shadow-inner"
              style={{ backgroundImage: `url(${activePageSrc})` }}
            />
            <figcaption className="mt-2 flex items-center justify-between px-1 text-xs text-ink/45">
              <span>{preview.title}</span>
              <span>Page {activePageIndex + 1}</span>
            </figcaption>
          </motion.figure>
          {renderCanvaPolaroidStrip({
            pages: preview.dataUrls,
            activePageIndex,
            title: preview.title,
            idBase: preview.design.id,
            onSelect: turnCanvaPreviewToPage,
            coverPageIndex: canvaCoverPageIndex,
            onSetCover: setCanvaCoverPageIndex,
          })}
          <div className="mx-auto mt-4 grid max-w-4xl gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="rounded-lg border border-gold/20 bg-white/86 p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-ink" htmlFor="canva-page-story">
                  <Type className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                  Story below this page
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant={isStoryDictating ? 'secondary' : 'ghost'}
                  className="gap-2"
                  onClick={() => toggleDictation({ type: 'story' })}
                >
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  {isStoryDictating ? 'Stop' : 'Dictate'}
                </Button>
              </div>
              <textarea
                id="canva-page-story"
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                rows={5}
                placeholder="What do you want to remember?"
                className="mt-3 w-full resize-y rounded-lg border border-gold/25 bg-cream/45 px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/40 focus:border-gold focus:ring-2 focus:ring-gold/25"
                required
              />
              {isStoryDictating ? <p className="mt-2 text-sm font-semibold text-gold-deep">Listening...</p> : null}
              {dictationError ? <p className="mt-2 text-sm text-red-600">{dictationError}</p> : null}
            </div>
            <div className="rounded-lg border border-gold/20 bg-white/86 p-4 shadow-soft">
              <label className="text-sm font-semibold text-ink" htmlFor="canva-page-tags">
                Tags
              </label>
              <Input
                id="canva-page-tags"
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
                placeholder="market, sunset, train"
                className="mt-3"
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input
                  label="Trip start"
                  type="date"
                  value={form.tripStartDate}
                  max={form.tripEndDate}
                  error={dateRangeErrors.startDate}
                  onChange={(event) => setForm({ ...form, tripStartDate: event.target.value })}
                  required
                />
                <Input
                  label="Trip end"
                  type="date"
                  value={form.tripEndDate}
                  min={form.tripStartDate}
                  error={dateRangeErrors.endDate}
                  onChange={(event) => setForm({ ...form, tripEndDate: event.target.value })}
                  required
                />
              </div>
              <div className="mt-3">
                {renderCountrySearch('canva-page-country')}
              </div>
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
              {!canSaveCurrentEntry ? (
                <p className="mt-3 text-xs font-semibold text-gold-deep">
                  Add a journal name, story, and visited country to save.
                </p>
              ) : null}
            </div>
          </div>
          {renderMemoryPhotoTray()}
          {renderInstagramAttachment()}
        </div>
        {preview.dataUrls.length > 1 ? (
          <div className="flex justify-center gap-2 border-t border-gold/15 bg-white px-4 py-3">
            {preview.dataUrls.map((_, index) => (
              <button
                key={`${preview.design.id}-dot-${index}`}
                type="button"
                aria-label={`Go to Canva page ${index + 1}`}
                className={[
                  'h-2.5 rounded-full transition-all',
                  activePageIndex === index ? 'w-8 bg-gold-deep' : 'w-2.5 bg-gold/35 hover:bg-gold/60',
                ].join(' ')}
                onClick={() => turnCanvaPreviewToPage(index)}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderSavedCanvaBook = (entry: SavedEntry) => {
    const pages = getEntryCanvaPages(entry);

    if (!pages.length) {
      return null;
    }

    const activePageIndex = clamp(openedCanvaPageIndex, 0, pages.length - 1);
    const activePageSrc = pages[activePageIndex];
    const editUrl = getEntryCanvaEditUrl(entry);

    return (
      <section className="mt-6 overflow-hidden rounded-lg border border-gold/20 bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/15 bg-cream/50 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{getEntryCanvaTitle(entry)}</p>
            <p className="text-xs text-ink/50">
              Page {activePageIndex + 1} of {pages.length}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pages.length > 1 ? (
              <div className="flex items-center gap-2 rounded-lg border border-gold/25 bg-white px-2">
                <button
                  type="button"
                  aria-label="Previous saved Canva page"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-ink transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={activePageIndex === 0}
                  onClick={() => turnOpenedCanvaToPage(pages.length, activePageIndex - 1)}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="min-w-16 text-center text-xs font-semibold text-ink/60">
                  {activePageIndex + 1} / {pages.length}
                </span>
                <button
                  type="button"
                  aria-label="Next saved Canva page"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-ink transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={activePageIndex >= pages.length - 1}
                  onClick={() => turnOpenedCanvaToPage(pages.length, activePageIndex + 1)}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
            {editUrl ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => window.open(editUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Canva
              </Button>
            ) : null}
          </div>
        </div>
        <div className="bg-[#e8dcc2] p-4 [perspective:1800px] [background-image:linear-gradient(90deg,rgba(61,43,14,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.38),rgba(255,255,255,0))] sm:p-6">
          <motion.figure
            key={`${entry.id}-${activePageIndex}`}
            initial={{
              opacity: 0.82,
              rotateY: openedCanvaTurnDirection === 'next' ? -14 : 14,
              x: openedCanvaTurnDirection === 'next' ? 22 : -22,
            }}
            animate={{ opacity: 1, rotateY: 0, x: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="relative mx-auto w-full max-w-3xl rounded-md border border-gold/20 bg-[#fbf4e5] p-2 shadow-[0_24px_54px_rgba(61,43,14,0.2)]"
          >
            <div aria-hidden="true" className="absolute inset-y-4 left-2 w-8 rounded-l-sm bg-gradient-to-r from-ink/12 via-ink/4 to-transparent" />
            <div aria-hidden="true" className="absolute inset-y-5 right-2 w-5 rounded-r-sm bg-gradient-to-l from-white/70 to-transparent" />
            <div
              role="img"
              aria-label={`${getEntryCanvaTitle(entry)} page ${activePageIndex + 1}`}
              className="relative min-h-[420px] w-full rounded-sm border border-ink/10 bg-white bg-contain bg-center bg-no-repeat shadow-inner sm:min-h-[520px]"
              style={{ backgroundImage: `url(${activePageSrc})` }}
            />
            <figcaption className="mt-2 flex items-center justify-between px-1 text-xs text-ink/45">
              <span className="truncate pr-3">{getEntryCanvaTitle(entry)}</span>
              <span>Page {activePageIndex + 1}</span>
            </figcaption>
          </motion.figure>
        </div>
        {pages.length > 1 ? (
          <div className="flex justify-center gap-2 border-t border-gold/15 bg-white px-4 py-3">
            {pages.map((_, index) => (
              <button
                key={`${entry.id}-saved-canva-dot-${index}`}
                type="button"
                aria-label={`Go to saved Canva page ${index + 1}`}
                className={[
                  'h-2.5 rounded-full transition-all',
                  activePageIndex === index ? 'w-8 bg-gold-deep' : 'w-2.5 bg-gold/35 hover:bg-gold/60',
                ].join(' ')}
                onClick={() => turnOpenedCanvaToPage(pages.length, index)}
              />
            ))}
          </div>
        ) : null}
        <div className="border-t border-gold/15 bg-cream/45 px-4 pb-4">
          {renderCanvaPolaroidStrip({
            pages,
            activePageIndex,
            title: getEntryCanvaTitle(entry),
            idBase: entry.id,
            onSelect: (pageIndex) => turnOpenedCanvaToPage(pages.length, pageIndex),
            coverPageIndex: getEntryCoverPageIndex(entry),
          })}
        </div>
      </section>
    );
  };

  const renderImportedTripWorkspace = () => {
    const parsedTrip = importedTripWorkspaceNotice?.parsedTrip;
    const savedEntry = importedTripWorkspaceNotice?.entry;
    const savedEntryContent = savedEntry ? getEntryContent(savedEntry) : '';
    const memoryDraftText = form.content.trim() || savedEntryContent;
    const memoryDateLabel = parsedTrip?.dateLabel || formatJournalDateRange(form.tripStartDate, form.tripEndDate);
    const memoryTags = parsedTrip?.tags.length
      ? parsedTrip.tags
      : form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
    const memoryKeeperContext: MemoryKeeperTripContext = {
      tripName: parsedTrip?.title || form.title || savedEntry?.title || 'Imported trip',
      dateLabel: memoryDateLabel,
      journalEntries: memoryDraftText
        ? [
            {
              title: savedEntry?.title || form.title || parsedTrip?.title || 'Trip journal',
              content: memoryDraftText,
              dateLabel: memoryDateLabel,
            },
          ]
        : [],
      photos: getMemoryKeeperPhotos(scrapbookPages),
      passportStamps:
        parsedTrip && parsedTrip.stampCount > 0
          ? [
              {
                countryName: parsedTrip.countryName,
                label: `${parsedTrip.stampCount} passport stamp${parsedTrip.stampCount === 1 ? '' : 's'}`,
              },
            ]
          : [],
      boardingPasses: getMemoryKeeperBoardingPasses(scrapbookPages, `${form.content}\n${savedEntryContent}`),
      itineraryItems: getMemoryKeeperItineraryItems(parsedTrip, scrapbookPages, `${form.content}\n${savedEntryContent}`),
      tags: memoryTags,
      summary: parsedTrip?.summary || memoryDraftText,
    };

    return (
      <div className="grid min-h-[680px] gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-gold/20 bg-white/90 p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">
                {parsedTrip ? 'Imported trip' : 'Imported trip draft'}
              </p>
              <h3 className="mt-1 text-2xl font-serif text-ink">
                {parsedTrip?.title || form.title || 'Review imported trip'}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {importedTripWorkspaceNotice ? (
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={() => void openSavedEntry(importedTripWorkspaceNotice.entry)}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Open Entry
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="secondary" onClick={() => setImportModalOpen(true)}>
                Import Another
              </Button>
            </div>
          </div>

          {parsedTrip ? (
            <div className="mt-5 rounded-lg border border-gold/18 bg-cream/45 p-4">
              <p className="text-sm leading-6 text-ink/72">{parsedTrip.summary}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-gold/15 bg-white px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-ink/45">Country</p>
                  <p className="mt-1 font-semibold text-ink">{parsedTrip.countryName}</p>
                </div>
                <div className="rounded-md border border-gold/15 bg-white px-3 py-2 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-ink/45">Dates</p>
                  <p className="mt-1 font-semibold text-ink">{parsedTrip.dateLabel}</p>
                </div>
                <div className="rounded-md border border-gold/15 bg-white px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-ink/45">Pages</p>
                  <p className="mt-1 font-semibold text-ink">{parsedTrip.pageCount}</p>
                </div>
              </div>
              {parsedTrip.canvaTitle ? (
                <div className="mt-4 rounded-lg border border-gold/18 bg-white px-3 py-2 text-sm text-ink/70">
                  <span className="font-semibold text-ink">Linked Canva page:</span> {parsedTrip.canvaTitle}
                  {parsedTrip.canvaPageCount ? ` (${parsedTrip.canvaPageCount} page${parsedTrip.canvaPageCount === 1 ? '' : 's'})` : ''}
                </div>
              ) : null}
              {parsedTrip.dayTitles.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {parsedTrip.dayTitles.map((dayTitle) => (
                    <span key={dayTitle} className="rounded-full border border-gold/20 bg-white px-3 py-1 text-xs text-ink/62">
                      {dayTitle}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <Input
                label="Journal name"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                {renderCountrySearch('imported-trip-country')}
                <Input
                  label="Mood"
                  value={form.mood}
                  onChange={(event) => setForm({ ...form, mood: event.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Trip start"
                  type="date"
                  value={form.tripStartDate}
                  max={form.tripEndDate}
                  error={dateRangeErrors.startDate}
                  onChange={(event) => setForm({ ...form, tripStartDate: event.target.value })}
                  required
                />
                <Input
                  label="Trip end"
                  type="date"
                  value={form.tripEndDate}
                  min={form.tripStartDate}
                  error={dateRangeErrors.endDate}
                  onChange={(event) => setForm({ ...form, tripEndDate: event.target.value })}
                  required
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-ink" htmlFor="imported-trip-story">
                    <Type className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                    Story below this page
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant={isStoryDictating ? 'secondary' : 'ghost'}
                    className="gap-2"
                    onClick={() => toggleDictation({ type: 'story' })}
                  >
                    <Mic className="h-4 w-4" aria-hidden="true" />
                    {isStoryDictating ? 'Stop' : 'Dictate'}
                  </Button>
                </div>
                <textarea
                  id="imported-trip-story"
                  value={form.content}
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                  rows={10}
                  placeholder="Imported trip story"
                  className="w-full resize-y rounded-lg border border-gold/25 bg-cream/45 px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/40 focus:border-gold focus:ring-2 focus:ring-gold/25"
                  required
                />
                {isStoryDictating ? <p className="mt-2 text-sm font-semibold text-gold-deep">Listening...</p> : null}
                {dictationError ? <p className="mt-2 text-sm text-red-600">{dictationError}</p> : null}
              </div>
              <Input
                label="Tags"
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
                placeholder="market, sunset, train"
              />
              {renderInstagramAttachment()}
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {!hasVisitedCountryLink ? (
                <p className="text-sm font-semibold text-gold-deep">
                  Pick a country you have marked on the map before saving.
                </p>
              ) : null}
              <Button type="submit" isLoading={saving} disabled={!canSaveCurrentEntry}>
                Save Entry
              </Button>
            </form>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-gold/20 bg-white/88 p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Status</p>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              {importedTripWorkspaceNotice
                ? importedTripWorkspaceNotice.parsedTrip?.canvaTitle
                  ? 'This imported trip was saved and linked to the Canva page.'
                  : 'This imported trip was saved as a journal entry.'
                : 'Review the parsed text, link a visited country, then save it as a journal entry.'}
            </p>
            {importNotice ? (
              <p className="mt-3 rounded-md border border-gold/20 bg-cream/50 px-3 py-2 text-sm text-ink/70">
                {importNotice}
              </p>
            ) : null}
          </section>

          <MemoryKeeperCard
            context={memoryKeeperContext}
            draftText={memoryDraftText}
            onUseDraft={
              parsedTrip
                ? undefined
                : (nextContent) => {
                    setForm((current) => ({ ...current, content: nextContent }));
                  }
            }
            onAppendDraft={
              parsedTrip
                ? undefined
                : (nextContent) => {
                    setForm((current) => ({
                      ...current,
                      content: [current.content.trim(), nextContent.trim()].filter(Boolean).join('\n\n'),
                    }));
                  }
            }
          />

          {parsedTrip?.tags.length ? (
            <section className="rounded-lg border border-gold/20 bg-white/88 p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Tags</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {parsedTrip.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-gold/12 px-3 py-1 text-xs font-semibold text-gold-deep">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {parsedTrip ? (
            <section className="rounded-lg border border-gold/20 bg-white/88 p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Passport links</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{parsedTrip.stampCount}</p>
            </section>
          ) : null}

          {parsedTrip?.canvaTitle ? (
            <section className="rounded-lg border border-gold/20 bg-white/88 p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Canva link</p>
              <p className="mt-2 text-sm font-semibold text-ink">{parsedTrip.canvaTitle}</p>
              {parsedTrip.canvaPageCount ? (
                <p className="mt-1 text-sm text-ink/58">
                  {parsedTrip.canvaPageCount} page{parsedTrip.canvaPageCount === 1 ? '' : 's'} attached
                </p>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    );
  };

  const renderCanvaWorkspace = () => (
    <section className="overflow-hidden rounded-lg border border-gold/25 bg-[#fff8ea] shadow-soft">
      <div className="border-b border-gold/20 bg-white/72 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Canva workspace</p>
            <h2 className="mt-1 text-3xl font-serif text-ink">Design the page in Canva</h2>
            <p className="mt-2 max-w-2xl text-sm text-ink/62">
              Start a fresh journal page, bring in a finished Canva design, then add the story and country before saving.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="gap-2" isLoading={canvaCreatingDesign} onClick={() => void createCanvaJournalPage()}>
              <Palette className="h-4 w-4" aria-hidden="true" />
              Create New Canva Design
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => {
                setImportModalOpen(true);
                setLocalScrapbookBackupOpen(false);
              }}
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Import Trip Itinerary
            </Button>
            <Button type="button" variant="secondary" className="gap-2" onClick={openCanvaModal}>
              <Search className="h-4 w-4" aria-hidden="true" />
              Choose Existing Canva Design
            </Button>
          </div>
        </div>
      </div>

      {importModalOpen ? (
        <div className="p-5">
          {canvaImportedPreview ? (
            <div className="mb-4 rounded-lg border border-gold/20 bg-white px-4 py-3 text-sm text-ink/70 shadow-soft">
              Importing this trip will link it to <span className="font-semibold text-ink">{canvaImportedPreview.title}</span>.
            </div>
          ) : null}
          <ImportTripModal
            open={importModalOpen}
            inline
            startPageNumber={scrapbookPages.length + 1}
            boardWidth={visibleBoardWidth}
            onClose={() => setImportModalOpen(false)}
            onImport={handleTripImported}
          />
        </div>
      ) : importedTripWorkspaceNotice ? (
        renderImportedTripWorkspace()
      ) : canvaImportedPreview ? (
        <div className="p-5">
          <div className="overflow-hidden rounded-lg border border-gold/20 bg-white shadow-soft">
            {renderCanvaImportedPreview(canvaImportedPreview)}
          </div>
        </div>
      ) : hasImportedTripWorkspaceContent ? (
        renderImportedTripWorkspace()
      ) : (
        <div className="p-5">
          <div className="relative min-h-[680px] overflow-hidden rounded-lg border border-gold/20 bg-cream">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(61,43,14,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(61,43,14,0.07)_1px,transparent_1px)] bg-[size:36px_36px]" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(47,111,109,0.08)_44%,rgba(193,154,91,0.12))]" />
            <div className="relative flex min-h-[680px] items-center justify-center px-5 text-center">
              <div className="max-w-2xl rounded-lg border border-gold/25 bg-white/88 p-6 shadow-soft">
                <Palette className="mx-auto h-10 w-10 text-gold-deep" aria-hidden="true" />
                <h3 className="mt-4 text-2xl font-serif text-ink">Your next journal page starts here</h3>
                <p className="mt-3 text-sm leading-6 text-ink/64">
                  Use the buttons above to create a page in Canva or import a design you already finished.
                </p>
                {canvaError ? <p className="mt-4 text-sm text-red-600">{canvaError}</p> : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const renderCanvaModal = () => {
    if (!canvaModalOpen) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-8">
        <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-lg border border-gold/30 bg-cream shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-gold/20 bg-[#fff8ea] px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Canva</p>
              <h2 className="mt-1 text-2xl font-serif text-ink">Import Canva Design</h2>
              <p className="mt-1 max-w-2xl text-sm text-ink/65">
                Pick a Canva design, export it as a PNG, and add it to your scrapbook pages.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close Canva import"
              className="rounded-full p-2 text-ink/65 transition hover:bg-white hover:text-ink"
              onClick={() => setCanvaModalOpen(false)}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[calc(88vh-112px)] overflow-y-auto p-5">
            <form
              className="mb-4 flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void loadCanvaDesigns(canvaQuery);
              }}
            >
              <Input
                value={canvaQuery}
                onChange={(event) => setCanvaQuery(event.target.value)}
                placeholder="Search Canva designs..."
                aria-label="Search Canva designs"
              />
              <Button type="submit" variant="secondary" className="gap-2" isLoading={canvaLoading}>
                <Search className="h-4 w-4" aria-hidden="true" />
                Search
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={connectCanva}>
                <Palette className="h-4 w-4" aria-hidden="true" />
                Connect
              </Button>
            </form>

            {canvaError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{canvaError}</span>
                  {canvaNeedsConnection ? (
                    <Button type="button" size="sm" onClick={connectCanva}>
                      Connect Canva
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {canvaLoading ? (
              <div className="rounded-lg border border-gold/20 bg-white px-4 py-10 text-center text-ink/60">
                Loading Canva designs...
              </div>
            ) : canvaDesigns.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {canvaDesigns.map((design) => (
                  <article key={design.id} className="overflow-hidden rounded-lg border border-gold/25 bg-white shadow-soft">
                    <div className="aspect-[4/3] bg-cream">
                      {design.thumbnail?.url ? (
                        <div
                          role="img"
                          aria-label={design.title || 'Canva design'}
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${design.thumbnail.url})` }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-ink/45">No preview</div>
                      )}
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <h3 className="line-clamp-2 text-base font-semibold text-ink">{design.title || 'Untitled Canva design'}</h3>
                        <p className="mt-1 text-xs text-ink/55">
                          {design.page_count ? `${design.page_count} page${design.page_count === 1 ? '' : 's'}` : 'Canva design'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2"
                          variant="secondary"
                          onClick={() => openCanvaPopup(design)}
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2"
                          isLoading={canvaImportingDesignId === design.id}
                          onClick={() => void importCanvaDesign(design)}
                        >
                          <Palette className="h-4 w-4" aria-hidden="true" />
                          Import
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gold/20 bg-white px-4 py-10 text-center text-ink/60">
                No Canva designs found.
              </div>
            )}
          </div>
        </div>
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
              <h2 id="edit-entry-title" className="mt-2 text-3xl font-serif font-semibold text-ink">
                Update entry
              </h2>
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
              <label className="mb-2 block text-sm font-medium text-ink" htmlFor="edit-entry-country">
                Country
              </label>
              <select
                id="edit-entry-country"
                value={editCountryOptions.some((country) => country.id === editForm.countryId) ? editForm.countryId : ''}
                onChange={(event) => setEditForm((current) => ({ ...current, countryId: event.target.value }))}
                className="w-full rounded-lg border-2 border-gold/30 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
                required
              >
                <option value="">Choose a country</option>
                {editCountryOptions.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
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
              <label className="mb-2 block text-sm font-medium text-ink" htmlFor="edit-entry-story">
                Story
              </label>
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
              <Button type="button" variant="ghost" onClick={closeEditEntry} disabled={editSaving}>
                Cancel
              </Button>
              <Button type="submit" isLoading={editSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        </section>
      </div>
    );
  };

  const renderSavedEntryNotice = () => {
    if (!savedEntryNotice) {
      return null;
    }

    const parsedTrip = savedEntryNotice.parsedTrip;

    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-xl rounded-lg border border-gold/25 bg-white p-4 shadow-xl sm:left-auto sm:mx-0"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-deep">
            <Check className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              {savedEntryNotice.message} “{savedEntryNotice.entry.title}”
            </p>
            {parsedTrip ? (
              <div className="mt-3 rounded-lg border border-gold/18 bg-cream/45 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Parsed trip</p>
                    <h3 className="mt-1 truncate text-base font-semibold text-ink">{parsedTrip.title}</h3>
                  </div>
                  <div className="flex shrink-0 gap-2 text-center">
                    <div className="rounded-md border border-gold/15 bg-white px-2 py-1">
                      <p className="text-sm font-semibold text-ink">{parsedTrip.pageCount}</p>
                      <p className="text-[10px] uppercase tracking-wide text-ink/45">Pages</p>
                    </div>
                    <div className="rounded-md border border-gold/15 bg-white px-2 py-1">
                      <p className="text-sm font-semibold text-ink">{parsedTrip.stampCount}</p>
                      <p className="text-[10px] uppercase tracking-wide text-ink/45">Stamps</p>
                    </div>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink/70">{parsedTrip.summary}</p>
                <div className="mt-3 grid gap-2 text-xs text-ink/60 sm:grid-cols-2">
                  <span className="rounded-md bg-white/75 px-2 py-1.5">{parsedTrip.countryName}</span>
                  <span className="rounded-md bg-white/75 px-2 py-1.5">{parsedTrip.dateLabel}</span>
                </div>
                {parsedTrip.canvaTitle ? (
                  <div className="mt-2 rounded-md bg-white/75 px-2 py-1.5 text-xs text-ink/60">
                    Linked to {parsedTrip.canvaTitle}
                    {parsedTrip.canvaPageCount ? ` (${parsedTrip.canvaPageCount} Canva page${parsedTrip.canvaPageCount === 1 ? '' : 's'})` : ''}
                  </div>
                ) : null}
                {parsedTrip.dayTitles.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {parsedTrip.dayTitles.map((dayTitle) => (
                      <span key={dayTitle} className="rounded-full border border-gold/20 bg-white px-2 py-1 text-xs text-ink/62">
                        {dayTitle}
                      </span>
                    ))}
                  </div>
                ) : null}
                {parsedTrip.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {parsedTrip.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-gold/12 px-2 py-1 text-xs font-semibold text-gold-deep">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-gold-deep underline-offset-4 transition hover:text-ink hover:underline"
              onClick={() => {
                void openSavedEntry(savedEntryNotice.entry);
                setSavedEntryNotice(null);
              }}
            >
              {parsedTrip ? 'Open entry' : 'See saved entry'}
            </button>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-ink/45 transition hover:bg-cream hover:text-ink"
            aria-label="Dismiss saved entry message"
            onClick={() => setSavedEntryNotice(null)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Travel Journal"
        description="Design Canva journal pages, save travel stories, and revisit shared memories."
      >
        <DndContext onDragEnd={handleDndDragEnd}>
          <div className={localScrapbookBackupOpen ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]' : 'grid gap-6'}>
            {!localScrapbookBackupOpen ? (
              renderCanvaWorkspace()
            ) : (
              <section className="rounded-lg border border-gold/25 bg-[#fff8ea] p-4 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-ink">{currentPage?.title || 'Page 1'}</h2>
                <p className="text-sm text-ink/65">
                  {selectedVisitedCountry?.name || currentCountry?.name || 'Choose a map country'} / {currentTheme.label}
                </p>
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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setActiveTool('photos');
                    fileInputRef.current?.click();
                  }}
                >
                  Add Photos
                </Button>
                <Button type="button" variant="outline" onClick={addNote}>
                  Add Note
                </Button>
                <Button
                  type="button"
                  variant={drawingMode ? 'secondary' : 'outline'}
                  onClick={() => {
                    setDrawingMode((current) => {
                      const nextDrawingMode = !current;
                      setActiveTool(nextDrawingMode ? 'draw' : 'select');
                      return nextDrawingMode;
                    });
                  }}
                >
                  {activeTool === 'draw' ? 'Drawing' : 'Draw'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocalScrapbookBackupOpen(false)}
                >
                  Use Canva
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!hasPageContent}
                  onClick={clearCurrentPage}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {scrapbookPages.map((page, index) => (
                <Button
                  key={page.id}
                  type="button"
                  size="sm"
                  variant={page.id === activePageId ? 'secondary' : 'ghost'}
                  onClick={() => {
                    setActivePageId(page.id);
                    setSelectedItemId(null);
                  }}
                >
                  {page.title || `Page ${index + 1}`}
                </Button>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={addPage}>
                Add Page
              </Button>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-2">
              <div className="flex flex-wrap gap-2">
                {decorationOptions.map((option) => (
                  <Button key={option.kind} type="button" size="sm" variant="ghost" onClick={() => addDecoration(option.kind)}>
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {drawingColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Ink ${color}`}
                    className={[
                      'h-7 w-7 rounded-full border-2 transition-transform',
                      drawingColor === color ? 'scale-110 border-ink' : 'border-white',
                    ].join(' ')}
                    style={{ backgroundColor: color }}
                    onClick={() => setDrawingColor(color)}
                  />
                ))}
                <Button type="button" size="sm" variant="ghost" disabled={!currentPage?.drawings.length} onClick={undoLastDrawing}>
                  Undo Ink
                </Button>
              </div>
            </div>

            {storageWarning ? (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {storageWarning}
              </p>
            ) : null}

            {importNotice ? (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/25 bg-white px-3 py-2 text-sm text-ink/75 shadow-soft">
                <span>{importNotice}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setImportNotice(null)}>
                  Dismiss
                </Button>
              </div>
            ) : null}

            <ScrapbookCanvas
              boardWidth={visibleBoardWidth}
              currentTheme={currentTheme}
              drawingMode={drawingMode}
              drawings={currentPage?.drawings || []}
              hasPageContent={hasPageContent}
              items={scrapbookItems}
              selectedItemId={selectedItemId}
              draggingItemId={dragState?.id || null}
              setBoardNode={(node) => {
                boardRef.current = node;
              }}
              onBoardPointerDown={handleBoardPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPhotoDrop={handlePhotoDrop}
              onItemPointerDown={handlePointerDown}
              onItemKeyDown={handleItemKeyDown}
              onCaptionChange={(itemId, caption) => updateScrapbookItem(itemId, { caption })}
              onNoteChange={updateNoteText}
              onResizeStart={startItemResize}
              onRotateStart={startItemRotate}
              onMoveableResize={resizeItemFromMoveable}
              onMoveableRotate={rotateItemFromMoveable}
            />
          </section>
          )}

          {localScrapbookBackupOpen ? (
          <aside className="space-y-4">
            <section className="rounded-lg border border-gold/25 bg-white p-5 shadow-soft">
              <h3 className="mb-4 text-xl font-semibold text-ink">Themes</h3>
              <div className="grid grid-cols-2 gap-2">
                {scrapbookThemes.map((theme) => (
                  <Button
                    key={theme.id}
                    type="button"
                    size="sm"
                    variant={currentPage?.theme === theme.id ? 'secondary' : 'ghost'}
                    onClick={() => updatePageTheme(theme.id)}
                  >
                    {theme.label}
                  </Button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gold/25 bg-white p-5 shadow-soft">
              <h3 className="mb-4 text-xl font-semibold text-ink">Templates</h3>
              <div className="grid grid-cols-2 gap-2">
                {templateLabels.map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    size="sm"
                    variant={currentPage?.template === template.id ? 'secondary' : 'ghost'}
                    onClick={() => setPageTemplate(template.id)}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </section>

            <PhotoTray
              assets={currentPage?.photoTray || []}
              onUpload={() => {
                setActiveTool('photos');
                fileInputRef.current?.click();
              }}
              onPlacePhoto={placePhotoFromTray}
            />

            <section className="rounded-lg border border-gold/25 bg-white p-5 shadow-soft">
              <h3 className="mb-4 text-xl font-semibold text-ink">Entry Details</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Journal name"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
                {renderCountrySearch('scrapbook-entry-country')}
                <Input
                  label="Mood"
                  value={form.mood}
                  onChange={(event) => setForm({ ...form, mood: event.target.value })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Trip start"
                    type="date"
                    value={form.tripStartDate}
                    max={form.tripEndDate}
                    error={dateRangeErrors.startDate}
                    onChange={(event) => setForm({ ...form, tripStartDate: event.target.value })}
                    required
                  />
                  <Input
                    label="Trip end"
                    type="date"
                    value={form.tripEndDate}
                    min={form.tripStartDate}
                    error={dateRangeErrors.endDate}
                    onChange={(event) => setForm({ ...form, tripEndDate: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-ink">Story</label>
                    <Button
                      type="button"
                      size="sm"
                      variant={isStoryDictating ? 'secondary' : 'ghost'}
                      onClick={() => toggleDictation({ type: 'story' })}
                    >
                      {isStoryDictating ? 'Stop' : 'Dictate'}
                    </Button>
                  </div>
                  <textarea
                    value={form.content}
                    onChange={(event) => setForm({ ...form, content: event.target.value })}
                    rows={5}
                    className="w-full rounded-lg border-2 border-gold/30 bg-cream/50 px-4 py-3 text-ink placeholder-ink/50 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    required
                  />
                  {isStoryDictating ? <p className="mt-1 text-sm text-gold-deep">Listening...</p> : null}
                </div>
                <Input
                  label="Tags"
                  value={form.tags}
                  onChange={(event) => setForm({ ...form, tags: event.target.value })}
                  placeholder="market, sunset, train"
                />
                {renderInstagramAttachment()}
                {dictationError ? <p className="text-sm text-red-600">{dictationError}</p> : null}
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                {!hasVisitedCountryLink ? (
                  <p className="text-sm text-gold-deep">
                    Pick a country you have marked on the map before saving.
                  </p>
                ) : null}
                <Button type="submit" isLoading={saving} disabled={!canSaveCurrentEntry} className="w-full">
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
                  {selectedItem.type === 'note' ? (
                    <Button
                      type="button"
                      variant={isSelectedNoteDictating ? 'secondary' : 'ghost'}
                      onClick={() => toggleDictation({ type: 'note', itemId: selectedItem.id })}
                    >
                      {isSelectedNoteDictating ? 'Stop' : 'Dictate Note'}
                    </Button>
                  ) : null}
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
          </aside>
          ) : null}
        </div>
        </DndContext>
	        {openedEntry ? (
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
	                <div className="min-w-0">
	                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
	                    Journal entry
	                  </p>
	                  {renamingEntryId === openedEntry.id ? (
	                    <div className="mt-2 max-w-xl">
	                      <h2 id="opened-entry-title" className="sr-only">
	                        {openedEntry.title}
	                      </h2>
	                      <Input
	                        label="Journal name"
	                        value={renameTitleDraft}
	                        onChange={(event) => setRenameTitleDraft(event.target.value)}
	                        onKeyDown={(event) => {
	                          if (event.key === 'Enter') {
	                            event.preventDefault();
	                            void saveOpenedEntryTitle();
	                          }
	                        }}
	                      />
	                      <div className="mt-3 flex flex-wrap gap-2">
	                        <Button
	                          type="button"
	                          size="sm"
	                          className="gap-2"
	                          isLoading={renameSaving}
	                          onClick={() => void saveOpenedEntryTitle()}
	                        >
	                          <Check className="h-4 w-4" aria-hidden="true" />
	                          Save
	                        </Button>
	                        <Button
	                          type="button"
	                          size="sm"
	                          variant="ghost"
	                          onClick={() => {
	                            setRenameTitleDraft(openedEntry.title);
	                            setRenamingEntryId(null);
	                            setRenameError(null);
	                          }}
	                        >
	                          Cancel
	                        </Button>
	                      </div>
	                      {renameError ? <p className="mt-2 text-sm text-red-600">{renameError}</p> : null}
	                    </div>
	                  ) : (
	                    <div className="mt-2 flex flex-wrap items-center gap-3">
	                      <h2 id="opened-entry-title" className="text-3xl font-serif font-semibold leading-tight text-ink">
	                        {openedEntry.title}
	                      </h2>
	                      <Button
	                        type="button"
	                        size="sm"
	                        variant="ghost"
	                        className="gap-2"
	                        onClick={() => {
	                          setRenameTitleDraft(openedEntry.title);
	                          setRenamingEntryId(openedEntry.id);
	                          setRenameError(null);
	                        }}
	                      >
	                        <PencilLine className="h-4 w-4" aria-hidden="true" />
	                        Rename
	                      </Button>
	                    </div>
	                  )}
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
	                  <span className="rounded-full border border-gold/18 bg-cream/55 px-3 py-1 capitalize">
	                    {openedEntry.mood}
	                  </span>
	                ) : null}
	              </div>

	              {openedEntry.tags?.length ? (
	                <div className="mt-4 flex flex-wrap gap-2">
	                  {openedEntry.tags.map((tag) => (
	                    <span key={tag} className="rounded-full border border-gold/20 bg-cream px-2.5 py-1 text-xs font-semibold text-ink/62">
	                      {tag}
	                    </span>
	                  ))}
	                </div>
	              ) : null}

	              {renderEntryAlbumCover(openedEntry, 'mt-6 aspect-[16/9]')}

	              {renderSavedCanvaBook(openedEntry)}

	              {renderInsertedPhotoGrid(getEntryInsertedPhotos(openedEntry))}

	              <InstagramEmbed embeds={getEntryInstagramEmbeds(openedEntry)} />

	              {getEntryContent(openedEntry).trim() ? (
	                <section className="mt-6 rounded-lg border border-gold/18 bg-cream/45 p-4">
	                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
	                    <Type className="h-4 w-4 text-gold-deep" aria-hidden="true" />
	                    <span>Story below this page</span>
	                  </div>
	                  <div className="whitespace-pre-wrap text-base leading-8 text-ink/78">
	                    {getEntryContent(openedEntry)}
	                  </div>
	                </section>
	              ) : null}

	              <div className="mt-6 flex flex-wrap gap-2 border-t border-gold/16 pt-4">
	                <Button type="button" size="sm" variant="secondary" onClick={() => void openEditEntry(openedEntry)}>
	                  <PencilLine className="mr-2 h-4 w-4" aria-hidden="true" />
	                  Edit
	                </Button>
	                <Button type="button" size="sm" variant="secondary" onClick={() => openSharePanel(openedEntry)}>
	                  <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
	                  Share
	                </Button>
	                <Button type="button" size="sm" variant="ghost" onClick={() => openCommentPanel(openedEntry.id)}>
	                  <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
	                  Comments
	                </Button>
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
	              {renderCommentPanel(openedEntry.id)}
	              {sharingEntryId === openedEntry.id ? (
	                <div className="mt-4 rounded-lg border border-gold/18 bg-cream/40 p-4">
	                  <div className="mb-3 flex items-start justify-between gap-3">
	                    <div>
	                      <p className="text-sm font-semibold text-ink">Share with friends</p>
	                      <p className="text-xs text-ink/55">Friends get view-only access to this entry.</p>
	                    </div>
	                    <button
	                      type="button"
	                      onClick={() => setSharingEntryId(null)}
	                      className="rounded-md p-1 text-ink/45 transition hover:bg-white hover:text-ink"
	                      aria-label="Close sharing panel"
	                    >
	                      <X className="h-4 w-4" aria-hidden="true" />
	                    </button>
	                  </div>
	                  {shareLoading ? (
	                    <p className="text-sm text-ink/60">Loading sharing settings...</p>
	                  ) : acceptedFriends.length === 0 ? (
	                    <div className="rounded-md border border-dashed border-gold/25 bg-white/70 p-3">
	                      <p className="text-sm font-semibold text-ink">No friends in your Travel Circle yet.</p>
	                      <p className="mt-1 text-sm text-ink/60">
	                        Add friends first, then come back here to share this journal entry.
	                      </p>
	                      <Button
	                        type="button"
	                        variant="secondary"
	                        size="sm"
	                        className="mt-3"
	                        onClick={() => router.push('/friends')}
	                      >
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
	                            className="flex cursor-pointer items-center gap-3 rounded-md border border-gold/14 bg-white/70 px-3 py-2 text-sm text-ink transition hover:border-gold/35"
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
	                    onClick={() => saveEntryShares(openedEntry.id)}
	                  >
	                    Save sharing
	                  </Button>
	                </div>
	              ) : null}
	            </article>
	          </div>
	        ) : null}

	        {entryPendingDelete ? (
	          <div
	            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
	            role="presentation"
	            onClick={cancelDeleteEntry}
	          >
	            <section
	              className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-xl"
	              role="dialog"
	              aria-modal="true"
	              aria-labelledby="delete-entry-title"
	              onClick={(event) => event.stopPropagation()}
	            >
	              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Delete journal</p>
	              <h2 id="delete-entry-title" className="mt-2 text-2xl font-serif font-semibold text-ink">
	                Delete “{entryPendingDelete.title}”?
	              </h2>
                <p className="mt-3 text-sm leading-6 text-ink/70">
                  This will permanently remove the journal entry, its comments, and its sharing settings. This cannot be undone.
                </p>
                {(shareRecipientsByEntry[entryPendingDelete.id]?.length ?? 0) > 0 ? (
                  <p className="mt-3 text-sm leading-6 text-ink/70">
                    This entry is shared with {shareRecipientsByEntry[entryPendingDelete.id].map((r) => r.displayName || r.email || 'a friend').join(', ')}. Deleting it will also remove it from their journal pages.
                  </p>
                ) : null}
	              {deleteError ? <p className="mt-3 text-sm text-red-600">{deleteError}</p> : null}
	              <div className="mt-5 flex flex-wrap justify-end gap-2">
	                <Button type="button" variant="ghost" onClick={cancelDeleteEntry} disabled={deleteSaving}>
	                  Cancel
	                </Button>
	                <Button
	                  type="button"
	                  className="bg-red-700 text-white hover:bg-red-800"
	                  isLoading={deleteSaving}
	                  onClick={() => void confirmDeleteEntry()}
	                >
	                  Delete Entry
	                </Button>
	              </div>
	            </section>
	          </div>
	        ) : null}

        {renderCanvaModal()}
        {renderEditEntryModal()}
        {renderSavedEntryNotice()}
      </PageShell>
    </div>
  );
}
