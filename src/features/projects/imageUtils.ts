/**
 * Client-side image helpers for property photos.
 *
 * Photos are downscaled and re-encoded as JPEG data URLs before entering a
 * project so localStorage documents stay small (a 4000px phone photo would
 * blow the ~5MB quota immediately). No external image library needed: the
 * browser Canvas API handles decode + scale + encode.
 *
 * Data URLs also make projects self-contained and export-friendly; if photos
 * later move to server storage only this file changes.
 */

const MAX_PHOTO_DIMENSION_PX = 1600
const THUMBNAIL_DIMENSION_PX = 320
const JPEG_QUALITY = 0.82

export interface CompressedPhoto {
  dataUrl: string
  widthPx: number
  heightPx: number
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode image'))
    image.src = url
  })
}

function drawScaledToDataUrl(
  image: HTMLImageElement,
  maxDimensionPx: number,
): CompressedPhoto {
  const scale = Math.min(1, maxDimensionPx / Math.max(image.naturalWidth, image.naturalHeight))
  const widthPx = Math.max(1, Math.round(image.naturalWidth * scale))
  const heightPx = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = widthPx
  canvas.height = heightPx
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context unavailable')
  context.drawImage(image, 0, 0, widthPx, heightPx)

  return { dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY), widthPx, heightPx }
}

/** Decodes a user-selected photo, downscales it, and returns the JPEG data URL. */
export async function compressImageFile(file: File): Promise<CompressedPhoto> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImageFromUrl(objectUrl)
    return drawScaledToDataUrl(image, MAX_PHOTO_DIMENSION_PX)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Small preview used on project list cards to keep the index lightweight. */
export async function createThumbnail(photoDataUrl: string): Promise<string> {
  const image = await loadImageFromUrl(photoDataUrl)
  return drawScaledToDataUrl(image, THUMBNAIL_DIMENSION_PX).dataUrl
}
