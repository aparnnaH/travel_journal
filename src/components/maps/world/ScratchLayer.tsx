'use client';

import React, { useRef, useState } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';

interface ScratchLayerProps {
  width: number;
  height: number;
  onScratchReveal: (countryId: string) => void;
}

export default function ScratchLayer({ width, height, onScratchReveal }: ScratchLayerProps) {
  const [lines, setLines] = useState<any[]>([]);
  const isDrawing = useRef(false);

  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { points: [pos.x, pos.y], strokeWidth: 36 }]);
    checkNearbyMarkers(pos.x, pos.y, onScratchReveal);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (!point) return;
    const lastIndex = lines.length - 1;
    const newLines = lines.slice();
    const lastLine = newLines[lastIndex];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    setLines(newLines);
    checkNearbyMarkers(point.x, point.y, onScratchReveal);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  function checkNearbyMarkers(x: number, y: number, reveal: (id: string) => void) {
    try {
      const markers = document.querySelectorAll('[data-marker-id]');
      markers.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        // Stage coords are relative to the map container; convert by finding container
        const stageEl = document.querySelector('.world-map-scratch-root');
        if (!stageEl) return;
        const stageRect = stageEl.getBoundingClientRect();
        const relX = stageRect.left + x;
        const relY = stageRect.top + y;
        const dx = relX - cx;
        const dy = relY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
          const id = el.getAttribute('data-marker-id');
          if (id) reveal(id);
        }
      });
    } catch (err) {}
  }

  return (
    <div className="pointer-events-auto absolute left-4 top-4" style={{ width, height }}>
      <div className="world-map-scratch-root" style={{ position: 'relative', width, height }}>
        <Stage
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
        >
          <Layer>
            <Rect x={0} y={0} width={width} height={height} fill="#0b0b0b" />
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation="destination-out"
                stroke="black"
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
