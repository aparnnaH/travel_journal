'use client';

import React, { useEffect, useRef, useState } from 'react';
import Moveable from 'react-moveable';
import { useDroppable } from '@dnd-kit/core';
import type {
  DrawingStroke,
  ScrapbookItem,
  ScrapbookNoteItem,
  ScrapbookPhotoItem,
  ScrapbookTheme,
} from '@/lib/canvas/scrapbook';
import { BOARD_HEIGHT, MIN_NOTE_HEIGHT, MIN_NOTE_WIDTH, MIN_PHOTO_WIDTH } from '@/lib/canvas/scrapbook';
import DraggableMemoryCard from './DraggableMemoryCard';
import RotatablePhoto from './RotatablePhoto';
import StickerLayer from '../scrapbook/StickerLayer';

type ScrapbookCanvasProps = {
  boardWidth: number;
  currentTheme: ScrapbookTheme;
  drawingMode: boolean;
  drawings: DrawingStroke[];
  hasPageContent: boolean;
  items: ScrapbookItem[];
  selectedItemId: string | null;
  draggingItemId?: string | null;
  setBoardNode: (node: HTMLDivElement | null) => void;
  onBoardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPhotoDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onItemPointerDown: (event: React.PointerEvent<HTMLDivElement>, item: ScrapbookItem) => void;
  onItemKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, itemId: string) => void;
  onCaptionChange: (itemId: string, caption: string) => void;
  onNoteChange: (itemId: string, text: string) => void;
  onResizeStart: (event: React.PointerEvent<HTMLButtonElement>, item: ScrapbookPhotoItem | ScrapbookNoteItem) => void;
  onRotateStart: (event: React.PointerEvent<HTMLButtonElement>, item: ScrapbookItem) => void;
  onMoveableResize: (itemId: string, width: number, height: number) => void;
  onMoveableRotate: (itemId: string, rotation: number) => void;
};

function MemoryNote({
  item,
  selected,
  onNoteChange,
}: {
  item: ScrapbookNoteItem;
  selected: boolean;
  onNoteChange: (itemId: string, text: string) => void;
}) {
  return (
    <div
      className={[
        'flex h-full min-h-0 flex-col overflow-hidden border p-3 shadow-soft',
        selected ? 'border-gold-deep' : 'border-ink/10',
      ].join(' ')}
      style={{ backgroundColor: item.color }}
    >
      <div className="mb-2 h-3 w-12 shrink-0 bg-white/55" />
      <textarea
        aria-label="Note text"
        value={item.text}
        onChange={(event) => onNoteChange(item.id, event.target.value)}
        onPointerDown={(event) => event.stopPropagation()}
        placeholder="Memory..."
        className="min-h-0 flex-1 w-full resize-none bg-transparent font-script text-2xl leading-7 text-ink outline-none placeholder:text-ink/35"
      />
    </div>
  );
}

