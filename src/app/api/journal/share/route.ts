// Journal sharing route.
// Owners can inspect and replace the friend recipient list for a journal entry.
import { NextRequest, NextResponse } from 'next/server';
import { getFriendRouteContext, isRouteError, jsonError } from '@/lib/server/friendships';
import { getOwnedJournalEntry, loadJournalShareRecipients, replaceJournalShares } from '@/lib/server/journalSharing';
import type { JournalSharePermission } from '@/types/journalSharing';

type ShareRequestBody = {
  entryId?: string;
  friendIds?: string[];
  permission?: JournalSharePermission;
};

// Loads current share recipients for an owned journal entry.
export async function GET(request: NextRequest) {
  const context = await getFriendRouteContext(request);

  if (isRouteError(context)) {
    return context;
  }

  try {
    const entryId = request.nextUrl.searchParams.get('entryId');

    if (!entryId) {
      return jsonError('Missing journal entry id.');
    }

    const entry = await getOwnedJournalEntry(context.supabaseAdmin, entryId, context.user.id);

    if (!entry) {
      return jsonError('Journal entry not found.', 404);
    }

    const data = await loadJournalShareRecipients(context.supabaseAdmin, entryId, context.user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to load journal shares.', 500);
  }
}

// Replaces share recipients. The helper checks that every recipient is an
// accepted friend before writing journal_shares rows.
export async function POST(request: NextRequest) {
  const context = await getFriendRouteContext(request);

  if (isRouteError(context)) {
    return context;
  }

  try {
    const body = (await request.json()) as ShareRequestBody;

    if (!body.entryId) {
      return jsonError('Missing journal entry id.');
    }

    const entry = await getOwnedJournalEntry(context.supabaseAdmin, body.entryId, context.user.id);

    if (!entry) {
      return jsonError('Journal entry not found.', 404);
    }

    const data = await replaceJournalShares({
      entryId: body.entryId,
      friendIds: body.friendIds ?? [],
      permission: body.permission ?? 'view',
      sharedBy: context.user.id,
      supabaseAdmin: context.supabaseAdmin,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to save journal shares.', 500);
  }
}
