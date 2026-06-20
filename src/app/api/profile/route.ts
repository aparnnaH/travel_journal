// Authenticated profile route.
// Route handlers run on the server and validate the app session cookie before
// reading or writing Supabase profile data.
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';

// Loads the profile row for the signed-in user.
export async function GET(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'profile');

  if (isRouteError(context)) {
    return context;
  }

  const { data, error } = await context.supabaseAdmin.from('profiles').select('*').eq('id', context.user.id).limit(1);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

// Upserts profile data for the signed-in user. The user id/email come from the
// verified Supabase session, not from a trusted client payload.
export async function POST(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'profile');

  if (isRouteError(context)) {
    return context;
  }

  const body = await request.json();
  const { displayName, avatar, createdAt } = body;

  if (!context.user.email) {
    return NextResponse.json(
      { success: false, error: 'Authenticated user is missing an email address.' },
      { status: 400 }
    );
  }

  const { data, error } = await context.supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: context.user.id,
        email: context.user.email,
        display_name: displayName || null,
        avatar_url: avatar || null,
        created_at: createdAt || context.user.created_at,
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
