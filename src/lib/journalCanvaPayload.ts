export type JournalCanvaPayload = {
  designId?: string | null;
  designTitle?: string | null;
  designEditUrl?: string | null;
  pages?: string[];
  coverPhoto?: string | null;
  coverPageIndex?: number | null;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  insertedPhotos?: Array<{
    id: string;
    src: string;
    alt: string;
    caption?: string;
  }>;
};

const CANVA_PAYLOAD_START = '\n\n<!--travel-journal-canva:';
const CANVA_PAYLOAD_END = ':travel-journal-canva-->';

export function encodeJournalContentWithCanva(content: string, canva: JournalCanvaPayload) {
  return `${content.trimEnd()}${CANVA_PAYLOAD_START}${JSON.stringify(canva)}${CANVA_PAYLOAD_END}`;
}

export function decodeJournalContentWithCanva(content: string) {
  const startIndex = content.lastIndexOf(CANVA_PAYLOAD_START);

  if (startIndex === -1) {
    return {
      content,
      canva: null,
    };
  }

  const payloadStartIndex = startIndex + CANVA_PAYLOAD_START.length;
  const endIndex = content.indexOf(CANVA_PAYLOAD_END, payloadStartIndex);

  if (endIndex === -1) {
    return {
      content,
      canva: null,
    };
  }

  try {
    const canva = JSON.parse(content.slice(payloadStartIndex, endIndex)) as JournalCanvaPayload;
    return {
      content: content.slice(0, startIndex).trimEnd(),
      canva,
    };
  } catch {
    return {
      content,
      canva: null,
    };
  }
}
