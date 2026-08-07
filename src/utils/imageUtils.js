/**
 * Client-side image validation + high-quality compression before R2 upload.
 * Hard limit: 5MB original file. Output is resized JPEG with adaptive quality.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5MB input cap
export const MAX_UPLOAD_MB = 5

const PRESETS = {
  logo: {
    maxWidth: 800,
    maxHeight: 800,
    targetBytes: 350 * 1024,
    initialQuality: 0.9,
    minQuality: 0.62,
  },
  food: {
    maxWidth: 1600,
    maxHeight: 1600,
    targetBytes: 900 * 1024,
    initialQuality: 0.88,
    minQuality: 0.58,
  },
  default: {
    maxWidth: 1400,
    maxHeight: 1400,
    targetBytes: 800 * 1024,
    initialQuality: 0.88,
    minQuality: 0.58,
  },
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image file'))
    }
    img.src = url
  })
}

function fitSize(width, height, maxWidth, maxHeight) {
  let w = width
  let h = height
  if (w <= maxWidth && h <= maxHeight) return { width: w, height: h }
  const ratio = Math.min(maxWidth / w, maxHeight / h)
  return {
    width: Math.max(1, Math.round(w * ratio)),
    height: Math.max(1, Math.round(h * ratio)),
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to encode image'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Validate raw file before processing.
 * @throws {Error}
 */
export function validateImageFile(file) {
  if (!file) throw new Error('No image selected')
  if (!(file instanceof Blob)) throw new Error('Invalid file')
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, WebP, …)')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    throw new Error(`Image is ${mb}MB. Maximum upload size is ${MAX_UPLOAD_MB}MB.`)
  }
  return true
}

/**
 * Compress + resize an image with little visible quality loss.
 * Steps quality down until under targetBytes (or minQuality).
 *
 * @param {File|Blob} file
 * @param {'logo'|'food'|'default'|object} [presetOrOptions]
 * @returns {Promise<{
 *   dataUrl: string,
 *   blob: Blob,
 *   width: number,
 *   height: number,
 *   originalBytes: number,
 *   compressedBytes: number,
 *   quality: number,
 *   mime: string,
 *   savedPercent: number,
 * }>}
 */
export async function compressImage(file, presetOrOptions = 'default') {
  validateImageFile(file)

  const preset =
    typeof presetOrOptions === 'string'
      ? (PRESETS[presetOrOptions] || PRESETS.default)
      : { ...PRESETS.default, ...presetOrOptions }

  const {
    maxWidth,
    maxHeight,
    targetBytes,
    initialQuality,
    minQuality,
  } = preset

  const img = await loadImageFromFile(file)
  const { width, height } = fitSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxWidth, maxHeight)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  // Warm neutral fill avoids black edges when converting PNG transparency
  ctx.fillStyle = '#1a1612'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  const mime = 'image/jpeg'
  let quality = initialQuality
  let blob = await canvasToBlob(canvas, mime, quality)

  // Adaptive quality: keep looking good while shrinking large photos
  while (blob && blob.size > targetBytes && quality > minQuality + 0.02) {
    quality = Math.max(minQuality, quality - 0.07)
    blob = await canvasToBlob(canvas, mime, quality)
  }

  // If still huge (rare), slightly downscale once more
  if (blob && blob.size > targetBytes * 1.35 && (width > 900 || height > 900)) {
    const scale = 0.82
    const w2 = Math.max(1, Math.round(width * scale))
    const h2 = Math.max(1, Math.round(height * scale))
    const c2 = document.createElement('canvas')
    c2.width = w2
    c2.height = h2
    const ctx2 = c2.getContext('2d', { alpha: false })
    ctx2.fillStyle = '#1a1612'
    ctx2.fillRect(0, 0, w2, h2)
    ctx2.imageSmoothingEnabled = true
    ctx2.imageSmoothingQuality = 'high'
    ctx2.drawImage(canvas, 0, 0, w2, h2)
    quality = Math.max(minQuality, quality)
    blob = await canvasToBlob(c2, mime, quality)
    canvas.width = w2
    canvas.height = h2
  }

  if (!blob) throw new Error('Image compression failed')

  const dataUrl = await blobToDataUrl(blob)
  const originalBytes = file.size
  const compressedBytes = blob.size
  const savedPercent =
    originalBytes > 0
      ? Math.max(0, Math.round((1 - compressedBytes / originalBytes) * 100))
      : 0

  return {
    dataUrl,
    blob,
    width: canvas.width,
    height: canvas.height,
    originalBytes,
    compressedBytes,
    quality: Math.round(quality * 100) / 100,
    mime,
    savedPercent,
  }
}

/** @deprecated use compressImage — kept for callers expecting a data URL only */
export async function processImageFile(file, preset = 'default') {
  try {
    const result = await compressImage(file, preset)
    return result.dataUrl
  } catch {
    return null
  }
}

/**
 * Compress + upload via /api/upload → R2.
 * @param {File} file
 * @param {{ key?: string, folder?: string, preset?: 'logo'|'food'|'default', onProgress?: (phase: string) => void }} [options]
 * @returns {Promise<{ url: string, compression: object }>}
 */
export async function uploadImage(file, options = {}) {
  const preset = options.preset || 'default'
  options.onProgress?.('compressing')
  const compression = await compressImage(file, preset)

  options.onProgress?.('uploading')
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataUrl: compression.dataUrl,
      contentType: compression.mime,
      key: options.key || undefined,
      folder: options.folder || undefined,
    }),
  })

  let payload = null
  try {
    payload = await res.json()
  } catch {
    payload = null
  }

  if (!res.ok) {
    throw new Error(payload?.error || `Upload failed (${res.status})`)
  }

  if (!payload?.url) {
    throw new Error(
      'Upload succeeded but no public URL was returned. Set R2_PUBLIC_BASE_URL on the server.',
    )
  }

  options.onProgress?.('done')
  return { url: payload.url, compression }
}

/** Deterministic R2 object key for a shop logo. */
export function shopLogoKey(ownerAddress) {
  return `logos/${String(ownerAddress).toLowerCase()}.jpg`
}

/** Deterministic R2 object key for a menu item image. */
export function itemImageKey(ownerAddress, itemId) {
  return `items/${String(ownerAddress).toLowerCase()}/${itemId}.jpg`
}

export function formatBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