export default function ScrapbookCanvas({
  boardWidth,
  currentTheme,
  drawingMode,
  drawings,
  hasPageContent,
  items,
  selectedItemId,
  draggingItemId,
  setBoardNode,
  onBoardPointerDown,
  onPointerMove,
  onPointerUp,
  onPhotoDrop,
  onItemPointerDown,
  onItemKeyDown,
  onCaptionChange,
  onNoteChange,
  onResizeStart,
  onRotateStart,
  onMoveableResize,
  onMoveableRotate,
}: ScrapbookCanvasProps) {
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectedTarget, setSelectedTarget] = useState<HTMLElement | null>(null);
  const { setNodeRef, isOver } = useDroppable({ id: 'scrapbook-canvas-dropzone' });
  const selectedItem = items.find((item) => item.id === selectedItemId) || null;

  useEffect(() => {
    setSelectedTarget(selectedItemId ? itemRefs.current[selectedItemId] || null : null);
  }, [items, selectedItemId]);

  const setCanvasNode = (node: HTMLDivElement | null) => {
    setBoardNode(node);
    setNodeRef(node);
  };

  return (
    <div
      ref={setCanvasNode}
      className={[
        'relative h-[620px] overflow-hidden rounded-lg border border-gold/30 shadow-inner touch-none',
        drawingMode ? 'cursor-crosshair' : '',
        isOver ? 'ring-2 ring-gold/60' : '',
      ].join(' ')}
      style={{
        backgroundColor: currentTheme.backgroundColor,
        backgroundImage: currentTheme.backgroundImage,
        backgroundSize: currentTheme.backgroundSize,
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onPhotoDrop}
      onPointerDown={onBoardPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.42),transparent_18%),radial-gradient(circle_at_82%_8%,rgba(61,43,14,0.08),transparent_16%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-45 mix-blend-multiply [background-image:repeating-linear-gradient(110deg,rgba(61,43,14,0.06)_0_1px,transparent_1px_7px)]" />

      {!hasPageContent ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-ink/45">
          <p className="max-w-sm text-lg">Drop photos here.</p>
        </div>
      ) : null}

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${boardWidth} ${BOARD_HEIGHT}`}
        preserveAspectRatio="none"
      >
        {drawings.map((stroke) => (
          <polyline
            key={stroke.id}
            points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={stroke.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={stroke.width}
          />
        ))}
      </svg>

      {items.map((item) => (
        <DraggableMemoryCard
          key={item.id}
          item={item}
          selected={selectedItemId === item.id}
          drawingMode={drawingMode}
          isDragging={draggingItemId === item.id}
          setNodeRef={(node) => {
            itemRefs.current[item.id] = node;
          }}
          onPointerDown={onItemPointerDown}
          onKeyDown={onItemKeyDown}
        >
          {item.type === 'photo' ? (
            <RotatablePhoto item={item} selected={selectedItemId === item.id} onCaptionChange={onCaptionChange} />
          ) : item.type === 'note' ? (
            <MemoryNote item={item} selected={selectedItemId === item.id} onNoteChange={onNoteChange} />
          ) : (
            <StickerLayer item={item} />
          )}
          {selectedItemId === item.id ? (
            <>
              <button
                type="button"
                aria-label="Rotate piece"
                className="absolute -top-7 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border border-gold/30 bg-white text-xs font-bold text-ink shadow-soft"
                onPointerDown={(event) => onRotateStart(event, item)}
              >
                R
              </button>
              {item.type === 'photo' || item.type === 'note' ? (
                <button
                  type="button"
                  aria-label={item.type === 'photo' ? 'Resize photo' : 'Resize note'}
                  className="absolute -bottom-3 -right-3 h-7 w-7 rounded-full border border-gold/30 bg-white text-xs font-bold text-ink shadow-soft"
                  onPointerDown={(event) => onResizeStart(event, item)}
                >
                  +
                </button>
              ) : null}
            </>
          ) : null}
        </DraggableMemoryCard>
      ))}

      {selectedTarget && selectedItem ? (
        <Moveable
          target={selectedTarget}
          origin={false}
          edge={false}
          draggable={false}
          resizable={selectedItem.type === 'photo' || selectedItem.type === 'note'}
          rotatable
          throttleResize={1}
          throttleRotate={1}
          keepRatio={selectedItem.type === 'photo'}
          renderDirections={selectedItem.type === 'photo' ? ['se'] : selectedItem.type === 'note' ? ['e', 's', 'se'] : []}
          onResize={(event) => {
            const width = Math.max(selectedItem.type === 'note' ? MIN_NOTE_WIDTH : MIN_PHOTO_WIDTH, event.width);
            const height = Math.max(selectedItem.type === 'note' ? MIN_NOTE_HEIGHT : 90, event.height);
            event.target.style.width = `${width}px`;
            event.target.style.height = `${height}px`;
            onMoveableResize(selectedItem.id, width, height);
          }}
          onRotate={(event) => {
            onMoveableRotate(selectedItem.id, Math.round(event.beforeRotate));
          }}
        />
      ) : null}
    </div>
  );
}
