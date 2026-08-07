/**
 * Vercel serverless — POST /api/upload → Cloudflare R2
 * Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
 */
import { uploadImageToR2 } from './lib/r2Upload.js'

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(res, status, body, extraHeaders = {}) {
  res.statusCode = status
  const headers = { 'Content-Type': 'application/json', ...extraHeaders }
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  const origin = req.headers?.origin || '*'
  const headers = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' }, headers)
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const result = await uploadImageToR2(body)
    if (!result.url) {
      return json(
        res,
        500,
        { error: 'Upload ok but R2_PUBLIC_BASE_URL (or VITE_R2_PUBLIC_BASE_URL) is missing in env.' },
        headers,
      )
    }
    return json(res, 200, result, headers)
  } catch (err) {
    console.error('[api/upload]', err)
    const status = err.statusCode || 500
    return json(res, status, { error: err.message || 'Upload failed' }, headers)
  }
}
