/**
 * Turso (libSQL) client + schema for CafePay off-chain shop/menu meta.
 * Env: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 */
import { createClient } from '@libsql/client'

let client = null
let schemaReady = null

export function isTursoConfigured() {
  return Boolean(process.env.TURSO_DATABASE_URL)
}

export function getTurso() {
  if (!isTursoConfigured()) {
    const err = new Error(
      'Turso is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env (and Vercel env).',
    )
    err.statusCode = 503
    throw err
  }
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })
  }
  return client
}

export async function ensureSchema() {
  if (schemaReady) return schemaReady
  schemaReady = (async () => {
    const db = getTurso()
    await db.execute(`
      CREATE TABLE IF NOT EXISTS shop_meta (
        owner_address TEXT PRIMARY KEY NOT NULL,
        tagline TEXT,
        logo_url TEXT,
        updated_at INTEGER NOT NULL
      )
    `)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS item_meta (
        owner_address TEXT NOT NULL,
        item_id TEXT NOT NULL,
        name_override TEXT,
        price_override TEXT,
        description TEXT,
        image_url TEXT,
        price_medium REAL,
        price_large REAL,
        deleted INTEGER NOT NULL DEFAULT 0,
        available INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (owner_address, item_id)
      )
    `)
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_item_meta_owner ON item_meta(owner_address)`,
    )
  })().catch((err) => {
    schemaReady = null
    throw err
  })
  return schemaReady
}

function norm(addr) {
  return String(addr || '').toLowerCase()
}

function itemIdStr(id) {
  return String(id)
}

function mapItemRow(row) {
  if (!row) return null
  return {
    itemId: row.item_id,
    nameOverride: row.name_override || null,
    priceOverride: row.price_override || null,
    description: row.description || '',
    imageUrl: row.image_url || null,
    priceMedium: row.price_medium != null ? Number(row.price_medium) : null,
    priceLarge: row.price_large != null ? Number(row.price_large) : null,
    deleted: Number(row.deleted) === 1,
    available: Number(row.available) !== 0,
    updatedAt: row.updated_at,
  }
}

export async function getShopBundle(ownerAddress) {
  await ensureSchema()
  const db = getTurso()
  const owner = norm(ownerAddress)

  const shop = await db.execute({
    sql: 'SELECT owner_address, tagline, logo_url, updated_at FROM shop_meta WHERE owner_address = ?',
    args: [owner],
  })

  const items = await db.execute({
    sql: 'SELECT * FROM item_meta WHERE owner_address = ?',
    args: [owner],
  })

  const shopRow = shop.rows[0]
  const itemsMap = {}
  for (const row of items.rows) {
    const mapped = mapItemRow(row)
    itemsMap[mapped.itemId] = mapped
  }

  return {
    owner,
    tagline: shopRow?.tagline || null,
    logoUrl: shopRow?.logo_url || null,
    updatedAt: shopRow?.updated_at || null,
    items: itemsMap,
  }
}

export async function upsertShopMeta(ownerAddress, { tagline, logoUrl } = {}) {
  await ensureSchema()
  const db = getTurso()
  const owner = norm(ownerAddress)
  const now = Date.now()

  const existing = await db.execute({
    sql: 'SELECT tagline, logo_url FROM shop_meta WHERE owner_address = ?',
    args: [owner],
  })
  const prev = existing.rows[0]
  const nextTagline = tagline !== undefined ? tagline : (prev?.tagline ?? null)
  const nextLogo = logoUrl !== undefined ? logoUrl : (prev?.logo_url ?? null)

  await db.execute({
    sql: `INSERT INTO shop_meta (owner_address, tagline, logo_url, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(owner_address) DO UPDATE SET
            tagline = excluded.tagline,
            logo_url = excluded.logo_url,
            updated_at = excluded.updated_at`,
    args: [owner, nextTagline, nextLogo, now],
  })

  return getShopBundle(owner)
}

export async function upsertItemMeta(ownerAddress, item) {
  await ensureSchema()
  const db = getTurso()
  const owner = norm(ownerAddress)
  const itemId = itemIdStr(item.itemId)
  const now = Date.now()

  const existing = await db.execute({
    sql: 'SELECT * FROM item_meta WHERE owner_address = ? AND item_id = ?',
    args: [owner, itemId],
  })
  const prev = existing.rows[0]

  const next = {
    name_override:
      item.nameOverride !== undefined ? item.nameOverride : (prev?.name_override ?? null),
    price_override:
      item.priceOverride !== undefined ? item.priceOverride : (prev?.price_override ?? null),
    description:
      item.description !== undefined ? item.description : (prev?.description ?? null),
    image_url: item.imageUrl !== undefined ? item.imageUrl : (prev?.image_url ?? null),
    price_medium:
      item.priceMedium !== undefined ? item.priceMedium : (prev?.price_medium ?? null),
    price_large:
      item.priceLarge !== undefined ? item.priceLarge : (prev?.price_large ?? null),
    deleted:
      item.deleted !== undefined
        ? item.deleted
          ? 1
          : 0
        : (prev?.deleted ?? 0),
    available:
      item.available !== undefined
        ? item.available
          ? 1
          : 0
        : (prev?.available ?? 1),
  }

  await db.execute({
    sql: `INSERT INTO item_meta (
            owner_address, item_id, name_override, price_override, description,
            image_url, price_medium, price_large, deleted, available, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(owner_address, item_id) DO UPDATE SET
            name_override = excluded.name_override,
            price_override = excluded.price_override,
            description = excluded.description,
            image_url = excluded.image_url,
            price_medium = excluded.price_medium,
            price_large = excluded.price_large,
            deleted = excluded.deleted,
            available = excluded.available,
            updated_at = excluded.updated_at`,
    args: [
      owner,
      itemId,
      next.name_override,
      next.price_override,
      next.description,
      next.image_url,
      next.price_medium,
      next.price_large,
      next.deleted,
      next.available,
      now,
    ],
  })

  return getShopBundle(owner)
}

/** Batch upsert several items (e.g. after add item with image + desc). */
export async function upsertItemsMeta(ownerAddress, items = []) {
  let bundle = null
  for (const item of items) {
    bundle = await upsertItemMeta(ownerAddress, item)
  }
  return bundle || getShopBundle(ownerAddress)
}
