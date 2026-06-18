import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const CANVA_SCHEMA_ERROR_MESSAGE =
  'Canva journal fields are not installed yet. Run supabase/canva_journal_entries.sql in Supabase, then try saving again.';

const isMissingCanvaJournalColumnError = (message: string) =>
  /canva_(design|pages|page)/i.test(message) &&
  /(column|schema cache|could not find)/i.test(message);

export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Missing userId query parameter.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const body = await request.json();
  const {
    userId,
    countryId,
    title,
    content,
    mood,
    tags,
    canvaDesignId,
    canvaDesignTitle,
    canvaDesignEditUrl,
    canvaPages,
  } = body;

  if (!userId || !countryId || !title || !content) {
    return NextResponse.json({ success: false, error: 'Missing required journal fields.' }, { status: 400 });
  }

  const cleanCanvaPages = Array.isArray(canvaPages)
    ? canvaPages.filter((page): page is string => typeof page === 'string' && page.startsWith('data:image/'))
    : [];

  const insertPayload: Record<string, unknown> = {
    user_id: userId,
    country_id: countryId,
    title,
    content,
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

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .insert([insertPayload])
    .select('*');

  if (error) {
    if (isMissingCanvaJournalColumnError(error.message)) {
      return NextResponse.json({ success: false, error: CANVA_SCHEMA_ERROR_MESSAGE }, { status: 500 });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data?.[0] });
}

export async function PATCH(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const body = await request.json();
  const { userId, entryId, title } = body;
  const cleanTitle = typeof title === 'string' ? title.trim() : '';

  if (!userId || !entryId || !cleanTitle) {
    return NextResponse.json({ success: false, error: 'Missing required journal title fields.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .update({
      title: cleanTitle,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('user_id', userId)
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
