/**
 * Client-side image processing utilities — used by ALL image uploads in the app.
 *
 * Pipeline:
 *   1. User picks an image.
 *   2. ImageCropper lets them zoom + reposition inside a square frame.
 *   3. We render the chosen crop onto a canvas at a target size.
 *   4. We compress to WebP/JPEG under a size budget BEFORE uploading to storage.
 *
 * This guarantees small, uniform images in Supabase Storage.
 */

export type CropState = {
  /** zoom factor, 1 = fit */
  zoom: number;
  /** offset in px relative to the frame center */
  offsetX: number;
  offsetY: number;
};

export const DEFAULT_CROP: CropState = { zoom: 1, offsetX: 0, offsetY: 0 };

/** Load a File/Blob into an HTMLImageElement. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export type RenderOptions = {
  /** output square size in px (e.g. 512) */
  size?: number;
  /** how the frame maps onto the source: frame diameter in displayed px */
  frameSize: number;
  crop: CropState;
  /** mime + quality for compression */
  mimeType?: "image/webp" | "image/jpeg";
  quality?: number;
};

/**
 * Render the visible crop (matching exactly what ImageCropper shows) to a
 * square canvas and return a compressed Blob.
 *
 * The cropper displays the image with object-fit: cover inside a `frameSize`
 * square, then applies zoom + offset. We replicate that math here.
 */
export async function renderCroppedBlob(
  img: HTMLImageElement,
  opts: RenderOptions
): Promise<Blob> {
  const {
    size = 512,
    frameSize,
    crop,
    mimeType = "image/webp",
    quality = 0.82,
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Base "cover" scale so the image fills the frame at zoom = 1.
  const baseScale = Math.max(frameSize / img.width, frameSize / img.height);
  const scale = baseScale * crop.zoom;

  // Drawn size of the image in display px.
  const drawW = img.width * scale;
  const drawH = img.height * scale;

  // Top-left of the image inside the frame (centered + offset).
  const dx = (frameSize - drawW) / 2 + crop.offsetX;
  const dy = (frameSize - drawH) / 2 + crop.offsetY;

  // Map from display px (frameSize) to canvas px (size).
  const ratio = size / frameSize;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx * ratio, dy * ratio, drawW * ratio, drawH * ratio);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), mimeType, quality)
  );
  if (!blob) throw new Error("Image compression failed");
  return blob;
}

/**
 * Iteratively compress until under maxBytes (default 200KB) by lowering
 * quality / size. Returns the final Blob.
 */
export async function compressUnder(
  img: HTMLImageElement,
  opts: RenderOptions,
  maxBytes = 200 * 1024
): Promise<Blob> {
  let quality = opts.quality ?? 0.82;
  let size = opts.size ?? 512;
  let blob = await renderCroppedBlob(img, { ...opts, quality, size });

  let guard = 0;
  while (blob.size > maxBytes && guard < 6) {
    quality = Math.max(0.4, quality - 0.12);
    if (quality <= 0.45) size = Math.max(256, Math.round(size * 0.85));
    blob = await renderCroppedBlob(img, { ...opts, quality, size });
    guard++;
  }
  return blob;
}
