// Server route for journal-draft polishing.
// It improves generated writing while preserving required places/details and
// gracefully falls back when OpenAI is unavailable.
import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, clampStringList, clampText, isApiError, readJsonBody } from '@/lib/server/apiSafety';
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

type PolishRequestPayload = {
  draft?: string;
  lastUserInput?: string;
  requiredMentions?: string[];
};

type OpenAIPolishInput = {
  body: string;
  lastUserInput: string;
  requiredMentions: string[];
};

export const runtime = 'nodejs';

const JOURNAL_LINE_PATTERN = /^###\s+(.+?)\s+Journal Draft\s*$/i;
const STOP_WORDS = new Set([
  'the',
  'and',
  'with',
  'that',
  'this',
  'from',
  'into',
  'your',
  'have',
  'just',
  'made',
  'felt',
  'very',
  'want',
  'again',
  'more',
  'most',
  'also',
  'about',
  'when',
  'where',
  'what',
  'then',
  'there',
  'were',
  'been',
  'through',
  'while',
  'over',
  'because',
]);

// Minimal deterministic cleanup used when the model is unavailable.
const basicPolishFallback = (draft: string) =>
  draft
    .replace(/\bdears\b/gi, 'deer')
    .replace(/\bamasing\b/gi, 'amazing')
    .replace(/\bdidnt\b/gi, "didn't")
    .replace(/\bi\b/g, 'I')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();

// Separates an optional markdown heading from the draft body.
const extractDraftBody = (draft: string) => {
  const lines = draft.split('\n');
  const headerIndex = lines.findIndex((line) => JOURNAL_LINE_PATTERN.test(line.trim()));

  if (headerIndex === -1) {
    return {
      heading: '',
      body: draft.trim(),
    };
  }

  const heading = lines[headerIndex].trim();
  const body = lines.slice(headerIndex + 1).join('\n').trim();

  return { heading, body };
};

// Reattaches the original heading after polishing only the body text.
const reconstructDraft = (heading: string, body: string) => {
  if (!heading) {
    return body;
  }

  return [heading, '', body].join('\n').trim();
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

const normalizeForCompare = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractKeywords = (value: string) =>
  normalizeForCompare(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

// Checks whether a polished candidate still includes a required user detail.
const mentionIsCovered = (candidate: string, mention: string) => {
  const candidateNorm = normalizeForCompare(candidate);
  const mentionNorm = normalizeForCompare(mention);

  if (!mentionNorm) {
    return true;
  }

  if (candidateNorm.includes(mentionNorm)) {
    return true;
  }

  const keywords = extractKeywords(mentionNorm);
  if (!keywords.length) {
    return true;
  }

  const matchedKeywords = keywords.filter((keyword) => candidateNorm.includes(keyword));
  return matchedKeywords.length >= Math.ceil(keywords.length * 0.6);
};

const countAwkwardPatterns = (candidate: string) => {
  const patterns = [
    /\bculture of the in\b/i,
    /\bin such a [A-Z][a-z]/,
    /\band and\b/i,
    /\bI want to to\b/i,
    /\b\d[\).:-]\s+/,
  ];

  return patterns.reduce((count, pattern) => count + (pattern.test(candidate) ? 1 : 0), 0);
};

const stripPolishWrapper = (value: string) =>
  value
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^here is (?:a|the) (?:polished|edited|revised).+?:\s*/i, '')
    .trim();

const stripHeadingFromBody = (value: string) => {
  const lines = stripPolishWrapper(value).split('\n');
  const headingIndex = lines.findIndex((line) => JOURNAL_LINE_PATTERN.test(line.trim()));

  if (headingIndex === -1) {
    return lines.join('\n').trim();
  }

  return lines.slice(headingIndex + 1).join('\n').trim();
};

// Scores candidate outputs so the route can reject model responses that drop
// required details or get less readable.
const scoreDraftCandidate = (candidateBody: string, originalBody: string, requiredMentions: string[]) => {
  const cleanCandidate = candidateBody.trim();
  if (!cleanCandidate) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;
  const awkwardCount = countAwkwardPatterns(cleanCandidate);
  score -= awkwardCount * 4;

  const originalLength = Math.max(1, originalBody.length);
  const ratio = cleanCandidate.length / originalLength;
  if (ratio >= 0.55 && ratio <= 1.5) {
    score += 2;
  } else {
    score -= 1.5;
  }

  const lines = cleanCandidate
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const punctuatedLines = lines.filter((line) => /[.!?]$/.test(line)).length;
  if (lines.length) {
    score += punctuatedLines / lines.length;
  }

  if (requiredMentions.length) {
    const covered = requiredMentions.filter((mention) => mentionIsCovered(cleanCandidate, mention)).length;
    score += covered * 3;
    score -= (requiredMentions.length - covered) * 2;
  }

  return score;
};

