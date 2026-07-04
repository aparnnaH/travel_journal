// Authenticated journal-entry route.
// This is the main server boundary for owned journal data: it validates the
// session, enforces user ownership, normalizes legacy Canva payloads, and keeps
// database writes constrained to the current user.
import { NextRequest, NextResponse } from 'next/server';
import { decodeJournalContentWithCanva, encodeJournalContentWithCanva } from '@/lib/journalCanvaPayload';
import { sanitizeInstagramEmbedUrls } from '@/lib/instagramEmbeds';
import { getJournalDateRangeError, getTodayJournalDate, normalizeJournalDate } from '@/lib/journalDates';
import { placeholderCountries } from '@/lib/placeholderData';
import { clampStringList, clampText, isApiError, readJsonBody } from '@/lib/server/apiSafety';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';
import { rejectSeededDemoCloudWrite } from '@/lib/server/demoCloudGuard';

const CANVA_SCHEMA_ERROR_MESSAGE =
  'Canva journal fields are not installed yet. Run supabase/canva_journal_entries.sql in Supabase, then try saving again.';
const JOURNAL_METADATA_SCHEMA_ERROR_MESSAGE =
  'Journal metadata fields are not installed yet. Run the Supabase journal metadata migrations, then try saving again.';
const MAX_INSERTED_JOURNAL_PHOTOS = 8;
const JOURNAL_SEARCH_SCOPES = new Set(['all', 'title', 'country', 'tag', 'text']);
const JOURNAL_SUMMARY_FIELDS =
  'id,user_id,country_id,title,mood,tags,created_at,updated_at,canva_design_id,canva_design_title,canva_design_edit_url,canva_page_count,trip_start_date,trip_end_date';
const JOURNAL_LEGACY_SUMMARY_FIELDS =
  'id,user_id,country_id,title,mood,tags,created_at,updated_at,canva_design_id,canva_design_title,canva_design_edit_url,canva_page_count';
const JOURNAL_SEARCH_FIELDS =
  'id,user_id,country_id,title,content,mood,tags,created_at,updated_at,canva_design_id,canva_design_title,canva_design_edit_url,canva_page_count,trip_start_date,trip_end_date';
const JOURNAL_LEGACY_SEARCH_FIELDS =
  'id,user_id,country_id,title,content,mood,tags,created_at,updated_at,canva_design_id,canva_design_title,canva_design_edit_url,canva_page_count';

// Supabase schema caches can lag after migrations. These helpers detect missing
// Canva/date columns so the route can give a useful migration message or use a
// backwards-compatible content payload.
const isMissingCanvaJournalColumnError = (message: string) =>
  /canva_(design|pages|page)/i.test(message) &&
  /(column|schema cache|could not find)/i.test(message);

const isMissingJournalMetadataColumnError = (message: string) =>
  isMissingCanvaJournalColumnError(message) ||
  /trip_(start|end)_date/i.test(message) &&
    /(column|schema cache|could not find)/i.test(message);

type JournalSearchScope = 'all' | 'title' | 'country' | 'tag' | 'text';

type JournalEntryRow = {
  country_id?: string | null;
  title?: string | null;
  content?: string | null;
  tags?: string[] | null;
};

type JournalMutationBody = {
  entryId?: string;
  countryId?: string;
  title?: string;
  content?: string;
  mood?: string;
  tags?: unknown;
  canvaDesignId?: string;
  canvaDesignTitle?: string;
  canvaDesignEditUrl?: string;
  canvaPages?: unknown;
  coverPhoto?: string | null;
  coverPageIndex?: number | null;
  insertedPhotos?: unknown;
  instagramEmbeds?: unknown;
  tripStartDate?: string;
  tripEndDate?: string;
};

// Search happens after decoding content because some entries store Canva
// metadata alongside the human-readable journal text.
const normalizeSearchValue = (value: string) => value.trim().toLocaleLowerCase();

