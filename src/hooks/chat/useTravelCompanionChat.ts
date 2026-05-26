'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompanionChatMessage, CompanionTravelContext } from '@/lib/ai/types';
import {
  buildUserMessage,
  buildWelcomeMessage,
  generateCompanionReply,
} from '@/services/ai/travelCompanionService';

type UseTravelCompanionChatInput = {
  context: CompanionTravelContext | null;
};

export function useTravelCompanionChat({ context }: UseTravelCompanionChatInput) {
  const [messages, setMessages] = useState<CompanionChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
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

      const response = generateCompanionReply(cleanMessage, context);
      setMessages((current) => [...current, response]);
      setIsThinking(false);
    },
    [context, isThinking]
  );

  const sendPrompt = useCallback(
    (prompt: string) => {
      void sendMessage(prompt);
    },
    [sendMessage]
  );

  return {
    messages,
    isThinking,
    sendMessage,
    sendPrompt,
  };
}
