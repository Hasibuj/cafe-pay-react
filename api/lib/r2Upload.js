/**
 * Shared R2 upload logic for Vercel serverless + local Vite middleware.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomBytes } from 'crypto'

/** Server-side safety cap (client compresses first; 5MB matches upload UI limit). */
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl)
  if (!match) return null
  return {
    contentType: match[1].trim().toLowerCase(),
    buffer: Buffer.from(match[2], 'base64'),
  }
}

export function sanitizeKey(key) {
  if (typeof key !== 'string' || !key.trim()) return null
  const cleaned = key.trim().replace(/^\/+/, '').replace(/\\/g, '/')
  if (cleaned.includes('..') || cleaned.startsWith('/')) return null
  if (!/^[a-zA-Z0-9/_.-]+$/.test(cleaned)) return null
  if (cleaned.length > 200) return null
  return cleaned
}

function extFromContentType(contentType) {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  if (contentType === 'image/gif') return 'gif'
  return 'jpg'
}

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env (local) or Vercel env vars.',
    )
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

function publicBaseUrl() {
  return (process.env.R2_PUBLIC_BASE_URL || process.env.VITE_R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '') || null
}

/**
 * @param {{ dataUrl: string, key?: string, folder?: string, contentType?: string }} body
 * @returns {Promise<{ ok: true, key: string, url: string|null, contentType: string, size: number }>}
 */
export async function uploadImageToR2(body) {
  const bucket = process.env.R2_BUCKET
  if (!bucket) {
    throw Object.assign(new Error('R2_BUCKET is not configured in .env'), { statusCode: 500 })
  }

  const { dataUrl, key: rawKey, folder } = body || {}
  if (!dataUrl) {
    throw Object.assign(new Error('dataUrl is required'), { statusCode: 400 })
  }

  const parsed = parseDataUrl(dataUrl)
  if (!parsed) {
    throw Object.assign(new Error('Invalid dataUrl (expected base64 data URL)'), { statusCode: 400 })
  }

  let contentType = (body.contentType || parsed.contentType || 'image/jpeg').toLowerCase()
  if (!ALLOWED_TYPES.has(contentType)) {
    throw Object.assign(new Error(`Unsupported content type: ${contentType}`), { statusCode: 400 })
  }

  if (!parsed.buffer.length) {
    throw Object.assign(new Error('Empty image payload'), { statusCode: 400 })
  }
  if (parsed.buffer.length > MAX_BYTES) {
    throw Object.assign(new Error(`Image too large (max ${MAX_BYTES} bytes)`), { statusCode: 413 })
  }

  let key = sanitizeKey(rawKey)
  if (!key) {
    const safeFolder = sanitizeKey(folder || 'uploads') || 'uploads'
    const id = `${Date.now()}-${randomBytes(6).toString('hex')}`
    key = `${safeFolder}/${id}.${extFromContentType(contentType)}`
  }

  const client = getR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: parsed.buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  const base = publicBaseUrl()
  return {
    ok: true,
    key,
    url: base ? `${base}/${key}` : null,
    contentType,
    size: parsed.buffer.length,
  }
}
