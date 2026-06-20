// Server route for AI-assisted Memory Keeper prompts.
// The journal UI can use deterministic local templates, while this route adds
// optional OpenAI generation when configured.
import { NextRequest, NextResponse } from 'next/server';
import {
  buildMemoryKeeperPromptInput,
  createMemoryKeeperTemplate,
  isMemoryKeeperCreativeAction,
  type MemoryKeeperTripContext,
} from '@/services/memoryKeeperService';

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

type MemoryKeeperRequestPayload = {
  action?: string;
  context?: MemoryKeeperTripContext;
  selectedText?: string;
};

export const runtime = 'nodejs';

// Removes common model wrapper phrases so UI receives clean prose.
const stripResponseWrapper = (value: string) =>
  value
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^here is .+?:\s*/i, '')
    .trim();

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

// Validates that the request includes enough trip context to generate useful output.
const hasTripContext = (context: MemoryKeeperTripContext | undefined): context is MemoryKeeperTripContext =>
  Boolean(context && typeof context.tripName === 'string');

// Calls OpenAI for one memory-focused response.
const callOpenAIText = async (params: {
  apiKey: string;
  model: string;
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
          content:
            'You are Memory Keeper, a gentle travel companion inside a scrapbook-style travel journal. Only help with creative writing tasks: grammar, rewriting, captions, expanding notes, reflective prompts, journal entries, and memory summaries. Do not answer app help, setup, navigation, account, or how-to questions. Use the trip context, preserve facts, keep the tone warm and nostalgic, and return plain text only. For trip summaries, write a concise 3 to 5 line recap with themes and highlights; do not dump the raw itinerary, repeat day headers, or include app-building instructions.',
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

  return text ? stripResponseWrapper(text) : null;
};

// Handles one Memory Keeper generation request.
export async function POST(request: NextRequest) {
  const payload = (await request.json()) as MemoryKeeperRequestPayload;
  const action = String(payload.action ?? '');
  const selectedText = String(payload.selectedText ?? '').trim();

  if (!isMemoryKeeperCreativeAction(action)) {
    return NextResponse.json({ success: false, error: 'Unsupported memory action.' }, { status: 400 });
  }

  if (!hasTripContext(payload.context)) {
    return NextResponse.json({ success: false, error: 'Missing trip context.' }, { status: 400 });
  }

  const fallback = createMemoryKeeperTemplate(action, payload.context, selectedText);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MEMORY_KEEPER_MODEL || process.env.OPENAI_COMPANION_MODEL || process.env.OPENAI_POLISH_MODEL || 'gpt-5.2';

  if (!apiKey) {
    return NextResponse.json({
      success: true,
      result: fallback,
      method: 'template',
    });
  }

  try {
    const result = await callOpenAIText({
      apiKey,
      model,
      userPrompt: buildMemoryKeeperPromptInput(action, payload.context, selectedText),
    });

    return NextResponse.json({
      success: true,
      result: result || fallback,
      method: result ? 'ai' : 'template',
    });
  } catch {
    return NextResponse.json({
      success: true,
      result: fallback,
      method: 'template',
    });
  }
}
