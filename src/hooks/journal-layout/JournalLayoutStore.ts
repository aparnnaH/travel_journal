'use client';

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
