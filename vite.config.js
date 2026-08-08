import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { WebSocketServer } from 'ws'
import { uploadImageToR2 } from './api/lib/r2Upload.js'
import {
  getShopBundle,
  upsertShopMeta,
  upsertItemMeta,
  upsertItemsMeta,
  isTursoConfigured,
} from './api/lib/turso.js'
import { handleOrders, handleNotifications } from './api/lib/ordersHttp.js'
import { createRealtimeHub } from './api/lib/realtimeHub.js'

function applyEnv(env) {
  for (const [key, value] of Object.entries(env)) {
    if (value != null && value !== '' && process.env[key] == null) {
      process.env[key] = value
    }
  }
}

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw)
}

/**
 * Local Vite middleware for /api/upload, /api/shop-meta, /api/orders (loads .env)
 * plus a WebSocket /realtime channel for live order updates.
 */
function localApis(env) {
  applyEnv(env)

  const hub = createRealtimeHub()
  let wss = null

  function ensureWss(server) {
    if (wss) return wss
    wss = new WebSocketServer({ noServer: true })
    server.httpServer.on('upgrade', (req, socket, head) => {
      let pathname = ''
      try {
        pathname = new URL(req.url || '', 'http://localhost').pathname
      } catch {
        pathname = req.url || ''
      }
      if (pathname !== '/realtime') return
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    })
    wss.on('connection', (ws) => {
      const unsubscribe = hub.addSocket(ws)
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString())
          if (msg?.channel) hub.subscribe(ws, String(msg.channel))
        } catch {
          /* ignore malformed */
        }
      })
      ws.on('close', unsubscribe)
      ws.on('error', unsubscribe)
    })
    return wss
  }

  function publish(event) {
    hub.publish(event)
  }

  return {
    name: 'local-cafe-apis',
    configureServer(server) {
      ensureWss(server)

      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]

        // Live orders — own path handling (create / update / query)
        if (path === '/api/orders') {
          return handleOrders(req, res, publish)
        }

        // Live notifications — query + mark read
        if (path === '/api/notifications') {
          return handleNotifications(req, res, publish)
        }

        if (path !== '/api/upload' && path !== '/api/shop-meta') return next()

        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        try {
          if (path === '/api/upload') {
            if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
            const body = await readBody(req)
            const result = await uploadImageToR2(body)
            if (!result.url) {
              return json(res, 500, {
                error: 'Upload ok but R2_PUBLIC_BASE_URL missing in .env',
              })
            }
            return json(res, 200, result)
          }

          if (path === '/api/shop-meta') {
            if (!isTursoConfigured()) {
              return json(res, 503, {
                error:
                  'Turso not configured. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to .env',
              })
            }

            if (req.method === 'GET') {
              const u = new URL(req.url || '', 'http://localhost')
              const owner = u.searchParams.get('owner')
              if (!owner || !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
                return json(res, 400, { error: 'Query owner must be a valid 0x address' })
              }
              const bundle = await getShopBundle(owner)
              return json(res, 200, { ok: true, ...bundle })
            }

            if (req.method === 'POST') {
              const body = await readBody(req)
              const owner = body.owner
              if (!owner || !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
                return json(res, 400, { error: 'Body owner must be a valid 0x address' })
              }
              let bundle = null
              if (body.shop) {
                bundle = await upsertShopMeta(owner, {
                  tagline: body.shop.tagline,
                  logoUrl: body.shop.logoUrl,
                })
              }
              if (body.item) {
                if (body.item.itemId == null) {
                  return json(res, 400, { error: 'item.itemId is required' })
                }
                bundle = await upsertItemMeta(owner, body.item)
              }
              if (Array.isArray(body.items) && body.items.length) {
                bundle = await upsertItemsMeta(owner, body.items)
              }
              if (!bundle) bundle = await getShopBundle(owner)
              return json(res, 200, { ok: true, ...bundle })
            }

            return json(res, 405, { error: 'Method not allowed' })
          }
        } catch (err) {
          console.error('[vite local api]', path, err)
          return json(res, err.statusCode || 500, { error: err.message || 'API failed' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), localApis(env)],
    css: {
      postcss: { plugins: [] },
    },
    envPrefix: ['VITE_'],
  }
})
