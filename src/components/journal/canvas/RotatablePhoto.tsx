'use client';

// Visual renderer for a photo scrapbook item.
// It displays the uploaded image, preserves the "paper photo" treatment, and
// exposes the caption field without owning the full canvas state.
import React from 'react';
import Image from 'next/image';
import type { ScrapbookPhotoItem } from '@/lib/canvas/scrapbook';

type RotatablePhotoProps = {
  item: ScrapbookPhotoItem;
  selected: boolean;
  onCaptionChange: (itemId: string, caption: string) => void;
};

// Renders the photo content inside the positioned canvas wrapper. Caption edits
// flow upward so the scrapbook model remains the single source of truth.
export default function RotatablePhoto({ item, selected, onCaptionChange }: RotatablePhotoProps) {
  // Reserve room for the caption strip so resizing a photo does not cause the
  // image area to collapse below a usable minimum height.
  const mediaHeight = Math.max(90, item.height - 58);

  return (
    <div
      className={[
        'relative border bg-white p-2 pb-9 shadow-[0_18px_40px_rgba(61,43,14,0.18)]',
        selected ? 'border-gold-deep' : 'border-ink/10',
      ].join(' ')}
    >
      <span className="pointer-events-none absolute -top-3 left-6 h-6 w-16 rotate-[-6deg] bg-[#f1d99e]/80 shadow-soft" />
      <div className="relative w-full bg-cream" style={{ height: mediaHeight }}>
        <Image src={item.src} alt={item.alt} fill sizes={`${Math.max(1, item.width - 16)}px`} unoptimized className="object-cover" />
      </div>
      <input
        aria-label="Photo caption"
        value={item.caption}
        onChange={(event) => onCaptionChange(item.id, event.target.value)}
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute inset-x-3 bottom-2 bg-transparent text-center font-script text-lg text-ink outline-none"
      />
    </div>
  );
}
