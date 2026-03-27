// Lazy imports for code splitting - jspdf is ~850KB
async function loadDeps() {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  return { html2canvas, jsPDF };
}

// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 5;

const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;

// Scale for high-quality capture
const CAPTURE_SCALE = 2;

export async function generatePdfFromElement(
  element: HTMLElement,
  _filename: string,
): Promise<Uint8Array> {
  const { html2canvas, jsPDF } = await loadDeps();

  // Clone the element to manipulate styles without affecting the UI
  const clone = element.cloneNode(true) as HTMLElement;

  // Set explicit styles for consistent PDF rendering
  clone.style.width = "794px"; // A4 width at 96dpi
  clone.style.backgroundColor = "#ffffff";
  clone.style.color = "#000000";
  clone.style.position = "absolute";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.padding = "0";
  clone.style.margin = "0";

  // Remove dark mode classes from clone
  removeDarkClasses(clone);

  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: CAPTURE_SCALE,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });

    document.body.removeChild(clone);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // Calculate dimensions to fit A4
    const canvasWidthPx = canvas.width;
    const canvasHeightPx = canvas.height;

    // The content should fill the A4 width (minus margins)
    const ratio = CONTENT_WIDTH_MM / (canvasWidthPx / CAPTURE_SCALE);
    const totalHeightMM = (canvasHeightPx / CAPTURE_SCALE) * ratio;

    if (totalHeightMM <= CONTENT_HEIGHT_MM) {
      // Fits in a single page
      pdf.addImage(
        imgData,
        "JPEG",
        MARGIN_MM,
        MARGIN_MM,
        CONTENT_WIDTH_MM,
        totalHeightMM,
      );
    } else {
      // Multi-page: slice the canvas into page-sized chunks
      const pageHeightPx =
        (CONTENT_HEIGHT_MM / ratio) * CAPTURE_SCALE;
      const totalPages = Math.ceil(canvasHeightPx / pageHeightPx);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        // Create a slice of the canvas for this page
        const sliceY = page * pageHeightPx;
        const sliceHeight = Math.min(
          pageHeightPx,
          canvasHeightPx - sliceY,
        );

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvasWidthPx;
        pageCanvas.height = sliceHeight;

        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            sliceY,
            canvasWidthPx,
            sliceHeight,
            0,
            0,
            canvasWidthPx,
            sliceHeight,
          );
        }

        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        const pageContentHeight =
          (sliceHeight / CAPTURE_SCALE) * ratio;

        pdf.addImage(
          pageImgData,
          "JPEG",
          MARGIN_MM,
          MARGIN_MM,
          CONTENT_WIDTH_MM,
          pageContentHeight,
        );
      }
    }

    // Return as Uint8Array
    const arrayBuffer = pdf.output("arraybuffer");
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    // Clean up clone if still attached
    if (clone.parentNode) {
      document.body.removeChild(clone);
    }
    throw err;
  }
}

function removeDarkClasses(el: HTMLElement) {
  // Remove dark: prefixed classes and ensure light mode
  if (el.classList) {
    const darkClasses = Array.from(el.classList).filter((c) =>
      c.startsWith("dark:"),
    );
    darkClasses.forEach((c) => el.classList.remove(c));

    // Replace dark background/text classes
    el.classList.remove("dark");
    if (el.classList.contains("bg-gray-900")) {
      el.classList.remove("bg-gray-900");
      el.classList.add("bg-white");
    }
    if (el.classList.contains("bg-gray-800")) {
      el.classList.remove("bg-gray-800");
      el.classList.add("bg-white");
    }
    if (el.classList.contains("text-gray-100")) {
      el.classList.remove("text-gray-100");
      el.classList.add("text-gray-900");
    }
    if (el.classList.contains("text-gray-400")) {
      el.classList.remove("text-gray-400");
      el.classList.add("text-gray-500");
    }
    if (el.classList.contains("border-gray-600")) {
      el.classList.remove("border-gray-600");
      el.classList.add("border-gray-300");
    }
    if (el.classList.contains("border-gray-700")) {
      el.classList.remove("border-gray-700");
      el.classList.add("border-gray-200");
    }
  }

  // Recursively process children
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (child instanceof HTMLElement) {
      removeDarkClasses(child);
    }
  }
}
