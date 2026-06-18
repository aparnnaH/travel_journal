'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { ExternalLink, Maximize2, MessageCircle, Palette, Search, Send, Share2, UsersRound, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import PageShell from '@/components/layout/PageShell';
import { Button, Input } from '@/components/ui';
import ImportTripModal from '@/components/import/ImportTripModal';
import ScrapbookCanvas from '@/components/journal/canvas/ScrapbookCanvas';
import PhotoTray from '@/components/journal/scrapbook/PhotoTray';
import { useJournalLayoutStore } from '@/hooks/journal-layout/JournalLayoutStore';
import { appendImportedTripToStorage, getScrapbookStorageKey } from '@/lib/ai/storage';
import { useAuthStore } from '@/store/authStore';
import { fetchFriends } from '@/lib/friendService';
import {
  createJournalComment,
  createJournalEntry,
  fetchJournalComments,
  fetchJournalEntries,
  fetchJournalEntryShares,
  fetchSharedJournalEntries,
  saveJournalEntryShares,
} from '@/lib/journalService';
import { createCanvaDesign, createCanvaExport, fetchCanvaDesigns, fetchCanvaExport } from '@/lib/canvaService';
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

const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

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

const readPhotoFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const getEntryDate = (entry: SavedEntry) => entry.createdAt || entry.created_at || new Date().toISOString();
const getEntryCountry = (entry: SavedEntry) => entry.countryId || entry.country_id || '';
const formatEntryCountry = (countryId: string) =>
  placeholderCountries.find((country) => country.id === countryId)?.name || countryId || 'Unplaced';

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

