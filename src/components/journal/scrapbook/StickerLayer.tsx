'use client';

// Visual renderer for scrapbook decoration items.
// The scrapbook model stores generic decoration kinds, and this component maps
// those kinds to the small visual treatments shown on the canvas.
import type { ScrapbookDecorationItem } from '@/lib/canvas/scrapbook';
import PassportStampOverlay from './PassportStampOverlay';

type StickerLayerProps = {
  item: ScrapbookDecorationItem;
};

// Renders stickers, pins, tickets, tape, and paper notes from the same saved
// decoration shape so the canvas can position all decoration types uniformly.
export default function StickerLayer({ item }: StickerLayerProps) {
  // Passport stickers get a richer circular overlay; the other kinds use the
  // shared block renderer below with kind-specific classes.
  if (item.kind === 'sticker') {
    return <PassportStampOverlay label={item.label} color={item.color} />;
  }

  return (
    <div
      className={[
        'flex h-full w-full items-center justify-center border text-sm font-semibold uppercase tracking-wide text-ink/75',
        item.kind === 'pin' ? 'rounded-full border-ink/20 shadow-md-soft' : '',
        item.kind === 'ticket' ? 'border-dashed bg-white/70' : '',
        item.kind === 'tape' ? 'border-white/50 opacity-80' : '',
        item.kind === 'paper' ? 'border-ink/10 shadow-soft' : '',
      ].join(' ')}
      style={{ backgroundColor: item.color }}
    >
      {item.label}
    </div>
  );
}
