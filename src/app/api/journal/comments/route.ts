// Comments route for shared/accessible journal entries.
// Access checks happen in the server sharing helper so owners and recipients can
// participate safely.
import { NextRequest, NextResponse } from 'next/server';
import { getFriendRouteContext, isRouteError, jsonError } from '@/lib/server/friendships';
import { rejectSeededDemoCloudWrite } from '@/lib/server/demoCloudGuard';
import { createJournalComment, loadJournalComments } from '@/lib/server/journalSharing';

type CommentRequestBody = {
  entryId?: string;
  body?: string;
};

// Loads the comment thread for an accessible journal entry.
export async function GET(request: NextRequest) {
  const context = await getFriendRouteContext(request);

  if (isRouteError(context)) {
    return context;
  }

  const demoWriteError = rejectSeededDemoCloudWrite(context.user);
  if (demoWriteError) {
    return demoWriteError;
  }

  try {
    const entryId = request.nextUrl.searchParams.get('entryId');

    if (!entryId) {
      return jsonError('Missing journal entry id.');
    }

    const data = await loadJournalComments(context.supabaseAdmin, entryId, context.user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to load comments.', 500);
  }
}

// Creates a comment authored by the signed-in user.
export async function POST(request: NextRequest) {
  const context = await getFriendRouteContext(request);

  if (isRouteError(context)) {
    return context;
  }

  try {
    const body = (await request.json()) as CommentRequestBody;

    if (!body.entryId) {
      return jsonError('Missing journal entry id.');
    }

    const data = await createJournalComment({
      body: body.body ?? '',
      entryId: body.entryId,
      supabaseAdmin: context.supabaseAdmin,
      userId: context.user.id,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to save comment.', 500);
  }
}
