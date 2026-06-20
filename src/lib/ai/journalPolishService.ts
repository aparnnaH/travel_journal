// Client-side wrapper for journal draft polishing.
// It is intentionally tolerant: if the server/model fails, the original draft is
// returned so writing flows never break.
type PolishJournalDraftOptions = {
  lastUserInput?: string;
  requiredMentions?: string[];
};

// Sends a draft to the polish endpoint and falls back to the original text.
export async function polishJournalDraft(draft: string, options?: PolishJournalDraftOptions) {
  const cleanDraft = draft.trim();

  if (!cleanDraft) {
    return cleanDraft;
  }

  try {
    const response = await fetch('/api/ai/polish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        draft: cleanDraft,
        lastUserInput: options?.lastUserInput,
        requiredMentions: options?.requiredMentions ?? [],
      }),
    });

    if (!response.ok) {
      return cleanDraft;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      polishedDraft?: string;
    };

    if (!payload.success || !payload.polishedDraft) {
      return cleanDraft;
    }

    return payload.polishedDraft.trim() || cleanDraft;
  } catch {
    return cleanDraft;
  }
}
