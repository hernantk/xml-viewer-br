import { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import {
  ZOOM_MAX,
  ZOOM_MIN,
  formatZoomPercent,
  useViewerStore,
} from "@/store/viewerStore";

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function ZoomControls() {
  const zoom = useViewerStore((s) => s.zoom);
  const setZoom = useViewerStore((s) => s.setZoom);
  const zoomIn = useViewerStore((s) => s.zoomIn);
  const zoomOut = useViewerStore((s) => s.zoomOut);
  const resetZoom = useViewerStore((s) => s.resetZoom);
  const [presetOpen, setPresetOpen] = useState(false);

  const canZoomOut = zoom > ZOOM_MIN + 1e-9;
  const canZoomIn = zoom < ZOOM_MAX - 1e-9;

  const buttonClass =
    "flex items-center justify-center rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200";

  return (
    <div
      className="flex items-center gap-0.5 rounded border border-gray-200 bg-white px-1 py-0.5 dark:border-gray-700 dark:bg-gray-900"
      title="Zoom da visualização (Ctrl + / Ctrl - / Ctrl 0, ou Ctrl + scroll)"
    >
      {Math.abs(zoom - 1) > 1e-9 && (
        <button
          onClick={resetZoom}
          className={buttonClass}
          title="Restaurar zoom para 100% (Ctrl 0)"
          aria-label="Restaurar zoom para 100%"
        >
          <RotateCcw size={13} />
        </button>
      )}
      <button
        onClick={zoomOut}
        disabled={!canZoomOut}
        className={buttonClass}
        title="Reduzir zoom (Ctrl -)"
        aria-label="Reduzir zoom"
      >
        <ZoomOut size={14} />
      </button>

      <div className="relative">
        <button
          onClick={() => setPresetOpen((open) => !open)}
          className="min-w-[48px] rounded px-1 py-0.5 text-center text-xs font-medium tabular-nums text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          title="Nível de zoom — clique para escolher um valor"
          aria-label={`Zoom atual ${formatZoomPercent(zoom)}. Clique para escolher.`}
        >
          {formatZoomPercent(zoom)}
        </button>

        {presetOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setPresetOpen(false)}
            />
            <div className="absolute left-1/2 top-full z-50 mt-1 w-24 -translate-x-1/2 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {ZOOM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setZoom(preset);
                    setPresetOpen(false);
                  }}
                  className={`block w-full px-3 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    Math.abs(preset - zoom) < 1e-9
                      ? "font-bold text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {formatZoomPercent(preset)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button
        onClick={zoomIn}
        disabled={!canZoomIn}
        className={buttonClass}
        title="Aumentar zoom (Ctrl +)"
        aria-label="Aumentar zoom"
      >
        <ZoomIn size={14} />
      </button>
    </div>
  );
}
