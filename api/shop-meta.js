/**
 * Vercel serverless — shop / menu off-chain meta (Turso).
 * GET  /api/shop-meta?owner=0x...
 * POST /api/shop-meta  { owner, shop?: { tagline, logoUrl }, item?: {...}, items?: [...] }
 */
import { corsHeaders, sendJson, parseBody } from './lib/http.js'
import {
  getShopBundle,
  upsertShopMeta,
  upsertItemMeta,
  upsertItemsMeta,
  isTursoConfigured,
} from './lib/turso.js'

function isAddress(v) {
  return typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v)
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

  try {
    if (!isTursoConfigured()) {
      return sendJson(
        res,
        503,
        {
          error:
            'Turso not configured. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to .env / Vercel.',
        },
        headers,
      )
    }

    if (req.method === 'GET') {
      let owner = req.query?.owner
      if (!owner && req.url) {
        try {
          owner = new URL(req.url, 'http://localhost').searchParams.get('owner')
        } catch {
          owner = null
        }
      }
      if (!isAddress(owner)) {
        return sendJson(res, 400, { error: 'Query owner must be a valid 0x address' }, headers)
      }
      const bundle = await getShopBundle(owner)
      return sendJson(res, 200, { ok: true, ...bundle }, headers)
    }

    if (req.method === 'POST') {
      // Vercel often pre-parses JSON; local middleware may pass string/stream via parseBody
      const body = typeof req.body === 'object' && req.body && !Buffer.isBuffer(req.body)
        ? req.body
        : parseBody(req)
      const owner = body.owner
      if (!isAddress(owner)) {
        return sendJson(res, 400, { error: 'Body owner must be a valid 0x address' }, headers)
      }

      let bundle = null

      if (body.shop && typeof body.shop === 'object') {
        bundle = await upsertShopMeta(owner, {
          tagline: body.shop.tagline,
          logoUrl: body.shop.logoUrl,
        })
      }

      if (body.item && typeof body.item === 'object') {
        if (body.item.itemId == null) {
          return sendJson(res, 400, { error: 'item.itemId is required' }, headers)
        }
        bundle = await upsertItemMeta(owner, body.item)
      }

      if (Array.isArray(body.items) && body.items.length) {
        bundle = await upsertItemsMeta(owner, body.items)
      }

      if (!bundle) {
        // bare refresh
        bundle = await getShopBundle(owner)
      }

      return sendJson(res, 200, { ok: true, ...bundle }, headers)
    }

    return sendJson(res, 405, { error: 'Method not allowed' }, headers)
  } catch (err) {
    console.error('[api/shop-meta]', err)
    return sendJson(
      res,
      err.statusCode || 500,
      { error: err.message || 'Shop meta failed' },
      headers,
    )
  }
}
