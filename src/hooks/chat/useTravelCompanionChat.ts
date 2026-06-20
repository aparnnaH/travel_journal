'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompanionChatMessage, CompanionTravelContext } from '@/lib/ai/types';
import { createJournalEntry } from '@/lib/journalService';
import { generateSmartCompanionReply } from '@/lib/ai/companionChatService';
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

const hasWritingSupportRequest = (message: string) => {
  const normalized = normalizeForCompare(message);

  if (!normalized) {
    return false;
  }

  return (
    /\b(?:grammar|grammer|spelling|punctuation|proofread|proof read|edit|polish|rewrite|reword|fix)\b/.test(normalized) ||
    /\b(?:write|writing|caption|draft|journal|entry|story|paragraph|sentence|summarize|summary)\b/.test(normalized) ||
    /\b(?:sound better|make better|more descriptive|make descriptive|turn into|help me say)\b/.test(normalized)
  );
};

const polishWritingResponse = async (
  message: string,
  responseContent: string,
  activeSession: JournalDraftSession | null
) => {
  if (!hasWritingSupportRequest(message)) {
    return responseContent;
  }

  return polishJournalDraft(responseContent, {
    lastUserInput: message,
    requiredMentions: getRequiredMentions(activeSession),
  });
};

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

const extractJournalDraftFromReply = (reply: string) => {
  const lines = reply.split('\n');
  const headingIndex = lines.findIndex((line) => /^###\s+.+?\s+Journal Draft\s*$/i.test(line.trim()));

  if (headingIndex === -1) {
    return null;
  }

  const endIndex = lines.findIndex((line, index) => {
    if (index <= headingIndex + 1) {
      return false;
    }

    return /^(?:next step|follow-up|if you want|want me|i used|archive signals|you can)\b/i.test(line.trim());
  });

  return lines.slice(headingIndex, endIndex === -1 ? lines.length : endIndex).join('\n').trim();
};

const buildJournalSessionFromSmartReply = (
  reply: string,
  activeSession: JournalDraftSession | null
): JournalDraftSession | null => {
  const draft = extractJournalDraftFromReply(reply);

  if (!draft) {
    return activeSession;
  }

  const countryName = draft.match(/^###\s+(.+?)\s+Journal Draft\s*$/im)?.[1]?.trim();

  return {
    countryName: countryName || activeSession?.countryName || 'Travel',
    places: activeSession?.places ?? [],
    personalDetails: activeSession?.personalDetails ?? {},
    lastDraft: draft,
  };
};

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

      const userMessage = buildUserMessage(cleanMessage);
      const nextHistory = [...messages, userMessage];

      setMessages(nextHistory);
      setIsThinking(true);

      await new Promise((resolve) => setTimeout(resolve, 320));

      const fallbackResponse = generateCompanionReply(cleanMessage, context);
      const smartReply = await generateSmartCompanionReply({
        message: cleanMessage,
        context,
        history: nextHistory,
        activeJournalDraft: journalSession
          ? {
              countryName: journalSession.countryName,
              places: journalSession.places,
              draft: journalSession.lastDraft,
            }
          : null,
      });

      if (smartReply) {
        const polishedSmartReply = await polishWritingResponse(cleanMessage, smartReply, journalSession);

        setMessages((current) => [
          ...current,
          {
            ...fallbackResponse,
            content: polishedSmartReply,
          },
        ]);
        setJournalSession(buildJournalSessionFromSmartReply(polishedSmartReply, journalSession));
        setIsThinking(false);
        return;
      }

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

      const polishedFallbackContent = await polishWritingResponse(cleanMessage, fallbackResponse.content, journalSession);
      setMessages((current) => [
        ...current,
        {
          ...fallbackResponse,
          content: polishedFallbackContent,
        },
      ]);
      setIsThinking(false);
    },
    [context, isThinking, journalSession, messages]
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
