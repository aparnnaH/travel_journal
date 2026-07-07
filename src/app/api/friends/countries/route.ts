// Country-level Travel Circle comparison route.
// Returns accepted friends' visited-country snapshots only; richer private data
// such as journals, photos, city pins, stamps, and timestamps stay out of scope.
import { NextRequest, NextResponse } from 'next/server';
import {
  getFriendRouteContext,
  isRouteError,
  jsonError,
  loadFriendCountrySnapshots,
} from '@/lib/server/friendships';

export async function GET(request: NextRequest) {
  const context = await getFriendRouteContext(request);

  if (isRouteError(context)) {
    return context;
  }

  try {
    const friends = await loadFriendCountrySnapshots(context.supabaseAdmin, context.user.id);
    return NextResponse.json({ success: true, data: { friends } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to load friend countries.', 500);
  }
}
