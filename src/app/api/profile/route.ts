import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';

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
