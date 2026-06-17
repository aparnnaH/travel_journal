'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompanionChatMessage, CompanionTravelContext } from '@/lib/ai/types';
import { createJournalEntry } from '@/lib/journalService';
import { polishJournalDraft } from '@/lib/ai/journalPolishService';
import {
  buildUserMessage,
  buildWelcomeMessage,
  generateCompanionReply,
  handleJournalEntryInteraction,
  type JournalDraftSession,
} from '@/services/ai/travelCompanionService';

type UseTravelCompanionChatInput = {
  context: CompanionTravelContext | null;
  userId?: string;
};

const applyPolishedDraftToResponse = (
  response: CompanionChatMessage,
  originalDraft: string,
  polishedDraft: string
) => {
  if (!originalDraft || !polishedDraft || originalDraft === polishedDraft) {
    return response;
  }

  if (response.content.includes(originalDraft)) {
    return {
      ...response,
      content: response.content.replace(originalDraft, polishedDraft),
    };
  }

  return {
    ...response,
    content: `${response.content}\n\nPolished version:\n\n${polishedDraft}`,
  };
};

const getRequiredMentions = (session: JournalDraftSession | null) => {
  if (!session?.personalDetails) {
    return [];
  }

  const fields = [
    session.personalDetails.mood,
    session.personalDetails.highlight,
    session.personalDetails.sensory,
    session.personalDetails.reflection,
    session.personalDetails.futurePlan,
  ];

  return fields.map((value) => String(value ?? '').trim()).filter(Boolean);
};

const normalizeForCompare = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const splitDraftHeadingAndBody = (draft: string) => {
  const lines = draft.split('\n');
  const headingIndex = lines.findIndex((line) => /^###\s+/i.test(line.trim()));

  if (headingIndex === -1) {
    return {
      heading: '',
      body: draft.trim(),
    };
  }

  return {
    heading: lines[headingIndex].trim(),
    body: lines.slice(headingIndex + 1).join('\n').trim(),
  };
};

const toJournalMood = (value: string) => {
  const normalized = value.toLowerCase().trim();
  if (normalized.includes('excite')) {
    return 'excited';
  }
  if (normalized.includes('peace')) {
    return 'peaceful';
  }
  if (normalized.includes('nostalg')) {
    return 'nostalgic';
  }
  if (normalized.includes('happy') || normalized.includes('fun')) {
    return 'happy';
  }

  return 'reflective';
};

const buildAssistantMessage = (content: string): CompanionChatMessage => ({
  id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role: 'assistant',
  content,
  createdAt: new Date().toISOString(),
  intent: 'journal-entry',
});

export function useTravelCompanionChat({ context, userId }: UseTravelCompanionChatInput) {
  const [messages, setMessages] = useState<CompanionChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSavingJournalDraft, setIsSavingJournalDraft] = useState(false);
  const [journalSession, setJournalSession] = useState<JournalDraftSession | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!context || initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: buildWelcomeMessage(context),
        createdAt: new Date().toISOString(),
        intent: 'general',
      },
    ]);
  }, [context]);

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      if (!context) {
        return;
      }

      const cleanMessage = rawMessage.trim();

      if (!cleanMessage || isThinking) {
        return;
      }

      setMessages((current) => [...current, buildUserMessage(cleanMessage)]);
      setIsThinking(true);

      await new Promise((resolve) => setTimeout(resolve, 320));

      const journalInteraction = handleJournalEntryInteraction(cleanMessage, context, journalSession);
      if (journalInteraction.handled && journalInteraction.response) {
        const journalResponse = journalInteraction.response;
        const journalDraft = journalInteraction.nextSession?.lastDraft ?? '';
        const polishedDraft = journalDraft
          ? await polishJournalDraft(journalDraft, {
              lastUserInput: cleanMessage,
              requiredMentions: getRequiredMentions(journalInteraction.nextSession ?? null),
            })
          : journalDraft;
        const nextResponse = applyPolishedDraftToResponse(journalResponse, journalDraft, polishedDraft);

        setMessages((current) => [...current, nextResponse]);
        setJournalSession(
          journalInteraction.nextSession
            ? {
                ...journalInteraction.nextSession,
                lastDraft: polishedDraft || journalInteraction.nextSession.lastDraft,
              }
            : null
        );
        setIsThinking(false);
        return;
      }

      const response = generateCompanionReply(cleanMessage, context);
      setMessages((current) => [...current, response]);
      setIsThinking(false);
    },
    [context, isThinking, journalSession]
  );

  const sendPrompt = useCallback(
    (prompt: string) => {
      void sendMessage(prompt);
    },
    [sendMessage]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setJournalSession(null);
    initializedRef.current = true;
  }, []);

  const saveJournalDraft = useCallback(async () => {
    if (!context || !userId || !journalSession?.lastDraft) {
      setMessages((current) => [
        ...current,
        buildAssistantMessage('I could not save that yet. Generate a journal draft first, then tap save.'),
      ]);
      return;
    }

    const { heading, body } = splitDraftHeadingAndBody(journalSession.lastDraft);
    if (!body) {
      setMessages((current) => [
        ...current,
        buildAssistantMessage('I could not find journal content to save. Try generating the draft again.'),
      ]);
      return;
    }

    const countryIndex = context.visitedCountryNames.findIndex(
      (name) => normalizeForCompare(name) === normalizeForCompare(journalSession.countryName)
    );
    const countryId = countryIndex >= 0 ? context.visitedCountryIds[countryIndex] : journalSession.countryName;
    const title = heading
      ? heading.replace(/^###\s*/i, '').replace(/\s+Journal Draft\s*$/i, ' Journal Entry').trim()
      : `${journalSession.countryName} Journal Entry`;
    const mood = toJournalMood(journalSession.personalDetails?.mood || context.topMoods[0] || 'reflective');
    const tags = Array.from(
      new Set(
        [journalSession.countryName, ...journalSession.places.slice(0, 4), 'ai-companion']
          .map((item) => item.toLowerCase().trim())
          .filter(Boolean)
      )
    );

    setIsSavingJournalDraft(true);

    try {
      const result = await createJournalEntry({
        userId,
        countryId,
        title,
        content: body,
        mood,
        tags,
      });

      if (!result.success) {
        setMessages((current) => [
          ...current,
          buildAssistantMessage(`I could not save this entry yet: ${result.error || 'Unknown error.'}`),
        ]);
        return;
      }

      setMessages((current) => [
        ...current,
        buildAssistantMessage(`Saved. "${title}" is now in your journal entries.`),
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        buildAssistantMessage('I hit a save issue. Please try again in a moment.'),
      ]);
    } finally {
      setIsSavingJournalDraft(false);
    }
  }, [context, journalSession, userId]);

  return {
    messages,
    isThinking,
    isSavingJournalDraft,
    canSaveJournalDraft: Boolean(journalSession?.lastDraft && userId),
    sendMessage,
    sendPrompt,
    clearChat,
    saveJournalDraft,
  };
}
