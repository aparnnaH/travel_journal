import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: authError || 'Authentication required' },
      { status: 401 }
    );
  }

  const { data: connection, error } = await supabaseAdmin
    .from('instagram_connections')
    .select('instagram_username, instagram_user_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    connected: Boolean(connection),
    connection: connection || null,
  });
}

