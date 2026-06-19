import { NextRequest, NextResponse } from 'next/server';
import { encodeJournalContentWithCanva } from '@/lib/journalCanvaPayload';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';

const CANVA_SCHEMA_ERROR_MESSAGE =
  'Canva journal fields are not installed yet. Run supabase/canva_journal_entries.sql in Supabase, then try saving again.';
const MAX_INSERTED_JOURNAL_PHOTOS = 8;

const isMissingCanvaJournalColumnError = (message: string) =>
  /canva_(design|pages|page)/i.test(message) &&
  /(column|schema cache|could not find)/i.test(message);

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'journal');

  if (isRouteError(context)) {
    return context;
  }

  const { data, error } = await context.supabaseAdmin
    .from('journal_entries')
    .select('*')
    .eq('user_id', context.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'journal');

  if (isRouteError(context)) {
    return context;
  }

  const body = await request.json();
  const {
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
  } = body;

  if (!countryId || !title || !content) {
    return NextResponse.json({ success: false, error: 'Missing required journal fields.' }, { status: 400 });
  }

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
  const shouldEncodeCanvaPayload = Boolean(cleanCoverPhoto || cleanInsertedPhotos.length);

  const insertPayload: Record<string, unknown> = {
    user_id: context.user.id,
    country_id: countryId,
    title,
    content: shouldEncodeCanvaPayload
      ? encodeJournalContentWithCanva(content, {
          designId: canvaDesignId || null,
          designTitle: canvaDesignTitle || null,
          designEditUrl: canvaDesignEditUrl || null,
          coverPhoto: cleanCoverPhoto,
          coverPageIndex: cleanCoverPageIndex,
          insertedPhotos: cleanInsertedPhotos,
        })
      : content,
    mood,
    tags,
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
    if (isMissingCanvaJournalColumnError(error.message)) {
      const { data: fallbackData, error: fallbackError } = await context.supabaseAdmin
        .from('journal_entries')
        .insert([
          {
            user_id: context.user.id,
            country_id: countryId,
            title,
            content: encodeJournalContentWithCanva(content, {
              designId: canvaDesignId || null,
              designTitle: canvaDesignTitle || null,
              designEditUrl: canvaDesignEditUrl || null,
              pages: cleanCanvaPages,
              coverPhoto: cleanCoverPhoto,
              coverPageIndex: cleanCoverPageIndex,
              insertedPhotos: cleanInsertedPhotos,
            }),
            mood,
            tags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select('*');

      if (fallbackError) {
        return NextResponse.json({ success: false, error: CANVA_SCHEMA_ERROR_MESSAGE }, { status: 500 });
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
        },
      });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data?.[0] });
}

export async function PATCH(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'journal');

  if (isRouteError(context)) {
    return context;
  }

  const body = await request.json();
  const { entryId, title } = body;
  const cleanTitle = typeof title === 'string' ? title.trim() : '';

  if (!entryId || !cleanTitle) {
    return NextResponse.json({ success: false, error: 'Missing required journal title fields.' }, { status: 400 });
  }

  const { data, error } = await context.supabaseAdmin
    .from('journal_entries')
    .update({
      title: cleanTitle,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('user_id', context.user.id)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ success: false, error: 'Journal entry not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'journal');

  if (isRouteError(context)) {
    return context;
  }

  const body = await request.json();
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
    .from('journal_comments')
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
