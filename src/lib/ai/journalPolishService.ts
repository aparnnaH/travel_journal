type PolishJournalDraftOptions = {
  lastUserInput?: string;
  requiredMentions?: string[];
};

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
