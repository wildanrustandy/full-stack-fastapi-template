const STRIP_WIDTH = 600;
const PHOTO_HEIGHT = 450;
const GAP = 4;
const NUM_SLOTS = 4;
const FOOTER_HEIGHT = 48;

const TOTAL_HEIGHT =
  NUM_SLOTS * PHOTO_HEIGHT + (NUM_SLOTS - 1) * GAP + FOOTER_HEIGHT;

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  ctx.setLineDash([]);

  ctx.fillStyle = "#9ca3af";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("No Photo", x + w / 2, y + h / 2);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Composites up to 4 photos into a single vertical photo-strip image.
 * Missing slots are filled with a dashed placeholder.
 *
 * @param photoDataUrls - Array of 1-4 base64 data-URL strings
 * @returns PNG data-URL of the finished strip
 */
export async function createPhotoStrip(
  photoDataUrls: string[],
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = STRIP_WIDTH;
  canvas.height = TOTAL_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not acquire 2D canvas context");
  }

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, STRIP_WIDTH, TOTAL_HEIGHT);

  // Draw each photo (or placeholder)
  for (let i = 0; i < NUM_SLOTS; i++) {
    const y = i * (PHOTO_HEIGHT + GAP);
    const dataUrl = photoDataUrls[i];

    if (dataUrl) {
      try {
        const img = await loadImage(dataUrl);

        // Cover-fit the image into the slot
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const slotAspect = STRIP_WIDTH / PHOTO_HEIGHT;

        let sx = 0;
        let sy = 0;
        let sw = img.naturalWidth;
        let sh = img.naturalHeight;

        if (imgAspect > slotAspect) {
          // Image is wider — crop sides
          sw = img.naturalHeight * slotAspect;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          // Image is taller — crop top/bottom
          sh = img.naturalWidth / slotAspect;
          sy = (img.naturalHeight - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, y, STRIP_WIDTH, PHOTO_HEIGHT);
      } catch {
        drawPlaceholder(ctx, 0, y, STRIP_WIDTH, PHOTO_HEIGHT);
      }
    } else {
      drawPlaceholder(ctx, 0, y, STRIP_WIDTH, PHOTO_HEIGHT);
    }
  }

  // Footer / branding
  const footerY = NUM_SLOTS * (PHOTO_HEIGHT + GAP);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, footerY, STRIP_WIDTH, FOOTER_HEIGHT);

  ctx.fillStyle = "#6b7280";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "Photo Strip",
    STRIP_WIDTH / 2,
    footerY + FOOTER_HEIGHT / 2,
  );

  return canvas.toDataURL("image/png");
}

/**
 * Triggers a browser download of the data-URL as a PNG file.
 *
 * @param dataUrl  - PNG data-URL returned by `createPhotoStrip`
 * @param filename - Optional file name (defaults to "photo-strip.png")
 */
export function downloadStrip(
  dataUrl: string,
  filename = "photo-strip.png",
): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
