"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { X, ZoomIn, Check, Loader2 } from "lucide-react";
import {
  CropState,
  DEFAULT_CROP,
  loadImage,
  fileToDataURL,
  compressUnder,
} from "@/lib/image/process";

type ImageCropperProps = {
  file: File;
  /** "circle" for logos/avatars, "square" otherwise */
  shape?: "circle" | "square";
  /** final stored square size */
  outputSize?: number;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
};

const FRAME = 260; // display px of the crop frame

export function ImageCropper({
  file,
  shape = "circle",
  outputSize = 512,
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<CropState>(DEFAULT_CROP);
  const [busy, setBusy] = useState(false);

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let active = true;
    fileToDataURL(file).then(async (dataUrl) => {
      if (!active) return;
      setSrc(dataUrl);
      const image = await loadImage(dataUrl);
      if (active) setImg(image);
    });
    return () => {
      active = false;
    };
  }, [file]);

  // ----- pointer drag to reposition -----
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setCrop((c) => ({ ...c, offsetX: c.offsetX + dx, offsetY: c.offsetY + dy }));
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  const handleConfirm = useCallback(async () => {
    if (!img) return;
    setBusy(true);
    try {
      const blob = await compressUnder(img, {
        frameSize: FRAME,
        crop,
        size: outputSize,
        mimeType: "image/webp",
        quality: 0.82,
      });
      await onConfirm(blob);
    } finally {
      setBusy(false);
    }
  }, [img, crop, outputSize, onConfirm]);

  // Image display transform mirrors process.ts math (cover + zoom + offset)
  const baseScale = img
    ? Math.max(FRAME / img.width, FRAME / img.height)
    : 1;
  const scale = baseScale * crop.zoom;
  const drawW = img ? img.width * scale : FRAME;
  const drawH = img ? img.height * scale : FRAME;
  const left = (FRAME - drawW) / 2 + crop.offsetX;
  const top = (FRAME - drawH) / 2 + crop.offsetY;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/80 backdrop-blur-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button
          onClick={onCancel}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-white active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-white">حرّك وكبّر الصورة</span>
        <button
          onClick={handleConfirm}
          disabled={!img || busy}
          className="grid h-10 w-10 place-items-center rounded-2xl btn-gradient text-white active:scale-95 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
        </button>
      </div>

      {/* Crop area */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div
          className="relative touch-none overflow-hidden bg-black"
          style={{
            width: FRAME,
            height: FRAME,
            borderRadius: shape === "circle" ? "9999px" : "1.5rem",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt="crop"
              draggable={false}
              className="pointer-events-none absolute select-none"
              style={{ left, top, width: drawW, height: drawH, maxWidth: "none" }}
            />
          )}
          {/* Frame ring */}
          <div
            className="pointer-events-none absolute inset-0 ring-2 ring-white/70"
            style={{ borderRadius: shape === "circle" ? "9999px" : "1.5rem" }}
          />
        </div>
      </div>

      {/* Zoom slider */}
      <div className="p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
          <ZoomIn className="h-5 w-5 text-white" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={crop.zoom}
            onChange={(e) =>
              setCrop((c) => ({ ...c, zoom: parseFloat(e.target.value) }))
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-white"
          />
        </div>
      </div>
    </div>
  );
}
