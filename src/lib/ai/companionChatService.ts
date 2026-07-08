// Client-side service for smart companion replies.
// It condenses the large in-memory travel context into a bounded archive snapshot
// before sending it to the server AI route.
import type { CompanionArchiveSnapshot, CompanionChatMessage, CompanionTravelContext } from '@/lib/ai/types';

type SmartCompanionRequest = {
  message: string;
  context: CompanionTravelContext;
  history: CompanionChatMessage[];
  activeJournalDraft?: {
    countryName: string;
    places: string[];
    draft: string;
  } | null;
};

// Keeps prompt payloads small enough for the server model request.
const trimText = (value: string, maxLength: number) => {
  const clean = value.replace(/\s+/g, ' ').trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength - 1).trim()}…`;
};

// De-duplicates lists before they become prompt context.
const uniqueList = (items: string[], limit: number) =>
  Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, limit);

// Builds the server-safe summary of the user's travel archive.
const buildArchiveSnapshot = (context: CompanionTravelContext): CompanionArchiveSnapshot => {
  const countryNameById = new Map(
    context.visitedCountryIds.map((countryId, index) => [countryId, context.visitedCountryNames[index] || countryId])
  );

  return {
    counts: {
      journalEntries: context.journalEntries.length,
      scrapbookPages: context.scrapbookPages.length,
      importedTrips: context.importedTrips.length,
      visitedCountries: context.visitedCountryIds.length,
      passportStamps: context.passportStamps.length,
    },
    visitedCountryNames: uniqueList(context.visitedCountryNames, 40),
    topTags: context.topTags.slice(0, 8),
    topMoods: context.topMoods.slice(0, 6),
    personality: context.personality,
    tripSummary: context.tripSummary,
    recentJournalEntries: context.journalEntries.slice(0, 8).map((entry) => ({
      title: entry.title,
      country: entry.countryName || countryNameById.get(entry.countryId) || entry.countryId,
      mood: String(entry.mood),
      tags: entry.tags.slice(0, 8),
      excerpt: trimText(entry.content, 420),
    })),
    recentMemories: context.memoryPool.slice(0, 10).map((memory) => ({
      title: memory.title,
      source: memory.source,
      detail: trimText(memory.detail, 360),
      countryHint: memory.countryHint,
    })),
    importedTripSummaries: context.importedTrips.slice(0, 6).map((trip) => ({
      title: trip.title,
      summary: trimText(trip.summary, 420),
      locations: trip.locationNames.slice(0, 12),
      tags: trip.tags.slice(0, 8),
    })),
    passportStamps: context.passportStamps.slice(0, 30).map((stamp) => ({
      countryName: stamp.countryName,
      region: stamp.region,
    })),
  };
};

// Calls /api/ai/companion and returns null when the smart backend is unavailable
// so the chat hook can fall back to local responses.
export async function generateSmartCompanionReply({
  message,
  context,
  history,
  activeJournalDraft,
}: SmartCompanionRequest) {
  const cleanMessage = message.trim();

  if (!cleanMessage) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch('/api/ai/companion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        message: cleanMessage,
        archive: buildArchiveSnapshot(context),
        activeJournalDraft: activeJournalDraft
          ? {
              countryName: activeJournalDraft.countryName,
              places: activeJournalDraft.places.slice(0, 10),
              draft: trimText(activeJournalDraft.draft, 2200),
            }
          : null,
        history: history.slice(-8).map((item) => ({
          role: item.role,
          content: trimText(item.content, 700),
        })),
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      reply?: string;
    };

    return payload.success && payload.reply ? payload.reply.trim() || null : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
