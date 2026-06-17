import { NextRequest, NextResponse } from 'next/server';
import { getFriendRouteContext, isRouteError, jsonError, loadFriendshipSummary } from '@/lib/server/friendships';

export async function GET(request: NextRequest) {
  const context = await getFriendRouteContext(request);

  if (isRouteError(context)) {
    return context;
  }

  try {
    const data = await loadFriendshipSummary(context.supabaseAdmin, context.user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to load friends.', 500);
  }
}
