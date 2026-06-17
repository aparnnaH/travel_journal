import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Missing userId query parameter.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).limit(1);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const body = await request.json();
  const { id, email, displayName, avatar, createdAt } = body;

  if (!id || !email) {
    return NextResponse.json(
      { success: false, error: 'Missing required profile fields.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id,
        email,
        display_name: displayName || null,
        avatar_url: avatar || null,
        created_at: createdAt,
      },
      { onConflict: 'id' }
    )
    .select('*');

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