// Converts a stored country id/code into all searchable country labels the user
// might type.
const getCountrySearchValues = (countryId?: string | null) => {
  const cleanCountryId = countryId?.trim();

  if (!cleanCountryId) {
    return [];
  }

  const country = placeholderCountries.find(
    (candidate) =>
      candidate.id.toLocaleLowerCase() === cleanCountryId.toLocaleLowerCase() ||
      candidate.code.toLocaleLowerCase() === cleanCountryId.toLocaleLowerCase()
  );

  return [cleanCountryId, country?.name, country?.code].filter((value): value is string => Boolean(value));
};

// Applies lightweight server-side search across title, country, tags, or decoded
// text. This avoids returning Canva metadata blobs as searchable prose.
const entryMatchesSearch = (entry: JournalEntryRow, rawSearch: string, scope: JournalSearchScope) => {
  const search = normalizeSearchValue(rawSearch);

  if (!search) {
    return true;
  }

  const decodedContent = decodeJournalContentWithCanva(String(entry.content || '')).content;
  const searchableValues = {
    title: [entry.title ?? ''],
    country: getCountrySearchValues(entry.country_id),
    tag: entry.tags ?? [],
    text: [decodedContent],
  };

  const matches = (values: string[]) =>
    values.some((value) => normalizeSearchValue(value).includes(search));

  if (scope === 'all') {
    return Object.values(searchableValues).some(matches);
  }

  return matches(searchableValues[scope]);
};

// Summary responses intentionally trim content and omit heavy Canva pages so
// list views do not download large image payloads.
const summarizeJournalEntry = <T extends Record<string, unknown>>(entry: T) => {
  const decodedContent = decodeJournalContentWithCanva(String(entry.content || '')).content.trim();

  return {
    ...entry,
    content: decodedContent ? decodedContent.slice(0, 360) : '',
    canva_pages: undefined,
    isSummary: true,
  };
};

// Lists/searches current-user entries or fetches a single owned entry by id.
export async function GET(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'journal');

  if (isRouteError(context)) {
    return context;
  }

  const entryId = request.nextUrl.searchParams.get('entryId');
  const summary = request.nextUrl.searchParams.get('summary') === 'true';

  if (entryId) {
    const { data, error } = await context.supabaseAdmin
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', context.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Journal entry not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data, count: 1, hasMore: false });
  }

  const limitParam = request.nextUrl.searchParams.get('limit');
  const offsetParam = request.nextUrl.searchParams.get('offset');
  const limit = limitParam ? Math.min(Math.max(Number.parseInt(limitParam, 10) || 0, 1), 50) : null;
  const offset = offsetParam ? Math.max(Number.parseInt(offsetParam, 10) || 0, 0) : 0;
  const search = request.nextUrl.searchParams.get('search')?.trim().slice(0, 120) ?? '';
  const searchScopeParam = request.nextUrl.searchParams.get('searchScope') ?? 'all';
  const searchScope = (JOURNAL_SEARCH_SCOPES.has(searchScopeParam) ? searchScopeParam : 'all') as JournalSearchScope;
  const selectFields = summary ? JOURNAL_SUMMARY_FIELDS : '*';

  // Search is currently in-memory after loading the user's entries so decoded
  // fallback content can be searched consistently with structured columns.
  if (search) {
    const searchResult = await context.supabaseAdmin
      .from('journal_entries')
      .select(JOURNAL_SEARCH_FIELDS)
      .eq('user_id', context.user.id)
      .order('created_at', { ascending: false });
    let data = searchResult.data as JournalEntryRow[] | null;
    let error = searchResult.error;

    if (error) {
      if (!isMissingJournalMetadataColumnError(error.message)) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      const legacyResult = await context.supabaseAdmin
        .from('journal_entries')
        .select(JOURNAL_LEGACY_SEARCH_FIELDS)
        .eq('user_id', context.user.id)
        .order('created_at', { ascending: false });

      data = legacyResult.data as JournalEntryRow[] | null;
      error = legacyResult.error;

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    const filteredData = (data ?? []).filter((entry) => entryMatchesSearch(entry, search, searchScope));
    const pagedData = limit ? filteredData.slice(offset, offset + limit) : filteredData;

    return NextResponse.json({
      success: true,
      data: summary ? pagedData.map((entry) => summarizeJournalEntry(entry)) : pagedData,
      count: filteredData.length,
      hasMore: limit ? offset + pagedData.length < filteredData.length : false,
    });
  }

  // Non-search listing can use Supabase pagination/count directly.
  let query = context.supabaseAdmin
    .from('journal_entries')
    .select(selectFields, { count: 'exact' })
    .eq('user_id', context.user.id)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    if (summary && isMissingJournalMetadataColumnError(error.message)) {
      let legacyQuery = context.supabaseAdmin
        .from('journal_entries')
        .select(JOURNAL_LEGACY_SUMMARY_FIELDS, { count: 'exact' })
        .eq('user_id', context.user.id)
        .order('created_at', { ascending: false });

      if (limit) {
        legacyQuery = legacyQuery.range(offset, offset + limit - 1);
      }

      const { data: legacyData, error: legacyError, count: legacyCount } = await legacyQuery;

      if (legacyError) {
        return NextResponse.json({ success: false, error: legacyError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: summary
          ? (legacyData ?? []).map((entry) => summarizeJournalEntry(entry as unknown as Record<string, unknown>))
          : legacyData,
        count: legacyCount ?? legacyData?.length ?? 0,
        hasMore: limit ? offset + (legacyData?.length ?? 0) < (legacyCount ?? 0) : false,
      });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: summary
      ? (data ?? []).map((entry) => summarizeJournalEntry(entry as unknown as Record<string, unknown>))
      : data,
    count: count ?? data?.length ?? 0,
    hasMore: limit ? offset + (data?.length ?? 0) < (count ?? 0) : false,
  });
}

