import { NextRequest, NextResponse } from 'next/server';
import { getFriendRouteContext, isRouteError, jsonError } from '@/lib/server/friendships';
import { loadSharedJournalEntries, loadSharedJournalEntry } from '@/lib/server/journalSharing';

const SHARED_SEARCH_SCOPES = new Set(['all', 'title', 'country', 'tag', 'text']);

export async function GET(request: NextRequest) {
  const context = await getFriendRouteContext(request);

  if (isRouteError(context)) {
    return context;
  }

  try {
    const entryId = request.nextUrl.searchParams.get('entryId');

    if (entryId) {
      const entry = await loadSharedJournalEntry(context.supabaseAdmin, context.user.id, entryId);

      if (!entry) {
        return jsonError('Shared journal entry not found.', 404);
      }

      return NextResponse.json({ success: true, data: entry, count: 1, hasMore: false });
    }

    const limitParam = request.nextUrl.searchParams.get('limit');
    const offsetParam = request.nextUrl.searchParams.get('offset');
    const searchScopeParam = request.nextUrl.searchParams.get('searchScope') ?? 'all';
    const result = await loadSharedJournalEntries(context.supabaseAdmin, context.user.id, {
      limit: limitParam ? Math.min(Math.max(Number.parseInt(limitParam, 10) || 0, 1), 50) : null,
      offset: offsetParam ? Math.max(Number.parseInt(offsetParam, 10) || 0, 0) : 0,
      summary: request.nextUrl.searchParams.get('summary') === 'true',
      search: request.nextUrl.searchParams.get('search')?.trim().slice(0, 120) ?? '',
      searchScope: (SHARED_SEARCH_SCOPES.has(searchScopeParam) ? searchScopeParam : 'all') as 'all' | 'title' | 'country' | 'tag' | 'text',
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to load shared journal entries.', 500);
  }
}
