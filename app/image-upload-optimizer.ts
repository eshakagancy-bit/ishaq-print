"use client";

export const MAX_IMAGE_DIMENSION = 1920;
export const WEBP_UPLOAD_QUALITY = 0.82;

const GIF_MIME_TYPE = "image/gif";

export function constrainedImageSize(width: number, height: number) {
  const largestDimension = Math.max(width, height);
  const scale = largestDimension > MAX_IMAGE_DIMENSION
    ? MAX_IMAGE_DIMENSION / largestDimension
    : 1;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function shouldUseCompressedImage(originalSize: number, compressedSize: number) {
  return compressedSize < originalSize;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    const releaseObjectUrl = () => URL.revokeObjectURL(objectUrl);
    image.onload = () => {
      releaseObjectUrl();
      resolve(image);
    };
    image.onerror = () => {
      releaseObjectUrl();
      reject(new Error("تعذر قراءة الصورة المختارة"));
    };
    image.decoding = "async";
    image.src = objectUrl;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", WEBP_UPLOAD_QUALITY);
  });
}

export async function optimizeImageForUpload(file: File): Promise<File> {
  if (file.type.toLowerCase() === GIF_MIME_TYPE) return file;

  const image = await loadImage(file);
  const { width, height } = constrainedImageSize(
    image.naturalWidth,
    image.naturalHeight,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return file;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const webp = await canvasToWebp(canvas);
  canvas.width = 1;
  canvas.height = 1;

  if (
    !webp
    || webp.type !== "image/webp"
    || !shouldUseCompressedImage(file.size, webp.size)
  ) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([webp], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: file.lastModified,
  });
}
