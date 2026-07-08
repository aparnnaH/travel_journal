// Server route for OpenAI-backed companion replies.
// The client sends an already-bounded archive snapshot; this route builds a
// grounded prompt and returns a concise assistant reply.
import { NextRequest, NextResponse } from 'next/server';
import type { CompanionArchiveSnapshot, CompanionChatRole } from '@/lib/ai/types';
import { checkApiRateLimit, clampText, isApiError, readJsonBody } from '@/lib/server/apiSafety';
import { getAuthenticatedRouteContext, isRouteError } from '@/lib/server/auth';

type OpenAIResponseContentItem = {
  type?: string;
  text?: string;
};

type OpenAIResponseOutputItem = {
  type?: string;
  role?: string;
  content?: OpenAIResponseContentItem[];
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: OpenAIResponseOutputItem[];
};

type CompanionRoutePayload = {
  message?: string;
  archive?: CompanionArchiveSnapshot;
  activeJournalDraft?: {
    countryName?: string;
    places?: string[];
    draft?: string;
  } | null;
  history?: Array<{
    role?: CompanionChatRole;
    content?: string;
  }>;
};

export const runtime = 'nodejs';

// Keeps prompt sections bounded before sending them to the model.
const trimText = (value: string, maxLength: number) => {
  const clean = value.replace(/\s+/g, ' ').trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength - 1).trim()}…`;
};

// Supports the Responses API output shape by collecting text parts.
const extractOutputText = (payload: OpenAIResponsePayload) => {
  if (payload.output_text && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const assistantMessage = payload.output?.find((item) => item.type === 'message' && item.role === 'assistant');
  const textParts =
    assistantMessage?.content
      ?.filter((item) => item.type === 'output_text' && typeof item.text === 'string')
      .map((item) => String(item.text).trim())
      .filter(Boolean) ?? [];

  return textParts.join('\n').trim();
};

// Converts the archive snapshot into readable prompt context.
const buildArchivePrompt = (archive: CompanionArchiveSnapshot) =>
  [
    `Counts: ${archive.counts.visitedCountries} visited countries, ${archive.counts.journalEntries} journal entries, ${archive.counts.scrapbookPages} scrapbook pages, ${archive.counts.importedTrips} imported trips, ${archive.counts.passportStamps} passport stamps.`,
    `Visited countries: ${archive.visitedCountryNames.join(', ') || 'none yet'}.`,
    `Top tags: ${archive.topTags.join(', ') || 'none yet'}.`,
    `Top moods: ${archive.topMoods.join(', ') || 'none yet'}.`,
    `Travel personality: ${archive.personality.label} - ${archive.personality.description}`,
    `Trip summary: ${archive.tripSummary.headline}. ${archive.tripSummary.coverage}. Next focus: ${archive.tripSummary.nextFocus}`,
    `Recent journal entries:\n${archive.recentJournalEntries
      .map(
        (entry) =>
          `- ${entry.title} (${entry.country}, ${entry.mood}; tags: ${entry.tags.join(', ') || 'none'}): ${trimText(
            entry.excerpt,
            280
          )}`
      )
      .join('\n') || '- none'}`,
    `Recent memories:\n${archive.recentMemories
      .map(
        (memory) =>
          `- ${memory.title} [${memory.source}${memory.countryHint ? `, ${memory.countryHint}` : ''}]: ${trimText(
            memory.detail,
            260
          )}`
      )
      .join('\n') || '- none'}`,
    `Imported trips:\n${archive.importedTripSummaries
      .map(
        (trip) =>
          `- ${trip.title} (locations: ${trip.locations.join(', ') || 'none'}; tags: ${
            trip.tags.join(', ') || 'none'
          }): ${trimText(trip.summary, 260)}`
      )
      .join('\n') || '- none'}`,
    `Passport stamps:\n${archive.passportStamps
      .map((stamp) => `- ${stamp.countryName} (${stamp.region})`)
      .join('\n') || '- none'}`,
  ].join('\n\n');

// Includes a short recent conversation history so replies stay coherent.
const buildHistoryPrompt = (history: CompanionRoutePayload['history']) => {
  const safeHistory =
    history
      ?.filter((item) => (item.role === 'assistant' || item.role === 'user') && typeof item.content === 'string')
      .slice(-8)
      .map((item) => `${item.role}: ${trimText(String(item.content), 600)}`) ?? [];

  return safeHistory.length ? safeHistory.join('\n') : 'No previous turns in this chat.';
};

const buildActiveDraftPrompt = (activeDraft: CompanionRoutePayload['activeJournalDraft']) => {
  if (!activeDraft?.draft?.trim()) {
    return 'No active journal draft.';
  }

  const places = activeDraft.places?.map((place) => place.trim()).filter(Boolean) ?? [];

  return [
    `Country: ${activeDraft.countryName || 'Unknown'}`,
    `Places: ${places.join(', ') || 'none listed'}`,
    'Current draft:',
    trimText(activeDraft.draft, 2200),
  ].join('\n');
};

// Removes common formatting wrappers from model responses.
const stripReplyWrapper = (value: string) =>
  value
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^assistant:\s*/i, '')
    .trim();

// Calls OpenAI's Responses API with archive, history, draft, and latest message
// context. This stays server-side because it uses OPENAI_API_KEY.
const callOpenAICompanion = async (params: {
  apiKey: string;
  model: string;
  message: string;
  archive: CompanionArchiveSnapshot;
  activeJournalDraft: CompanionRoutePayload['activeJournalDraft'];
  history: CompanionRoutePayload['history'];
}) => {
  const instructions = [
    'You are the Travel Journal companion: an intelligent, personal travel-memory assistant.',
    'The latest user request is the most important input. Start by directly answering or acting on that exact message.',
    'Do not fall back to generic menus, prompt suggestions, or canned onboarding if the user asked for something specific.',
    'Use only the provided archive snapshot and chat history for claims about the user. Do not invent trips, counts, stamps, journal entries, or places.',
    'Be specific and useful: answer the request, weave in relevant archive signals, and ask a follow-up only if it would materially improve the result.',
    'If an active journal draft is provided and the user asks for a change, rewrite that draft instead of starting over.',
    'If the user asks anything about writing, grammar, captions, rewriting, wording, summaries, or making text sound better, treat it as a writing task and return polished usable prose.',
    'For grammar or proofreading requests, correct spelling, grammar, punctuation, capitalization, and awkward phrasing while preserving the user voice and travel facts.',
    'When writing or rewriting a saveable journal draft, include a markdown heading formatted exactly as "### Country Journal Draft".',
    'For journal, caption, recap, organization, and next-destination requests, provide polished output the user can directly use.',
    'If archive data is thin, say what is missing and give a helpful first step.',
    'Keep the reply under 230 words unless the user asks for a longer draft. Return plain text only.',
  ].join('\n');

  const input = [
    'Archive snapshot:',
    buildArchivePrompt(params.archive),
    '',
    'Recent chat:',
    buildHistoryPrompt(params.history),
    '',
    'Active journal draft:',
    buildActiveDraftPrompt(params.activeJournalDraft),
    '',
    `User request: ${params.message}`,
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      instructions,
      input,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as OpenAIResponsePayload;
  const reply = extractOutputText(payload);

  return reply ? stripReplyWrapper(reply) : null;
};

// Handles one companion chat request.
export async function POST(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'AI companion');

  if (isRouteError(context)) {
    return context;
  }

  const rateLimitError = checkApiRateLimit('ai-companion', context.user.id);

  if (rateLimitError) {
    return rateLimitError;
  }

  const payload = await readJsonBody<CompanionRoutePayload>(request, {
    maxBytes: 80 * 1024,
    errorMessage: 'Companion request is too large.',
  });

  if (isApiError(payload)) {
    return payload;
  }

  const message = clampText(payload.message, 1600);
  const archive = payload.archive;

  if (!message) {
    return NextResponse.json({ success: false, error: 'Missing message.' }, { status: 400 });
  }

  if (!archive) {
    return NextResponse.json({ success: false, error: 'Missing archive snapshot.' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_COMPANION_MODEL || process.env.OPENAI_POLISH_MODEL || 'gpt-5.2';

  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'OpenAI is not configured.' }, { status: 200 });
  }

  try {
    const reply = await callOpenAICompanion({
      apiKey,
      model,
      message,
      archive,
      activeJournalDraft: payload.activeJournalDraft
        ? {
            ...payload.activeJournalDraft,
            countryName: clampText(payload.activeJournalDraft.countryName, 120),
            places: payload.activeJournalDraft.places?.map((place) => clampText(place, 120)).filter(Boolean).slice(0, 12),
            draft: clampText(payload.activeJournalDraft.draft, 5000),
          }
        : payload.activeJournalDraft,
      history: payload.history,
    });

    if (!reply) {
      return NextResponse.json({ success: false, error: 'No companion reply generated.' }, { status: 200 });
    }

    return NextResponse.json({ success: true, reply });
  } catch {
    return NextResponse.json({ success: false, error: 'Companion response failed.' }, { status: 200 });
  }
}
