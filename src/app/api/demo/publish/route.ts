// Server-gated demo publishing controls. The owner allowlist stays in a
// server-only env var so real account emails are not bundled into client JS.
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';
import { getOwnedJournalEntry } from '@/lib/server/journalSharing';

export const runtime = 'nodejs';

const getDemoPublisherEmails = () =>
  new Set(
    (process.env.DEMO_PUBLISHER_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

const canPublishToDemo = (email?: string | null) => Boolean(email && getDemoPublisherEmails().has(email.toLowerCase()));

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'demo publishing');

  if (isRouteError(context)) {
    return context;
  }

  return NextResponse.json({
    success: true,
    canPublish: canPublishToDemo(context.user.email),
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

  return NextResponse.json({ success: true });
}
