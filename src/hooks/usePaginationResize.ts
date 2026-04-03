import { useEffect } from "react";
import { invalidateA4Cache } from "@/utils/paginationUtils";

/**
 * Fires `onResize` (and invalidates the A4-height cache) whenever the
 * browser viewport changes size — which includes zoom-level changes inside
 * Tauri's WebView.
 *
 * Usage: pass a stable `useCallback` reference so the effect only re-attaches
 * when the document data actually changes.
 *
 * @param onResize - Stable callback that triggers pagination recalculation.
 */
export function usePaginationResize(onResize: () => void): void {
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      invalidateA4Cache();
      onResize();
    });
    // Observing the document root catches any viewport / zoom change.
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [onResize]);
}
