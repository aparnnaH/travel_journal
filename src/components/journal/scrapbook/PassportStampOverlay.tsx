'use client';

// Decorative stamp overlay used by scrapbook sticker items.
// This keeps stamp-specific styling separate from the generic sticker renderer.
type PassportStampOverlayProps = {
  label: string;
  color: string;
};

// Renders a label inside a dashed circular border so passport-style decorations
// read differently from pins, tape, tickets, and paper notes.
export default function PassportStampOverlay({ label, color }: PassportStampOverlayProps) {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed bg-white/25 p-2 text-center font-serif text-xs font-bold uppercase leading-tight tracking-wide text-ink/75 shadow-soft"
      style={{ borderColor: color, color: '#3D2B0E' }}
    >
      <span className="rounded-full border border-current px-3 py-2">{label || 'Passport'}</span>
    </div>
  );
}
