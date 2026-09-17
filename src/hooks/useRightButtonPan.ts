import { useEffect, type RefObject } from "react";

// Minimum movement before a right-press becomes a pan (so a plain
// right-click keeps opening the native context menu).
const DRAG_THRESHOLD_PX = 4;

/**
 * Lets the user pan the surrounding scroll container by holding the RIGHT
 * mouse button and dragging — the same gesture as the middle (scroll)
 * button autoscroll, but driven manually.
 *
 * - Only `button === 2` starts a pan; left-drag selection and the native
 *   middle-button autoscroll are untouched.
 * - The native context menu is swallowed only when a drag actually
 *   happened; a plain right-click keeps its normal menu.
 * - Scoped to `ref` (the zoom area): other regions (e.g. the sidebar's own
 *   context menu) are never affected.
 */
export function useRightButtonPan(
  contentRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    let scroller: HTMLElement | null = null;

    let panning = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let activePointerId: number | null = null;
    let suppressContextMenu = false;
    let prevCursor = "";
    let prevUserSelect = "";

    const capture = (e: PointerEvent) => {
      if (scroller && typeof scroller.setPointerCapture === "function") {
        try {
          scroller.setPointerCapture(e.pointerId);
        } catch {
          /* pointer already released — ignore */
        }
      }
    };

    const release = (e: PointerEvent) => {
      if (scroller && typeof scroller.releasePointerCapture === "function") {
        try {
          if (scroller.hasPointerCapture?.(e.pointerId)) {
            scroller.releasePointerCapture(e.pointerId);
          }
        } catch {
          /* ignore */
        }
      }
    };

    const endPan = (e: PointerEvent) => {
      if (!panning || !scroller) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      panning = false;
      activePointerId = null;
      release(e);
      scroller.style.cursor = prevCursor;
      scroller.style.userSelect = prevUserSelect;
      if (moved) {
        // `contextmenu` fires right after `pointerup`: swallow it once so a
        // pan never opens the browser menu.
        suppressContextMenu = true;
      }
      moved = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 2) return;
      if (panning) return;
      // Read the ref at event time (not effect time): the document content
      // mounts after loading states, long after this effect ran once.
      const content = contentRef.current;
      if (
        !content ||
        !(e.target instanceof Node) ||
        !content.contains(e.target)
      ) {
        return;
      }
      // Same scroller lookup used by the sticky toolbar compensation.
      scroller = (content.closest("main") ?? content) as HTMLElement;
      // A fresh press clears a stale suppression (e.g. pan released outside
      // the content), so an unrelated right-click is never swallowed.
      suppressContextMenu = false;
      moved = false;
      panning = true;
      activePointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      prevCursor = scroller.style.cursor;
      prevUserSelect = scroller.style.userSelect;
      scroller.style.cursor = "grabbing";
      scroller.style.userSelect = "none";
      capture(e);
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!panning || !scroller) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      if (
        !moved &&
        Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD_PX
      ) {
        return;
      }
      moved = true;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      scroller.scrollLeft -= dx;
      scroller.scrollTop -= dy;
      e.preventDefault();
    };

    const onContextMenu = (e: MouseEvent) => {
      if (!suppressContextMenu) return;
      const content = contentRef.current;
      if (!content) return;
      if (!(e.target instanceof Node) || !content.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      suppressContextMenu = false;
    };

    // `pointerdown` on document (capture): the zoom area mounts after the
    // loading states, so the ref is read at event time instead.
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endPan);
    window.addEventListener("pointercancel", endPan);
    // Capture phase so we run before React's synthetic handlers.
    document.addEventListener("contextmenu", onContextMenu, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endPan);
      window.removeEventListener("pointercancel", endPan);
      document.removeEventListener("contextmenu", onContextMenu, true);
    };
  }, [contentRef]);
}
