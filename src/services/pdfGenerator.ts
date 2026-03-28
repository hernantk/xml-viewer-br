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
const MARGIN_MM = 0;

const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;

// Scale for high-quality capture
const CAPTURE_SCALE = 3;

function createCanvasSlice(
  sourceCanvas: HTMLCanvasElement,
  sourceY: number,
  sourceHeight: number,
) {
  const sliceCanvas = document.createElement("canvas");
  sliceCanvas.width = sourceCanvas.width;
  sliceCanvas.height = sourceHeight;

  const ctx = sliceCanvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      sourceCanvas,
      0,
      sourceY,
      sourceCanvas.width,
      sourceHeight,
      0,
      0,
      sourceCanvas.width,
      sourceHeight,
    );
  }

  return sliceCanvas;
}

export async function generatePdfFromElement(
  element: HTMLElement,
  _filename: string,
): Promise<Uint8Array> {
  const { html2canvas, jsPDF } = await loadDeps();

  const clone = element.cloneNode(true) as HTMLElement;

  clone.style.width = "794px";
  clone.style.backgroundColor = "#ffffff";
  clone.style.color = "#000000";
  clone.style.position = "absolute";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.padding = "0";
  clone.style.margin = "0";

  removeDarkClasses(clone);
  prepareCloneForPdf(clone);

  document.body.appendChild(clone);

  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pagedSections = Array.from(
      clone.querySelectorAll<HTMLElement>(".danfe-page"),
    );

    if (pagedSections.length > 0) {
      for (let index = 0; index < pagedSections.length; index++) {
        if (index > 0) {
          pdf.addPage();
        }
        const pageCanvas = await html2canvas(pagedSections[index], {
          scale: CAPTURE_SCALE,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 794,
        });
        addCanvasToPdf(pdf, pageCanvas);
      }
    } else {
      const canvas = await html2canvas(clone, {
        scale: CAPTURE_SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
      });
      addCanvasToPdf(pdf, canvas);
    }

    const arrayBuffer = pdf.output("arraybuffer");
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    if (clone.parentNode) document.body.removeChild(clone);
    throw err;
  } finally {
    if (clone.parentNode) document.body.removeChild(clone);
  }
}

function addCanvasToPdf(pdf: import("jspdf").jsPDF, canvas: HTMLCanvasElement) {
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const canvasWidthPx = canvas.width;
  const canvasHeightPx = canvas.height;
  const ratio = CONTENT_WIDTH_MM / (canvasWidthPx / CAPTURE_SCALE);
  const totalHeightMM = (canvasHeightPx / CAPTURE_SCALE) * ratio;

  if (totalHeightMM <= CONTENT_HEIGHT_MM) {
    pdf.addImage(
      imgData,
      "JPEG",
      MARGIN_MM,
      MARGIN_MM,
      CONTENT_WIDTH_MM,
      totalHeightMM,
    );
    return;
  }

  const pageHeightPx = (CONTENT_HEIGHT_MM / ratio) * CAPTURE_SCALE;
  const totalPages = Math.ceil(canvasHeightPx / pageHeightPx);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage();
    }

    const sliceY = page * pageHeightPx;
    const sliceHeight = Math.min(pageHeightPx, canvasHeightPx - sliceY);
    const pageCanvas = createCanvasSlice(canvas, sliceY, sliceHeight);
    const pageContentHeight = (sliceHeight / CAPTURE_SCALE) * ratio;

    pdf.addImage(
      pageCanvas.toDataURL("image/jpeg", 0.95),
      "JPEG",
      MARGIN_MM,
      MARGIN_MM,
      CONTENT_WIDTH_MM,
      pageContentHeight,
    );
  }
}

function prepareCloneForPdf(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".pdf-hidden").forEach((el) => {
    el.style.display = "none";
  });

  root.querySelectorAll<HTMLElement>(".pdf-only").forEach((el) => {
    el.style.display = "block";
  });
}

function removeDarkClasses(el: HTMLElement) {
  if (el.classList) {
    const darkClasses = Array.from(el.classList).filter((c) =>
      c.startsWith("dark:"),
    );
    darkClasses.forEach((c) => el.classList.remove(c));

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

  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    if (child instanceof HTMLElement) {
      removeDarkClasses(child);
    }
  }
}
