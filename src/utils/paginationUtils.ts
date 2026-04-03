/**
 * Shared pagination utilities for DANFE, DACTe, and NFS-e viewers.
 *
 * Centralises page-height constants and the block-chunking algorithm so that
 * each viewer stays in sync without copy-pasting logic.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Nominal A4 height at 96 dpi (297 mm × 96 / 25.4 ≈ 1122 px).
 * Used as a static fallback; prefer `measureA4HeightPx()` when available.
 */
export const A4_PAGE_HEIGHT_PX = 1122;

/**
 * Half of Tailwind `p-4` (1 rem = 16 px on each side → 32 px top+bottom).
 */
export const PAGE_PADDING_PX = 16;

/**
 * Small safety buffer to absorb sub-pixel rounding and thin borders.
 */
export const PAGE_SAFETY_PX = 12;

// ---------------------------------------------------------------------------
// Dynamic A4 height measurement
// ---------------------------------------------------------------------------

let _cachedA4Height: number | null = null;

/**
 * Measures the real pixel height of 297 mm at the current zoom/DPI by
 * temporarily injecting a fixed-size probe element into the DOM.
 *
 * The result is cached until `invalidateA4Cache()` is called (e.g. on zoom
 * change via ResizeObserver). Falls back to `A4_PAGE_HEIGHT_PX` if the
 * measurement fails.
 */
export function measureA4HeightPx(): number {
  if (_cachedA4Height !== null) return _cachedA4Height;

  try {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:1px;height:297mm;" +
      "pointer-events:none;visibility:hidden;";
    document.body.appendChild(probe);
    const measured = probe.getBoundingClientRect().height;
    document.body.removeChild(probe);
    if (measured > 0) {
      _cachedA4Height = measured;
      return measured;
    }
  } catch {
    // Ignore — DOM may not be ready in SSR/test environments.
  }

  _cachedA4Height = A4_PAGE_HEIGHT_PX;
  return A4_PAGE_HEIGHT_PX;
}

/**
 * Invalidates the cached A4 height so the next call to `measureA4HeightPx()`
 * re-probes the DOM. Call this inside a ResizeObserver callback when the
 * viewport size changes (which happens on zoom changes in Tauri's WebView).
 */
export function invalidateA4Cache(): void {
  _cachedA4Height = null;
}

// ---------------------------------------------------------------------------
// Block-key chunking (shared by DACTeViewer and NFSeViewer)
// ---------------------------------------------------------------------------

/**
 * Distributes a flat list of content-block keys into pages so that the total
 * measured height of each page's blocks does not exceed `pageAvailable` px.
 *
 * A single block that is taller than `pageAvailable` is never split — it is
 * placed alone on its own page to avoid infinite loops.
 */
export function chunkBlockKeys(
  blockKeys: string[],
  blockHeights: number[],
  pageAvailable: number,
): string[][] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let remaining = pageAvailable;

  blockKeys.forEach((key, index) => {
    const safeHeight = Math.max(blockHeights[index] ?? 0, 1);
    if (currentChunk.length > 0 && safeHeight > remaining) {
      chunks.push(currentChunk);
      currentChunk = [];
      remaining = pageAvailable;
    }
    currentChunk.push(key);
    remaining -= safeHeight;
    if (remaining <= 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      remaining = pageAvailable;
    }
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [blockKeys];
}

/**
 * Shallow equality check for page-chunk arrays.
 * Used to skip unnecessary `setPageChunks` calls when nothing changed.
 */
export function arePageChunksEqual(a: string[][], b: string[][]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (chunk, i) =>
      chunk.length === b[i].length &&
      chunk.every((v, j) => v === b[i][j]),
  );
}
