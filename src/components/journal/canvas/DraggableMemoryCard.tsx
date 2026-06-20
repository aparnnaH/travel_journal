'use client';

// Motion-enabled wrapper for one scrapbook canvas item.
// The parent canvas supplies drag/selection behavior while this component keeps
// the shared positioning and animation style consistent across item types.
import React from 'react';
import { motion } from 'framer-motion';
import type { ScrapbookItem } from '@/lib/canvas/scrapbook';
import { getScrapbookItemLabel } from '@/lib/canvas/scrapbook';

type DraggableMemoryCardProps = {
  item: ScrapbookItem;
  selected: boolean;
  drawingMode: boolean;
  isDragging: boolean;
  children: React.ReactNode;
  setNodeRef: (node: HTMLDivElement | null) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>, item: ScrapbookItem) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, itemId: string) => void;
};

// Places an item absolutely on the scrapbook canvas and delegates input events
// back to the canvas controller. Framer Motion handles the small selection and
// hover transitions without changing the saved scrapbook coordinates.
export default function DraggableMemoryCard({
  item,
  selected,
  drawingMode,
  isDragging,
  children,
  setNodeRef,
  onPointerDown,
  onKeyDown,
}: DraggableMemoryCardProps) {
  return (
    <motion.div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      aria-label={getScrapbookItemLabel(item)}
      className={[
        'absolute select-none outline-none will-change-transform',
        drawingMode ? '' : isDragging ? 'cursor-grabbing' : 'cursor-grab',
        selected ? 'drop-shadow-2xl' : 'drop-shadow-md',
      ].join(' ')}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex,
        transformOrigin: 'center center',
      }}
      animate={{
        rotate: item.rotation,
        scale: selected ? 1.018 : 1,
      }}
      whileHover={drawingMode ? undefined : { y: -2, scale: selected ? 1.025 : 1.012 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
      onPointerDown={(event) => onPointerDown(event, item)}
      onKeyDown={(event) => onKeyDown(event, item.id)}
    >
      {children}
    </motion.div>
  );
}