// Creates a journal entry for the signed-in user.
export async function POST(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'journal');

  if (isRouteError(context)) {
    return context;
  }

  const demoWriteError = rejectSeededDemoCloudWrite(context.user);
  if (demoWriteError) {
    return demoWriteError;
  }

  const body = await readJsonBody<JournalMutationBody>(request, {
    maxBytes: 18 * 1024 * 1024,
    errorMessage: 'Journal entry is too large to save.',
  });

  if (isApiError(body)) {
    return body;
  }

  const {
    countryId: rawCountryId,
    title: rawTitle,
    content: rawContent,
    mood: rawMood,
    tags: rawTags,
    canvaDesignId: rawCanvaDesignId,
    canvaDesignTitle: rawCanvaDesignTitle,
    canvaDesignEditUrl: rawCanvaDesignEditUrl,
    canvaPages,
    coverPhoto,
    coverPageIndex,
    insertedPhotos,
    instagramEmbeds,
    tripStartDate,
    tripEndDate,
  } = body;
  const countryId = clampText(rawCountryId, 120);
  const title = clampText(rawTitle, 180);
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  const mood = clampText(rawMood, 80);
  const tags = clampStringList(rawTags, 12, 40);
  const canvaDesignId = clampText(rawCanvaDesignId, 200);
  const canvaDesignTitle = clampText(rawCanvaDesignTitle, 255);
  const canvaDesignEditUrl = clampText(rawCanvaDesignEditUrl, 600);

  if (!countryId || !title || !content) {
    return NextResponse.json({ success: false, error: 'Missing required journal fields.' }, { status: 400 });
  }

  if (content.length > 60_000) {
    return NextResponse.json({ success: false, error: 'Journal story is too long to save.' }, { status: 413 });
  }

  const fallbackDate = getTodayJournalDate();
  const cleanTripStartDate = normalizeJournalDate(tripStartDate, fallbackDate);
  const cleanTripEndDate = normalizeJournalDate(tripEndDate, cleanTripStartDate);
  const tripDateError = getJournalDateRangeError(cleanTripStartDate, cleanTripEndDate);

  if (tripDateError) {
    return NextResponse.json({ success: false, error: tripDateError }, { status: 400 });
  }

  // Only data URLs are accepted for embedded journal images. This prevents
  // arbitrary remote URLs from being persisted as trusted image payloads.
  const cleanCanvaPages = Array.isArray(canvaPages)
    ? canvaPages.filter((page): page is string => typeof page === 'string' && page.startsWith('data:image/'))
    : [];
  const cleanCoverPhoto = typeof coverPhoto === 'string' && coverPhoto.startsWith('data:image/') ? coverPhoto : null;
  const cleanCoverPageIndex =
    typeof coverPageIndex === 'number' && Number.isFinite(coverPageIndex)
      ? Math.max(0, Math.min(cleanCanvaPages.length - 1, Math.floor(coverPageIndex)))
      : null;
  const cleanInsertedPhotos = Array.isArray(insertedPhotos)
    ? insertedPhotos
        .filter((photo) => photo && typeof photo.src === 'string' && photo.src.startsWith('data:image/'))
        .slice(0, MAX_INSERTED_JOURNAL_PHOTOS)
        .map((photo, index) => ({
          id: typeof photo.id === 'string' && photo.id ? photo.id : `photo-${index + 1}`,
          src: photo.src,
          alt: typeof photo.alt === 'string' && photo.alt ? photo.alt : `Inserted photo ${index + 1}`,
          caption: typeof photo.caption === 'string' ? photo.caption : '',
        }))
    : [];
  const cleanInstagramEmbeds = sanitizeInstagramEmbedUrls(instagramEmbeds);
  const hasRequestedInstagramEmbeds = Array.isArray(instagramEmbeds)
    ? instagramEmbeds.length > 0
    : typeof instagramEmbeds === 'string'
      ? instagramEmbeds.trim().length > 0
      : false;

  if (hasRequestedInstagramEmbeds && cleanInstagramEmbeds.length === 0) {
    return NextResponse.json({ success: false, error: 'Add a public Instagram post or Reel URL.' }, { status: 400 });
  }

  // The content payload fallback preserves Canva/cover/photo metadata even when
  // newer database columns are not installed yet.
  const canvaPayload = {
    designId: canvaDesignId || null,
    designTitle: canvaDesignTitle || null,
    designEditUrl: canvaDesignEditUrl || null,
    coverPhoto: cleanCoverPhoto,
    coverPageIndex: cleanCoverPageIndex,
    insertedPhotos: cleanInsertedPhotos,
    tripStartDate: cleanTripStartDate,
    tripEndDate: cleanTripEndDate,
    instagramEmbeds: cleanInstagramEmbeds,
  };
  const shouldEncodeCanvaPayload = Boolean(
    cleanCanvaPages.length ||
    cleanCoverPhoto ||
    cleanCoverPageIndex !== null ||
    cleanInsertedPhotos.length ||
    cleanInstagramEmbeds.length
  );

  const insertPayload: Record<string, unknown> = {
    user_id: context.user.id,
    country_id: countryId,
    title,
    content: shouldEncodeCanvaPayload
      ? encodeJournalContentWithCanva(content, canvaPayload)
      : content,
    mood,
    tags,
    trip_start_date: cleanTripStartDate,
    trip_end_date: cleanTripEndDate,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (canvaDesignId || cleanCanvaPages.length > 0) {
    insertPayload.canva_design_id = canvaDesignId || null;
    insertPayload.canva_design_title = canvaDesignTitle || null;
    insertPayload.canva_design_edit_url = canvaDesignEditUrl || null;
    insertPayload.canva_pages = cleanCanvaPages;
    insertPayload.canva_page_count = cleanCanvaPages.length || null;
  }

  const { data, error } = await context.supabaseAdmin
    .from('journal_entries')
    .insert([insertPayload])
    .select('*');

  if (error) {
    // Migration fallback: older databases can still save a readable entry by
    // encoding Canva/date metadata into the content field.
    if (isMissingJournalMetadataColumnError(error.message)) {
      const { data: fallbackData, error: fallbackError } = await context.supabaseAdmin
        .from('journal_entries')
        .insert([
          {
            user_id: context.user.id,
            country_id: countryId,
            title,
            content: encodeJournalContentWithCanva(content, {
              ...canvaPayload,
              pages: cleanCanvaPages,
            }),
            mood,
            tags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select('*');

      if (fallbackError) {
        return NextResponse.json(
          {
            success: false,
            error: isMissingCanvaJournalColumnError(error.message)
              ? CANVA_SCHEMA_ERROR_MESSAGE
              : JOURNAL_METADATA_SCHEMA_ERROR_MESSAGE,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          ...fallbackData?.[0],
          content,
          canva_design_id: canvaDesignId || null,
          canva_design_title: canvaDesignTitle || null,
          canva_design_edit_url: canvaDesignEditUrl || null,
          canva_pages: cleanCanvaPages,
          canva_page_count: cleanCanvaPages.length || null,
          coverPhoto: cleanCoverPhoto,
          coverPageIndex: cleanCoverPageIndex,
          insertedPhotos: cleanInsertedPhotos,
          trip_start_date: cleanTripStartDate,
          trip_end_date: cleanTripEndDate,
          tripStartDate: cleanTripStartDate,
          tripEndDate: cleanTripEndDate,
        },
      });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data?.[0] });
}

// Updates either the title alone or the full editable journal metadata.
export async function PATCH(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'journal');

  if (isRouteError(context)) {
    return context;
  }

  const demoWriteError = rejectSeededDemoCloudWrite(context.user);
  if (demoWriteError) {
    return demoWriteError;
  }

  const body = await readJsonBody<JournalMutationBody>(request, {
    maxBytes: 18 * 1024 * 1024,
    errorMessage: 'Journal update is too large.',
  });

  if (isApiError(body)) {
    return body;
  }

  const {
    entryId,
    countryId,
    title,
    content,
    mood,
    tags,
    canvaDesignId,
    canvaDesignTitle,
    canvaDesignEditUrl,
    canvaPages,
    coverPhoto,
    coverPageIndex,
    insertedPhotos,
    instagramEmbeds,
    tripStartDate,
    tripEndDate,
  } = body;
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  // Rename flows only send entryId/title; edit flows include the rest of the
  // journal fields and therefore need stricter validation.
  const hasFullEntryUpdate =
    'countryId' in body ||
    'content' in body ||
    'mood' in body ||
    'tags' in body ||
    'canvaDesignId' in body ||
    'canvaDesignTitle' in body ||
    'canvaDesignEditUrl' in body ||
    'canvaPages' in body ||
    'coverPhoto' in body ||
    'coverPageIndex' in body ||
    'insertedPhotos' in body ||
    'instagramEmbeds' in body ||
    'tripStartDate' in body ||
    'tripEndDate' in body;
  const cleanCountryId = typeof countryId === 'string' ? countryId.trim() : '';
  const cleanContent = typeof content === 'string' ? content.trim() : '';
  const cleanMood = typeof mood === 'string' ? mood.trim() : '';
  const cleanTags = Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean)
    : [];

  if (!entryId || !cleanTitle) {
    return NextResponse.json({ success: false, error: 'Missing required journal title fields.' }, { status: 400 });
  }

  if (hasFullEntryUpdate && (!cleanCountryId || !cleanContent || !cleanMood)) {
    return NextResponse.json({ success: false, error: 'Missing required journal fields.' }, { status: 400 });
  }

  if (hasFullEntryUpdate && cleanContent.length > 60_000) {
    return NextResponse.json({ success: false, error: 'Journal story is too long to save.' }, { status: 413 });
  }

  const fallbackDate = getTodayJournalDate();
  const cleanTripStartDate = normalizeJournalDate(tripStartDate, fallbackDate);
  const cleanTripEndDate = normalizeJournalDate(tripEndDate, cleanTripStartDate);
  const tripDateError = getJournalDateRangeError(cleanTripStartDate, cleanTripEndDate);

  if (hasFullEntryUpdate && tripDateError) {
    return NextResponse.json({ success: false, error: tripDateError }, { status: 400 });
  }

  const cleanCanvaDesignId = clampText(canvaDesignId, 200);
  const cleanCanvaDesignTitle = clampText(canvaDesignTitle, 255);
  const cleanCanvaDesignEditUrl = clampText(canvaDesignEditUrl, 600);
  const cleanCanvaPages = Array.isArray(canvaPages)
    ? canvaPages.filter((page): page is string => typeof page === 'string' && page.startsWith('data:image/'))
    : [];
  const cleanCoverPhoto = typeof coverPhoto === 'string' && coverPhoto.startsWith('data:image/') ? coverPhoto : null;
  const cleanCoverPageIndex =
    typeof coverPageIndex === 'number' && Number.isFinite(coverPageIndex) && cleanCanvaPages.length
      ? Math.max(0, Math.min(cleanCanvaPages.length - 1, Math.floor(coverPageIndex)))
      : null;
  const cleanInsertedPhotos = Array.isArray(insertedPhotos)
    ? insertedPhotos
        .filter((photo) => photo && typeof photo.src === 'string' && photo.src.startsWith('data:image/'))
        .slice(0, MAX_INSERTED_JOURNAL_PHOTOS)
        .map((photo, index) => ({
          id: typeof photo.id === 'string' && photo.id ? photo.id : `photo-${index + 1}`,
          src: photo.src,
          alt: typeof photo.alt === 'string' && photo.alt ? photo.alt : `Inserted photo ${index + 1}`,
          caption: typeof photo.caption === 'string' ? photo.caption : '',
        }))
    : [];
  const cleanInstagramEmbeds = sanitizeInstagramEmbedUrls(instagramEmbeds);
  const hasRequestedInstagramEmbeds = Array.isArray(instagramEmbeds)
    ? instagramEmbeds.length > 0
    : typeof instagramEmbeds === 'string'
      ? instagramEmbeds.trim().length > 0
      : false;

  if (hasFullEntryUpdate && hasRequestedInstagramEmbeds && cleanInstagramEmbeds.length === 0) {
    return NextResponse.json({ success: false, error: 'Add a public Instagram post or Reel URL.' }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    title: cleanTitle,
    updated_at: new Date().toISOString(),
  };

  if (hasFullEntryUpdate) {
    const { data: existingEntry, error: lookupError } = await context.supabaseAdmin
      .from('journal_entries')
      .select('content')
      .eq('id', entryId)
      .eq('user_id', context.user.id)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ success: false, error: lookupError.message }, { status: 500 });
    }

    if (!existingEntry) {
      return NextResponse.json({ success: false, error: 'Journal entry not found.' }, { status: 404 });
    }

    // Preserve existing embedded Canva metadata while replacing the human story
    // text, media attachments, and trip dates.
    const decodedExistingContent = decodeJournalContentWithCanva(String(existingEntry.content || ''));
    const existingCanvaPayload = decodedExistingContent.canva;
    const nextCanvaPages = 'canvaPages' in body ? cleanCanvaPages : existingCanvaPayload?.pages ?? [];
    const nextCoverPhoto = 'coverPhoto' in body ? cleanCoverPhoto : existingCanvaPayload?.coverPhoto ?? null;
    const nextCoverPageIndex =
      'coverPageIndex' in body
        ? cleanCoverPageIndex
        : typeof existingCanvaPayload?.coverPageIndex === 'number'
          ? existingCanvaPayload.coverPageIndex
          : null;
    const nextInsertedPhotos = 'insertedPhotos' in body ? cleanInsertedPhotos : existingCanvaPayload?.insertedPhotos ?? [];
    const nextInstagramEmbeds = 'instagramEmbeds' in body ? cleanInstagramEmbeds : existingCanvaPayload?.instagramEmbeds ?? [];
    const nextCanvaPayload =
      existingCanvaPayload ||
      nextCanvaPages.length ||
      nextCoverPhoto ||
      nextCoverPageIndex !== null ||
      nextInsertedPhotos.length ||
      nextInstagramEmbeds.length
      ? {
          ...existingCanvaPayload,
          designId: cleanCanvaDesignId || existingCanvaPayload?.designId || null,
          designTitle: cleanCanvaDesignTitle || existingCanvaPayload?.designTitle || null,
          designEditUrl: cleanCanvaDesignEditUrl || existingCanvaPayload?.designEditUrl || null,
          pages: nextCanvaPages,
          coverPhoto: nextCoverPhoto,
          coverPageIndex: nextCoverPageIndex,
          insertedPhotos: nextInsertedPhotos,
          tripStartDate: cleanTripStartDate,
          tripEndDate: cleanTripEndDate,
          instagramEmbeds: nextInstagramEmbeds,
        }
      : null;

    updatePayload.country_id = cleanCountryId;
    updatePayload.content = nextCanvaPayload
      ? encodeJournalContentWithCanva(cleanContent, nextCanvaPayload)
      : cleanContent;
    updatePayload.mood = cleanMood;
    updatePayload.tags = cleanTags;
    updatePayload.trip_start_date = cleanTripStartDate;
    updatePayload.trip_end_date = cleanTripEndDate;

    if (cleanCanvaDesignId || cleanCanvaPages.length > 0 || 'canvaPages' in body) {
      updatePayload.canva_design_id = cleanCanvaDesignId || null;
      updatePayload.canva_design_title = cleanCanvaDesignTitle || null;
      updatePayload.canva_design_edit_url = cleanCanvaDesignEditUrl || null;
      updatePayload.canva_pages = cleanCanvaPages;
      updatePayload.canva_page_count = cleanCanvaPages.length || null;
    }
  }

  const updateQuery = context.supabaseAdmin
    .from('journal_entries')
    .update(updatePayload)
    .eq('id', entryId)
    .eq('user_id', context.user.id)
    .select('*')
    .maybeSingle();
  const { data, error } = await updateQuery;

  if (error) {
    if (hasFullEntryUpdate && isMissingJournalMetadataColumnError(error.message)) {
      const fallbackUpdatePayload = { ...updatePayload };
      delete fallbackUpdatePayload.trip_start_date;
      delete fallbackUpdatePayload.trip_end_date;

      if (typeof fallbackUpdatePayload.content === 'string' && !decodeJournalContentWithCanva(fallbackUpdatePayload.content).canva) {
        fallbackUpdatePayload.content = encodeJournalContentWithCanva(cleanContent, {
          tripStartDate: cleanTripStartDate,
          tripEndDate: cleanTripEndDate,
        });
      }

      const { data: fallbackData, error: fallbackError } = await context.supabaseAdmin
        .from('journal_entries')
        .update(fallbackUpdatePayload)
        .eq('id', entryId)
        .eq('user_id', context.user.id)
        .select('*')
        .maybeSingle();

      if (fallbackError) {
        return NextResponse.json({ success: false, error: fallbackError.message }, { status: 500 });
      }

      if (!fallbackData) {
        return NextResponse.json({ success: false, error: 'Journal entry not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          ...fallbackData,
          trip_start_date: cleanTripStartDate,
          trip_end_date: cleanTripEndDate,
          tripStartDate: cleanTripStartDate,
          tripEndDate: cleanTripEndDate,
        },
      });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ success: false, error: 'Journal entry not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data });
}

// Deletes an owned journal entry and explicitly removes related share/comment
// rows so recipients do not see dangling shared records.
export async function DELETE(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'journal');

  if (isRouteError(context)) {
    return context;
  }

  const demoWriteError = rejectSeededDemoCloudWrite(context.user);
  if (demoWriteError) {
    return demoWriteError;
  }

  const body = await readJsonBody<JournalMutationBody>(request, {
    maxBytes: 8 * 1024,
    errorMessage: 'Journal delete request is too large.',
  });

  if (isApiError(body)) {
    return body;
  }

  const { entryId } = body;

  if (!entryId) {
    return NextResponse.json({ success: false, error: 'Missing required journal entry id.' }, { status: 400 });
  }

  const { data: ownedEntry, error: lookupError } = await context.supabaseAdmin
    .from('journal_entries')
    .select('id')
    .eq('id', entryId)
    .eq('user_id', context.user.id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ success: false, error: lookupError.message }, { status: 500 });
  }

  if (!ownedEntry) {
    return NextResponse.json({ success: false, error: 'Journal entry not found.' }, { status: 404 });
  }

  const { error: commentsError } = await context.supabaseAdmin
    .from('journal_share_comments')
    .delete()
    .eq('journal_entry_id', entryId);

  if (commentsError) {
    return NextResponse.json({ success: false, error: commentsError.message }, { status: 500 });
  }

  const { error: sharesError } = await context.supabaseAdmin
    .from('journal_shares')
    .delete()
    .eq('journal_entry_id', entryId)
    .eq('shared_by', context.user.id);

  if (sharesError) {
    return NextResponse.json({ success: false, error: sharesError.message }, { status: 500 });
  }

  const { error: deleteError } = await context.supabaseAdmin
    .from('journal_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', context.user.id);

  if (deleteError) {
    return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
