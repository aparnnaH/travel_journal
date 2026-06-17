import { NextRequest, NextResponse } from 'next/server';
import { getFriendRouteContext, isRouteError, jsonError } from '@/lib/server/friendships';
import { loadSharedJournalEntries } from '@/lib/server/journalSharing';

export async function GET(request: NextRequest) {
  const context = await getFriendRouteContext(request);

  if (isRouteError(context)) {
    return context;
  }

  try {
    const data = await loadSharedJournalEntries(context.supabaseAdmin, context.user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to load shared journal entries.', 500);
  }
}
