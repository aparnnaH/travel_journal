import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

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
  const { userId, countryId, title, content, mood, tags } = body;

  if (!userId || !countryId || !title || !content) {
    return NextResponse.json({ success: false, error: 'Missing required journal fields.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .insert([
      {
        user_id: userId,
        country_id: countryId,
        title,
        content,
        mood,
        tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select('*');

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data?.[0] });
}
