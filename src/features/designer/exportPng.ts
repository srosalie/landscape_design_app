/**
 * Renders the design canvas to a downloadable PNG.
 *
 * Approach: clone the live <svg>, strip editor-only decorations (selection
 * outlines, handles, ghost cursor - all tagged data-export-exclude), serialize
 * it, rasterize through an offscreen canvas at 2x for crispness, then trigger
 * a download. Safe because the background photo is already a same-origin data
 * URL, so no canvas tainting occurs.
 */

const EXPORT_SCALE = 2

export async function exportSceneAsPng(
  svgElement: SVGSVGElement,
  photoPixelWidth: number,
  photoPixelHeight: number,
  suggestedFileName: string,
): Promise<void> {
  const exportClone = svgElement.cloneNode(true) as SVGSVGElement

  // Reset the viewport to the full photo and drop editor chrome.
  exportClone.setAttribute('viewBox', `0 0 ${photoPixelWidth} ${photoPixelHeight}`)
  exportClone.setAttribute('width', String(photoPixelWidth))
  exportClone.setAttribute('height', String(photoPixelHeight))
  exportClone
    .querySelectorAll('[data-export-exclude]')
    .forEach((node) => node.remove())

  const serializedSvg = new XMLSerializer().serializeToString(exportClone)
  const svgBlobUrl = URL.createObjectURL(
    new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' }),
  )

  try {
    const image = await loadImageFromSvg(svgBlobUrl)
    const canvas = document.createElement('canvas')
    canvas.width = photoPixelWidth * EXPORT_SCALE
    canvas.height = photoPixelHeight * EXPORT_SCALE
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context unavailable')

    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const downloadAnchor = document.createElement('a')
    downloadAnchor.download = `${suggestedFileName}.png`
    downloadAnchor.href = canvas.toDataURL('image/png')
    downloadAnchor.click()
  } finally {
    URL.revokeObjectURL(svgBlobUrl)
  }
}

function loadImageFromSvg(svgBlobUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not rasterize design'))
    image.src = svgBlobUrl
  })
}
