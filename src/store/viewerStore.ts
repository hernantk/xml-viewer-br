import { create } from "zustand";

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 1;

const ZOOM_STORAGE_KEY = "xmlviewer-zoom";

function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return ZOOM_DEFAULT;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

function getInitialZoom(): number {
  try {
    const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
    if (saved !== null) return clampZoom(Number(saved));
  } catch {
    /* ignore */
  }
  return ZOOM_DEFAULT;
}

function persistZoom(zoom: number): void {
  try {
    localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom));
  } catch {
    /* ignore */
  }
}

interface ViewerState {
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  zoom: getInitialZoom(),

  setZoom: (zoom) => {
    const clamped = clampZoom(zoom);
    persistZoom(clamped);
    set({ zoom: clamped });
  },

  zoomIn: () =>
    set((state) => {
      const clamped = clampZoom(state.zoom + ZOOM_STEP);
      persistZoom(clamped);
      return { zoom: clamped };
    }),

  zoomOut: () =>
    set((state) => {
      const clamped = clampZoom(state.zoom - ZOOM_STEP);
      persistZoom(clamped);
      return { zoom: clamped };
    }),

  resetZoom: () => {
    persistZoom(ZOOM_DEFAULT);
    set({ zoom: ZOOM_DEFAULT });
  },
}));

export function formatZoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}
