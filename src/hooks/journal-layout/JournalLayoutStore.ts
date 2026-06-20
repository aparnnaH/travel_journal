'use client';

// Zustand store for local scrapbook editor preferences.
// These values are UI controls rather than saved journal content, so keeping
// them in a small client store avoids pushing editor-only state through props.
import { create } from 'zustand';

type JournalTool = 'select' | 'draw' | 'photos' | 'stickers';

type JournalLayoutState = {
  activeTool: JournalTool;
  canvasZoom: number;
  paperTexture: number;
  snapToGrid: boolean;
  setActiveTool: (tool: JournalTool) => void;
  setCanvasZoom: (zoom: number) => void;
  setPaperTexture: (texture: number) => void;
  toggleSnapToGrid: () => void;
};

// Centralizes the active tool and canvas display settings used by journal
// layout controls. Zustand provides a lightweight shared state pattern for
// client components that are not naturally parent/child siblings.
export const useJournalLayoutStore = create<JournalLayoutState>((set) => ({
  activeTool: 'select',
  canvasZoom: 1,
  paperTexture: 0.58,
  snapToGrid: false,
  setActiveTool: (activeTool) => set({ activeTool }),
  setCanvasZoom: (canvasZoom) => set({ canvasZoom }),
  setPaperTexture: (paperTexture) => set({ paperTexture }),
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
}));

export type { JournalTool };
