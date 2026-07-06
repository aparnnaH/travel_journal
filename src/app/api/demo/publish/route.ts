// Server-gated demo publishing controls. The owner allowlist stays in a
// server-only env var so real account emails are not bundled into client JS.
import { NextRequest, NextResponse } from 'next/server';
import { DEMO_SHARE_RECIPIENT_ID } from '@/lib/demoMode';
import { authCookieName } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';
import { getOwnedJournalEntry, loadJournalComments } from '@/lib/server/journalSharing';
import type { JournalEntry } from '@/types';
import type { JournalComment } from '@/types/journalComments';

export const runtime = 'nodejs';

const getDemoPublisherEmails = () =>
  new Set(
    (process.env.DEMO_PUBLISHER_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

const canPublishToDemo = (email?: string | null) => Boolean(email && getDemoPublisherEmails().has(email.toLowerCase()));

const mapPublishedRows = (rows: Array<{ entry_payload: unknown; comments_payload: unknown }>) => {
  const commentsByEntry: Record<string, JournalComment[]> = {};
  const entries = rows
    .map((row) => row.entry_payload)
    .filter((entry): entry is JournalEntry => entry !== null && typeof entry === 'object' && 'id' in entry);

  rows.forEach((row) => {
    const entry = row.entry_payload as { id?: unknown } | null;
    const entryId = typeof entry?.id === 'string' ? entry.id : '';

    if (!entryId) {
      return;
    }

    commentsByEntry[entryId] = Array.isArray(row.comments_payload) ? (row.comments_payload as JournalComment[]) : [];
  });

  return { entries, commentsByEntry };
};

async function getOptionalUserEmail(request: NextRequest) {
  const token = request.cookies.get(authCookieName)?.value || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.email ?? null;
}

export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('demo_shared_journal_entries')
    .select('entry_payload,comments_payload')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({
      success: false,
      canPublish: canPublishToDemo(await getOptionalUserEmail(request)),
      data: [],
      commentsByEntry: {},
      error: 'Run supabase/demo_shared_journal_entries.sql to enable permanent demo shared entries.',
    });
  }

  const published = mapPublishedRows((data ?? []) as Array<{ entry_payload: unknown; comments_payload: unknown }>);

  return NextResponse.json({
    success: true,
    canPublish: canPublishToDemo(await getOptionalUserEmail(request)),
    data: published.entries,
    commentsByEntry: published.commentsByEntry,
  });
}

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'demo publishing');

  if (isRouteError(context)) {
    return context;
  }

  if (!canPublishToDemo(context.user.email)) {
    return NextResponse.json({ success: false, error: 'This account cannot publish entries to the demo.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { entryId?: string } | null;
  const entryId = typeof body?.entryId === 'string' ? body.entryId : '';

  if (!entryId) {
    return NextResponse.json({ success: false, error: 'Missing journal entry.' }, { status: 400 });
  }

  const entry = await getOwnedJournalEntry(context.supabaseAdmin, entryId, context.user.id);

  if (!entry) {
    return NextResponse.json({ success: false, error: 'Journal entry not found.' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const demoEntryId = `demo-shared-copy-${entry.id}`;
  const demoSharedEntry = {
    id: demoEntryId,
    userId: DEMO_SHARE_RECIPIENT_ID,
    countryId: entry.country_id,
    country_id: entry.country_id,
    title: entry.title,
    content: entry.content ?? '',
    mood: entry.mood,
    tags: entry.tags ?? [],
    photos: [],
    canvaDesignId: entry.canva_design_id ?? null,
    canvaDesignTitle: entry.canva_design_title ?? null,
    canvaDesignEditUrl: null,
    canvaPages: entry.canva_pages ?? [],
    canvaPageCount: entry.canva_page_count ?? entry.canva_pages?.length ?? null,
    coverPhoto: entry.canva_pages?.[0] ?? null,
    coverPageIndex: null,
    tripStartDate: entry.trip_start_date ?? null,
    tripEndDate: entry.trip_end_date ?? null,
    insertedPhotos: [],
    canva_design_id: entry.canva_design_id ?? null,
    canva_design_title: entry.canva_design_title ?? null,
    canva_design_edit_url: null,
    canva_pages: entry.canva_pages ?? [],
    canva_page_count: entry.canva_page_count ?? entry.canva_pages?.length ?? null,
    trip_start_date: entry.trip_start_date ?? null,
    trip_end_date: entry.trip_end_date ?? null,
    createdAt: entry.created_at,
    created_at: entry.created_at,
    updatedAt: now,
  } satisfies JournalEntry & { country_id: string; created_at: string };
  const comments = await loadJournalComments(context.supabaseAdmin, entryId, context.user.id);
  const demoComments = comments.map<JournalComment>((comment, index) => ({
    ...comment,
    id: `demo-copied-comment-${entry.id}-${index}`,
    journalEntryId: demoEntryId,
    authorId: comment.authorId || `demo-comment-author-${index}`,
    author: {
      id: comment.author.id || `demo-comment-author-${index}`,
      email: `demo-commenter-${index + 1}@traveljournal.app`,
      displayName: comment.author.displayName || 'Travel friend',
      avatar: comment.author.avatar,
    },
  }));
  const { error } = await context.supabaseAdmin
    .from('demo_shared_journal_entries')
    .upsert(
      {
        id: demoEntryId,
        source_entry_id: entry.id,
        published_by: context.user.id,
        title: entry.title,
        entry_payload: demoSharedEntry,
        comments_payload: demoComments,
        updated_at: now,
      },
      { onConflict: 'id' }
    );

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Run supabase/demo_shared_journal_entries.sql to enable permanent demo shared entries.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: demoSharedEntry, comments: demoComments });
}
