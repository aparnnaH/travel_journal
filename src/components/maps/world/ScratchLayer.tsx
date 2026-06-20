// Scratch overlay for the atlas.
// It tracks pointer movement over SVG geometry and reports scratch progress
// without owning the higher-level visited-country state.
'use client';

import React, { useMemo, useRef, useState } from 'react';
import { geoContains, type ExtendedFeature, type GeoProjection } from 'd3-geo';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Stage, Layer, Line, Rect } from 'react-konva';

type ScratchPoint = {
  x: number;
  y: number;
};

type ScratchLine = {
  points: number[];
  strokeWidth: number;
};

export type ScratchCountryRegion = {
  id: string;
  geography: ExtendedFeature;
};

interface ScratchLayerProps {
  width: number;
  height: number;
  onScratchReveal: (countryId: string) => void;
  countryRegions: ScratchCountryRegion[];
  projection: GeoProjection;
  guidePaths?: string[];
  guidePathByCountry?: Record<string, string>;
  revealableCountryIds?: string[];
  // optional per-country thresholds (lower = easier to reveal)
  thresholds?: Record<string, number>;
}

type ScratchEvent = KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>;

const DEFAULT_SCRATCH_THRESHOLD = 120;
const POINTER_DOWN_UNITS = 12;
const SCRATCH_SAMPLE_SPACING = 10;
const SCRATCH_STROKE_WIDTH = 36;
const INPUT_CAPTURE_FILL = 'rgba(0, 0, 0, 0.001)';

// Renders the scratch interaction layer for atlas geographies.
export default function ScratchLayer({
  width,
  height,
  onScratchReveal,
  countryRegions,
  projection,
  guidePaths = [],
  guidePathByCountry = {},
  revealableCountryIds = [],
  thresholds = {},
}: ScratchLayerProps) {
  const [lines, setLines] = useState<ScratchLine[]>([]);
  const [activeCountryId, setActiveCountryId] = useState<string | null>(null);
  const isDrawing = useRef(false);
  const lastPointRef = useRef<ScratchPoint | null>(null);
  const activeCountryIdRef = useRef<string | null>(null);
  const regionMap = useMemo(() => new Map(countryRegions.map((region) => [region.id, region])), [countryRegions]);
  const revealableIdSet = useMemo(() => new Set(revealableCountryIds), [revealableCountryIds]);

  // Track accumulated scratch units per country polygon.
  const countsRef = useRef<Record<string, number>>({});
  const revealedRef = useRef<Record<string, boolean>>({});

  // Starts a scratch stroke only when the pointer begins inside a revealable country.
  const handleMouseDown = (e: ScratchEvent) => {
    const pos = getPointerPosition(e);
    if (!pos) return;
    const targetCountryId = getCountryIdAtPoint(pos);
    if (!targetCountryId) return;

    isDrawing.current = true;
    activeCountryIdRef.current = targetCountryId;
    setActiveCountryId(targetCountryId);
    lastPointRef.current = pos;
    setLines((l) => [...l, { points: [pos.x, pos.y], strokeWidth: SCRATCH_STROKE_WIDTH }]);
    recordScratchAtPoint(pos, POINTER_DOWN_UNITS, targetCountryId);
  };

  // Extends the current stroke while the pointer stays inside the active country.
  const handleMouseMove = (e: ScratchEvent) => {
    if (!isDrawing.current) return;
    const point = getPointerPosition(e);
    if (!point) return;

    const activeCountryId = activeCountryIdRef.current;
    if (!activeCountryId) return;
    if (!isPointInCountry(point, activeCountryId)) {
      lastPointRef.current = null;
      return;
    }

    if (!lastPointRef.current) {
      lastPointRef.current = point;
      setLines((prev) => [...prev, { points: [point.x, point.y], strokeWidth: SCRATCH_STROKE_WIDTH }]);
      recordScratchAtPoint(point, POINTER_DOWN_UNITS, activeCountryId);
      return;
    }

    const previousPoint = lastPointRef.current;

    setLines((prev) => {
      const newLines = prev.slice();
      const last = newLines[newLines.length - 1];
      if (last) {
        newLines[newLines.length - 1] = {
          ...last,
          points: last.points.concat([point.x, point.y]),
        };
      }
      return newLines;
    });

    recordScratchSegment(previousPoint, point, activeCountryId);

    lastPointRef.current = point;
  };

  // Ends the active scratch stroke.
  const handleMouseUp = () => {
    isDrawing.current = false;
    lastPointRef.current = null;
    activeCountryIdRef.current = null;
    setActiveCountryId(null);
  };

  function getPointerPosition(e: ScratchEvent): ScratchPoint | null {
    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return null;

    return { x: point.x, y: point.y };
  }

  function recordScratchSegment(from: ScratchPoint, to: ScratchPoint, countryId: string) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / SCRATCH_SAMPLE_SPACING));
    const unitsPerSample = distance > 0 ? distance / steps : POINTER_DOWN_UNITS;

    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps;
      recordScratchAtPoint(
        {
          x: from.x + (to.x - from.x) * ratio,
          y: from.y + (to.y - from.y) * ratio,
        },
        unitsPerSample,
        countryId
      );
    }
  }

  function getLonLat(point: ScratchPoint): [number, number] | null {
    const lonLat = projection.invert?.([point.x, point.y]);
    if (!lonLat || !Number.isFinite(lonLat[0]) || !Number.isFinite(lonLat[1])) return null;
    return lonLat;
  }

  function getCountryIdAtPoint(point: ScratchPoint): string | null {
    const lonLat = getLonLat(point);
    if (!lonLat) return null;

    const hitRegion = countryRegions.find((region) => geoContains(region.geography, lonLat));

    return hitRegion?.id ?? null;
  }

  function isPointInCountry(point: ScratchPoint, countryId: string): boolean {
    const lonLat = getLonLat(point);
    if (!lonLat) return false;
    const region = regionMap.get(countryId);
    if (!region) return false;
    return geoContains(region.geography, lonLat);
  }

  function recordScratchAtPoint(point: ScratchPoint, units: number, countryId: string) {
    const lonLat = getLonLat(point);
    if (!lonLat) return;
    const region = regionMap.get(countryId);
    if (!region) return;
    if (!revealableIdSet.has(countryId)) return;
    if (revealedRef.current[countryId]) return;
    if (!geoContains(region.geography, lonLat)) return;

    countsRef.current[countryId] = (countsRef.current[countryId] || 0) + units;

    const needed = thresholds[countryId] ?? DEFAULT_SCRATCH_THRESHOLD;
    if (countsRef.current[countryId] >= needed) {
      revealedRef.current[countryId] = true;
      onScratchReveal(countryId);
    }
  }

  return (
    <div className="world-map-scratch-root pointer-events-auto absolute inset-0" style={{ width, height }}>
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Layer>
          <Rect x={0} y={0} width={width} height={height} fill={INPUT_CAPTURE_FILL} />
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              stroke="transparent"
              listening={false}
            />
          ))}
        </Layer>
      </Stage>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="pointer-events-none absolute inset-0"
      >
        {guidePaths.map((path, index) => (
          <path key={`scratch-guide-${index}`} d={path} fill="none" stroke="#8B6B3F" strokeWidth="0.6" opacity="0.9" />
        ))}
        {activeCountryId && guidePathByCountry[activeCountryId] ? (
          <path
            d={guidePathByCountry[activeCountryId]}
            fill="none"
            stroke="#1E88E5"
            strokeWidth="1.8"
            opacity="0.95"
          />
        ) : null}
      </svg>
    </div>
  );
}
