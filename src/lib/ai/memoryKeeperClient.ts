import {
  createMemoryKeeperTemplate,
  type MemoryKeeperQuickAction,
  type MemoryKeeperTripContext,
} from '@/services/memoryKeeperService';

type MemoryKeeperResponsePayload = {
  success?: boolean;
  result?: string;
  method?: string;
};

export type AskMemoryKeeperInput = {
  action: MemoryKeeperQuickAction;
  context: MemoryKeeperTripContext;
  selectedText?: string;
};

export type AskMemoryKeeperResult = {
  result: string;
  method: 'ai' | 'template';
};

export const askMemoryKeeper = async ({
  action,
  context,
  selectedText,
}: AskMemoryKeeperInput): Promise<AskMemoryKeeperResult> => {
  const fallback = createMemoryKeeperTemplate(action, context, selectedText);

  try {
    const response = await fetch('/api/ai/memory-keeper', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        context,
        selectedText,
      }),
    });

    if (!response.ok) {
      return {
        result: fallback,
        method: 'template',
      };
    }

    const payload = (await response.json()) as MemoryKeeperResponsePayload;
    const result = typeof payload.result === 'string' ? payload.result.trim() : '';

    if (!payload.success || !result) {
      return {
        result: fallback,
        method: 'template',
      };
    }

    return {
      result,
      method: payload.method === 'ai' ? 'ai' : 'template',
    };
  } catch {
    return {
      result: fallback,
      method: 'template',
    };
  }
};