// Builds the user prompt with required details and the latest user note.
const buildPolishPrompt = (input: OpenAIPolishInput) => {
  const mentionBlock = input.requiredMentions.length
    ? `Required details that must stay in the final draft:\n${input.requiredMentions.map((item) => `- ${item}`).join('\n')}\n\n`
    : '';
  const userNoteBlock = input.lastUserInput ? `Latest user note:\n${input.lastUserInput}\n\n` : '';

  return `${mentionBlock}${userNoteBlock}Journal draft body:\n${input.body}`;
};

// Shared OpenAI text call for the polish prompts.
const callOpenAIText = async (params: {
  apiKey: string;
  model: string;
  developerPrompt: string;
  userPrompt: string;
}) => {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      input: [
        {
          role: 'developer',
          content: params.developerPrompt,
        },
        {
          role: 'user',
          content: params.userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as OpenAIResponsePayload;
  const text = extractOutputText(payload);

  return text ? stripHeadingFromBody(text) : null;
};

// Runs two polish prompts in parallel and keeps the better-scoring output.
const polishWithOpenAI = async (input: OpenAIPolishInput) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_POLISH_MODEL || 'gpt-5.2';

  if (!apiKey) {
    return {
      polishedBody: null,
      method: 'fallback' as const,
    };
  }

  const sharedPrompt = buildPolishPrompt(input);
  const primaryPrompt =
    'You are a careful copy editor for a travel journal app. Rewrite for grammar, punctuation, and clarity. Preserve all places, facts, and intent. Keep first-person voice. Do not drop required details. Return plain text only.';
  const secondaryPrompt =
    'You are a quality checker and editor. Rewrite this travel journal draft to sound natural and polished while preserving every specific detail from the user note. Keep concise, warm, and personal. Return plain text only.';

  const [primaryResult, secondaryResult] = await Promise.allSettled([
    callOpenAIText({
      apiKey,
      model,
      developerPrompt: primaryPrompt,
      userPrompt: sharedPrompt,
    }),
    callOpenAIText({
      apiKey,
      model,
      developerPrompt: secondaryPrompt,
      userPrompt: sharedPrompt,
    }),
  ]);

  const candidates = [primaryResult, secondaryResult]
    .filter((result): result is PromiseFulfilledResult<string | null> => result.status === 'fulfilled')
    .map((result) => result.value)
    .filter((value): value is string => Boolean(value?.trim()));

  if (!candidates.length) {
    return {
      polishedBody: null,
      method: 'fallback' as const,
    };
  }

  const scoredCandidates = candidates.map((candidateBody) => ({
    candidateBody,
    score: scoreDraftCandidate(candidateBody, input.body, input.requiredMentions),
  }));

  const best = scoredCandidates.sort((first, second) => second.score - first.score)[0];
  return {
    polishedBody: best?.candidateBody ?? null,
    method: 'openai-dual' as const,
  };
};

// Handles one polish request from the companion chat hook.
export async function POST(request: NextRequest) {
  const context = await getAuthenticatedRouteContext(request, 'AI polish');

  if (isRouteError(context)) {
    return context;
  }

  const rateLimitError = checkApiRateLimit('ai-polish', context.user.id);

  if (rateLimitError) {
    return rateLimitError;
  }

  const payload = await readJsonBody<PolishRequestPayload>(request, {
    maxBytes: 48 * 1024,
    errorMessage: 'Polish request is too large.',
  });

  if (isApiError(payload)) {
    return payload;
  }

  const draft = clampText(payload.draft, 12000);
  const lastUserInput = clampText(payload.lastUserInput, 3000);
  const requiredMentions = clampStringList(payload.requiredMentions, 8, 220);

  if (!draft) {
    return NextResponse.json({ success: false, error: 'Missing draft.' }, { status: 400 });
  }

  const { heading, body } = extractDraftBody(draft);
  const fallbackBody = basicPolishFallback(body);

  try {
    const polishResult = await polishWithOpenAI({
      body,
      lastUserInput,
      requiredMentions,
    });
    const polishedBody = polishResult.polishedBody ?? fallbackBody;

    return NextResponse.json({
      success: true,
      polishedDraft: reconstructDraft(heading, polishedBody),
      method: polishResult.polishedBody ? polishResult.method : 'fallback',
    });
  } catch {
    return NextResponse.json({
      success: true,
      polishedDraft: reconstructDraft(heading, fallbackBody),
      method: 'fallback',
    });
  }
}
