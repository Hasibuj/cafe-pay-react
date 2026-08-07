/**
 * In-memory shop meta cache (filled from Turso via /api/shop-meta).
 * Sync getters in storage.js read this; React hooks subscribe for re-renders.
 */

const listeners = new Set()
const byOwner = new Map()
const inflight = new Map()
let version = 0

function norm(addr) {
  return addr ? String(addr).toLowerCase() : ''
}

export function subscribeMeta(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getMetaVersion() {
  return version
}

function emit() {
  version += 1
  listeners.forEach((fn) => {
    try {
      fn()
    } catch {
      /* ignore */
    }
  })
}

export function getCachedMeta(ownerAddress) {
  return byOwner.get(norm(ownerAddress)) || null
}

export function setCachedMeta(ownerAddress, bundle) {
  const key = norm(ownerAddress)
  byOwner.set(key, {
    owner: key,
    tagline: bundle.tagline ?? null,
    logoUrl: bundle.logoUrl ?? null,
    items: bundle.items || {},
    updatedAt: bundle.updatedAt ?? Date.now(),
  })
  emit()
}

export function getCachedItem(ownerAddress, itemId) {
  const meta = getCachedMeta(ownerAddress)
  if (!meta) return null
  return meta.items[String(itemId)] || null
}

export async function fetchShopMeta(ownerAddress) {
  const key = norm(ownerAddress)
  if (!key) return null

  if (inflight.has(key)) return inflight.get(key)

  const p = (async () => {
    try {
      const res = await fetch(`/api/shop-meta?owner=${encodeURIComponent(key)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // 503 = Turso not configured — keep working with empty meta / R2 fallbacks
        if (res.status === 503) {
          const empty = { owner: key, tagline: null, logoUrl: null, items: {} }
          setCachedMeta(key, empty)
          return empty
        }
        throw new Error(data.error || `Failed to load shop meta (${res.status})`)
      }
      const bundle = {
        owner: key,
        tagline: data.tagline ?? null,
        logoUrl: data.logoUrl ?? null,
        items: data.items || {},
        updatedAt: data.updatedAt ?? Date.now(),
      }
      setCachedMeta(key, bundle)
      return bundle
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, p)
  return p
}

export async function saveShopFields(ownerAddress, shop) {
  const res = await fetch('/api/shop-meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner: ownerAddress, shop }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Failed to save shop meta')
  setCachedMeta(ownerAddress, data)
  return data
}

export async function saveItemFields(ownerAddress, item) {
  const res = await fetch('/api/shop-meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner: ownerAddress, item }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Failed to save item meta')
  setCachedMeta(ownerAddress, data)
  return data
}