export default function JournalPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const activeTool = useJournalLayoutStore((state) => state.activeTool);
  const setActiveTool = useJournalLayoutStore((state) => state.setActiveTool);
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrapbookLoadedRef = useRef(false);
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [openedEntry, setOpenedEntry] = useState<SavedEntry | null>(null);
  const [sharedEntries, setSharedEntries] = useState<SharedJournalEntry[]>([]);
  const [acceptedFriends, setAcceptedFriends] = useState<Friendship[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
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
  const [canvaWorkspaceDesign, setCanvaWorkspaceDesign] = useState<CanvaDesign | null>(null);
  const [canvaFullscreenOpen, setCanvaFullscreenOpen] = useState(false);
  const [localScrapbookBackupOpen, setLocalScrapbookBackupOpen] = useState(false);
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
      const [entriesResponse, sharedResponse, friendsResponse] = await Promise.all([
        fetchJournalEntries(user.id),
        fetchSharedJournalEntries(),
        fetchFriends(),
      ]);
      setEntriesLoading(false);

      if (entriesResponse.success && entriesResponse.data) {
        setEntries(entriesResponse.data as SavedEntry[]);
      }

      if (sharedResponse.success && sharedResponse.data) {
        setSharedEntries(sharedResponse.data);
      }

      if (friendsResponse.success && friendsResponse.data) {
        setAcceptedFriends(friendsResponse.data.friends);
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
      window.localStorage.setItem(scrapbookStorageKey, JSON.stringify({ pages: scrapbookPages, activePageId }));
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
    return null;
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

  const handleTripImported = (result: TripImportResult) => {
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
    setForm({
      title: result.journalDraft.title,
      content: result.journalDraft.content,
      countryId: result.journalDraft.countryId,
      mood: result.journalDraft.mood,
      tags: result.journalDraft.tags.join(', '),
    });
    setImportNotice(
      `Imported ${result.scrapbookPages.length} draft page${
        result.scrapbookPages.length === 1 ? '' : 's'
      }${
        result.passportStampIds.length
          ? ` with ${result.passportStampIds.length} passport stamp link${
              result.passportStampIds.length === 1 ? '' : 's'
            }`
          : ''
      }.`
    );
    setError(null);
    setStorageWarning(null);
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

  const openCanvaInWorkspace = (design: CanvaDesign) => {
    setCanvaWorkspaceDesign(design);
    setCanvaModalOpen(false);
    setLocalScrapbookBackupOpen(false);
    setCanvaError(null);
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

    openCanvaInWorkspace(response.data);
  };

  const importCanvaDesign = async (design: CanvaDesign) => {
    setCanvaImportingDesignId(design.id);
    setCanvaError(null);

    const exportResponse = await createCanvaExport(design.id, 'png');

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
      setCanvaError('Canva export finished, but no downloadable pages were returned.');
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
    setCanvaImportingDesignId(null);
    setCanvaModalOpen(false);
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

  const refreshSharedEntries = async () => {
    const response = await fetchSharedJournalEntries();

    if (response.success && response.data) {
      setSharedEntries(response.data);
    }
  };

  const openSharePanel = async (entry: SavedEntry) => {
    setOpenedEntry(null);
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
    await refreshSharedEntries();
  };

  const openCommentPanel = async (entryId: string) => {
    setOpenedEntry(null);
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

  const renderCanvaFrame = (design: CanvaDesign, fullscreen = false) => (
    <div className={fullscreen ? 'flex h-full flex-col bg-cream' : 'flex min-h-[620px] flex-col bg-cream'}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/20 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{design.title || 'Untitled Canva design'}</p>
          <p className="text-xs text-ink/50">Canva editor</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!fullscreen ? (
            <Button type="button" size="sm" variant="secondary" className="gap-2" onClick={() => setCanvaFullscreenOpen(true)}>
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
              Fullscreen
            </Button>
          ) : null}
          <a
            href={getCanvaEditUrl(design)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-ink px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-ink/5"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            New Tab
          </a>
          <Button type="button" size="sm" onClick={() => void importCanvaDesign(design)} isLoading={canvaImportingDesignId === design.id}>
            Import
          </Button>
        </div>
      </div>
      <iframe
        title={design.title || 'Canva editor'}
        src={getCanvaEditUrl(design)}
        className={fullscreen ? 'min-h-0 flex-1 border-0' : 'h-[620px] w-full border-0'}
        allow="clipboard-read; clipboard-write; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );

  const renderCanvaWorkspace = () => (
    <section className="overflow-hidden rounded-lg border border-gold/25 bg-[#fff8ea] shadow-soft">
      <div className="border-b border-gold/20 bg-white/72 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Canva workspace</p>
            <h2 className="mt-1 text-3xl font-serif text-ink">Design the page in Canva</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setLocalScrapbookBackupOpen(true)}>
            Local backup
          </Button>
        </div>
      </div>

      {canvaWorkspaceDesign ? (
        <div className="p-5">
          <div className="overflow-hidden rounded-lg border border-gold/20 bg-white shadow-soft">
            {renderCanvaFrame(canvaWorkspaceDesign)}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-gold/20 bg-cream">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(61,43,14,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(61,43,14,0.07)_1px,transparent_1px)] bg-[size:36px_36px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.62),transparent_20%),radial-gradient(circle_at_78%_72%,rgba(47,111,109,0.14),transparent_26%)]" />
          <div className="relative flex min-h-[520px] items-center justify-center px-5 text-center">
            <div className="max-w-xl rounded-lg border border-gold/25 bg-white/85 p-6 shadow-soft">
              <Palette className="mx-auto h-10 w-10 text-gold-deep" aria-hidden="true" />
              <h3 className="mt-4 text-2xl font-serif text-ink">Canva is now the design surface</h3>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button type="button" className="gap-2" isLoading={canvaCreatingDesign} onClick={() => void createCanvaJournalPage()}>
                  <Palette className="h-4 w-4" aria-hidden="true" />
                  New Canva Page
                </Button>
                <Button type="button" variant="secondary" className="gap-2" onClick={openCanvaModal}>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Choose Existing
                </Button>
              </div>
              {canvaError ? <p className="mt-4 text-sm text-red-600">{canvaError}</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-gold/25 bg-white p-4">
            <p className="text-sm font-semibold text-ink">Canva actions</p>
            <div className="mt-3 space-y-2">
              <Button type="button" variant="secondary" size="sm" className="w-full" onClick={openCanvaModal}>
                Import finished page
              </Button>
              <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setLocalScrapbookBackupOpen(true)}>
                Local scrapbook backup
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-gold/25 bg-white p-4">
            <p className="text-sm font-semibold text-ink">Current draft</p>
            <p className="mt-2 text-sm text-ink/65">{form.title || 'Untitled journal entry'}</p>
            <p className="mt-1 text-xs text-ink/50">{scrapbookPages.length} imported page{scrapbookPages.length === 1 ? '' : 's'} available</p>
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
                          onClick={() => openCanvaInWorkspace(design)}
                        >
                          <Palette className="h-4 w-4" aria-hidden="true" />
                          Workspace
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
                        <a
                          href={getCanvaEditUrl(design)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-ink px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-ink/5"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </a>
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

  const renderCanvaFullscreen = () => {
    if (!canvaFullscreenOpen || !canvaWorkspaceDesign) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-[70] flex flex-col bg-cream">
        <div className="flex items-center justify-between gap-3 border-b border-gold/20 bg-white px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Canva workspace</p>
            <h2 className="text-lg font-semibold text-ink">{canvaWorkspaceDesign.title || 'Untitled Canva design'}</h2>
          </div>
          <Button type="button" variant="ghost" onClick={() => setCanvaFullscreenOpen(false)}>
            Close
          </Button>
        </div>
        <div className="min-h-0 flex-1">{renderCanvaFrame(canvaWorkspaceDesign, true)}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <PageShell
        title="Travel Journal"
        description="Build each trip as a scrapbook page with photos, notes, and saved memories."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="gap-2" onClick={openCanvaModal}>
              <Palette className="h-4 w-4" aria-hidden="true" />
              Import Canva
            </Button>
            <Button type="button" onClick={() => setImportModalOpen(true)}>
              Import Trip
            </Button>
          </div>
        }
      >
        <DndContext onDragEnd={handleDndDragEnd}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {!localScrapbookBackupOpen ? (
            renderCanvaWorkspace()
          ) : (
          <section className="rounded-lg border border-gold/25 bg-[#fff8ea] p-4 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-ink">{currentPage?.title || 'Page 1'}</h2>
                <p className="text-sm text-ink/65">
                  {currentCountry?.name || form.countryId} / {currentTheme.label}
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

          <aside className="space-y-4">
            {localScrapbookBackupOpen ? (
              <>
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
                {dictationError ? <p className="text-sm text-red-600">{dictationError}</p> : null}
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
              </>
            ) : (
              <section className="rounded-lg border border-gold/25 bg-white p-5 shadow-soft">
                <h3 className="text-xl font-semibold text-ink">Canva Page Tools</h3>
                <div className="mt-4 space-y-3">
                  <Button type="button" className="w-full gap-2" isLoading={canvaCreatingDesign} onClick={() => void createCanvaJournalPage()}>
                    <Palette className="h-4 w-4" aria-hidden="true" />
                    New Canva Page
                  </Button>
                  <Button type="button" variant="secondary" className="w-full gap-2" onClick={openCanvaModal}>
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Choose Existing Design
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={connectCanva}>
                    Connect Canva
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setLocalScrapbookBackupOpen(true)}>
                    Open local scrapbook backup
                  </Button>
                </div>
              </section>
            )}

            <section className="rounded-lg border border-gold/25 bg-white p-5 shadow-soft">
              <h3 className="mb-4 text-xl font-semibold text-ink">Recent Entries</h3>
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {entriesLoading ? (
                  <p className="text-ink/60">Loading entries...</p>
                ) : entries.length === 0 ? (
                  <p className="text-ink/60">No journal entries yet.</p>
                ) : (
	                  entries.map((entry) => (
	                    <article
	                      key={entry.id}
	                      className="cursor-pointer rounded-lg border border-gold/20 bg-cream/55 p-4 transition hover:border-gold/45 hover:bg-cream/75"
	                      onClick={() => setOpenedEntry(entry)}
	                      onKeyDown={(event) => {
	                        if (event.key === 'Enter' || event.key === ' ') {
	                          event.preventDefault();
	                          setOpenedEntry(entry);
	                        }
	                      }}
	                      role="button"
	                      tabIndex={0}
	                      aria-label={`Open journal entry ${entry.title}`}
	                    >
	                      <div className="flex items-start justify-between gap-3">
	                        <h4 className="font-semibold text-ink">{entry.title}</h4>
	                        <time className="shrink-0 text-xs text-ink/60" dateTime={getEntryDate(entry)}>
                          {new Date(getEntryDate(entry)).toLocaleDateString()}
                        </time>
	                      </div>
	                      <p className="mt-2 line-clamp-3 text-ink/70">{entry.content}</p>
	                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/70">
	                        {getEntryCountry(entry) ? <span>{formatEntryCountry(getEntryCountry(entry))}</span> : null}
	                        {entry.mood ? <span>{entry.mood}</span> : null}
	                        {entry.tags?.map((tag) => (
                          <span key={tag} className="rounded-full border border-gold/20 bg-white px-2 py-1">
                            {tag}
                          </span>
                        ))}
	                      </div>
	                      <div className="mt-3 flex flex-wrap items-center gap-2">
	                        <Button
	                          type="button"
	                          size="sm"
	                          variant="secondary"
	                          onClick={(event) => {
	                            event.stopPropagation();
	                            setOpenedEntry(entry);
	                          }}
	                        >
	                          Open
	                        </Button>
	                        <Button
	                          type="button"
	                          size="sm"
	                          variant="secondary"
	                          onClick={(event) => {
	                            event.stopPropagation();
	                            openSharePanel(entry);
	                          }}
	                        >
	                          <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
	                          Share
	                        </Button>
	                        <Button
	                          type="button"
	                          size="sm"
	                          variant="ghost"
	                          onClick={(event) => {
	                            event.stopPropagation();
	                            openCommentPanel(entry.id);
	                          }}
	                        >
	                          <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
	                          Comments
	                        </Button>
                        {(shareRecipientsByEntry[entry.id]?.length ?? 0) > 0 ? (
                          <span className="rounded-full border border-gold/20 bg-white px-2.5 py-1 text-xs font-semibold text-ink/55">
                            Shared with {shareRecipientsByEntry[entry.id].length}
                          </span>
                        ) : null}
                      </div>
                      {sharingEntryId === entry.id ? (
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
                      ) : null}
                      {renderCommentPanel(entry.id)}
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-lg border border-gold/25 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-ink">Shared With Me</h3>
                <UsersRound className="h-5 w-5 text-gold-deep" aria-hidden="true" />
              </div>
              <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                {entriesLoading ? (
                  <p className="text-ink/60">Loading shared entries...</p>
                ) : sharedEntries.length === 0 ? (
                  <p className="text-ink/60">No shared journal entries yet.</p>
                ) : (
                  sharedEntries.map((entry) => (
                    <article key={`${entry.id}-${entry.sharedBy.id}`} className="rounded-lg border border-gold/20 bg-cream/55 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-semibold text-ink">{entry.title}</h4>
                        <time className="shrink-0 text-xs text-ink/60" dateTime={entry.sharedAt}>
                          {new Date(entry.sharedAt).toLocaleDateString()}
                        </time>
                      </div>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold-deep">
                        From {entry.sharedBy.displayName || entry.sharedBy.email}
                      </p>
                      <p className="mt-2 line-clamp-3 text-ink/70">{entry.content}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/70">
                        {getEntryCountry(entry) ? <span>{getEntryCountry(entry)}</span> : null}
                        {entry.mood ? <span>{entry.mood}</span> : null}
                        {entry.tags?.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full border border-gold/20 bg-white px-2 py-1">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3">
                        <Button type="button" size="sm" variant="secondary" onClick={() => openCommentPanel(entry.id)}>
                          <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                          Comments
                        </Button>
                      </div>
                      {renderCommentPanel(entry.id)}
                    </article>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
        </DndContext>
	        {openedEntry ? (
	          <div
	            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
	            role="presentation"
	            onClick={() => setOpenedEntry(null)}
	          >
	            <article
	              className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gold/25 bg-white p-6 shadow-xl"
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
	                {getEntryCountry(openedEntry) ? (
	                  <span className="rounded-full border border-gold/18 bg-cream/55 px-3 py-1">
	                    {formatEntryCountry(getEntryCountry(openedEntry))}
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

	              <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-ink/78">
	                {openedEntry.content}
	              </div>

	              <div className="mt-6 flex flex-wrap gap-2 border-t border-gold/16 pt-4">
	                <Button type="button" size="sm" variant="secondary" onClick={() => openSharePanel(openedEntry)}>
	                  <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
	                  Share
	                </Button>
	                <Button type="button" size="sm" variant="ghost" onClick={() => openCommentPanel(openedEntry.id)}>
	                  <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
	                  Comments
	                </Button>
	              </div>
	            </article>
	          </div>
	        ) : null}

	        <ImportTripModal
	          open={importModalOpen}
          startPageNumber={scrapbookPages.length + 1}
          boardWidth={visibleBoardWidth}
          onClose={() => setImportModalOpen(false)}
          onImport={handleTripImported}
        />
        {renderCanvaModal()}
        {renderCanvaFullscreen()}
      </PageShell>
    </div>
  );
}
