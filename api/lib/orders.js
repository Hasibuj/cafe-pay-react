/**
 * Turso (libSQL) order store for the CafePay live order workflow.
 * Uses the same Turso client as shop/item meta (api/lib/turso.js).
 * Env: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 */
import { getTurso, isTursoConfigured } from './turso.js'

export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Serving', 'Completed', 'Cancelled']
export const PAYMENT_STATUSES = ['Pending', 'Processing', 'Successful', 'Failed', 'Cash', 'Refunded']
export const PAYMENT_METHODS = ['USDC', 'Cash']

export function isOrdersConfigured() {
  return isTursoConfigured()
}

let ordersSchemaReady = null

async function ensureOrdersSchema() {
  if (ordersSchemaReady) return ordersSchemaReady
  ordersSchemaReady = (async () => {
    const db = getTurso()
    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY NOT NULL,
        shop_owner TEXT NOT NULL,
        buyer TEXT NOT NULL,
        table_number INTEGER NOT NULL DEFAULT 0,
        items TEXT NOT NULL,
        total_usd REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'USDC',
        payment_status TEXT NOT NULL DEFAULT 'Pending',
        order_status TEXT NOT NULL DEFAULT 'Pending',
        tx_hash TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_owner ON orders(shop_owner, updated_at)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer, updated_at)`)
  })().catch((err) => {
    ordersSchemaReady = null
    throw err
  })
  return ordersSchemaReady
}

function norm(addr) {
  return String(addr || '').toLowerCase()
}

function mapOrderRow(row) {
  if (!row) return null
  let items = []
  try {
    items = JSON.parse(row.items || '[]')
  } catch {
    items = []
  }
  return {
    id: row.id,
    shopOwner: row.shop_owner,
    buyer: row.buyer,
    tableNumber: Number(row.table_number) || 0,
    items,
    totalUsd: Number(row.total_usd) || 0,
    paymentMethod: row.payment_method || 'USDC',
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    txHash: row.tx_hash || null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function validStatus(value, allowed) {
  return allowed.includes(value) ? value : null
}

export async function createOrder({
  shopOwner,
  buyer,
  tableNumber = 0,
  items = [],
  totalUsd = 0,
  paymentMethod = 'USDC',
  paymentStatus = 'Pending',
}) {
  await ensureOrdersSchema()
  const db = getTurso()
  const id = newId('ORD')
  const now = Date.now()
  const status = validStatus(paymentStatus, PAYMENT_STATUSES) || 'Pending'
  const method = validStatus(paymentMethod, PAYMENT_METHODS) || 'USDC'

  await db.execute({
    sql: `INSERT INTO orders (
            id, shop_owner, buyer, table_number, items, total_usd,
            payment_method, payment_status, order_status, tx_hash, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NULL, ?, ?)`,
    args: [
      id,
      norm(shopOwner),
      norm(buyer),
      Number(tableNumber) || 0,
      JSON.stringify(items),
      Number(totalUsd) || 0,
      method,
      status,
      now,
      now,
    ],
  })
  return getOrderById(id)
}

export async function getOrderById(id) {
  if (!id) return null
  const db = getTurso()
  const res = await db.execute({
    sql: 'SELECT * FROM orders WHERE id = ?',
    args: [String(id)],
  })
  return mapOrderRow(res.rows[0])
}

export async function getOrdersByOwner(owner) {
  if (!owner) return []
  const db = getTurso()
  const res = await db.execute({
    sql: 'SELECT * FROM orders WHERE shop_owner = ? ORDER BY created_at DESC',
    args: [norm(owner)],
  })
  return res.rows.map(mapOrderRow)
}

export async function getOrdersByBuyer(buyer) {
  if (!buyer) return []
  const db = getTurso()
  const res = await db.execute({
    sql: 'SELECT * FROM orders WHERE buyer = ? ORDER BY created_at DESC',
    args: [norm(buyer)],
  })
  return res.rows.map(mapOrderRow)
}

/** Update order fulfillment status (owner advances the kitchen workflow). */
export async function updateOrderStatus(id, orderStatus) {
  const next = validStatus(orderStatus, ORDER_STATUSES)
  if (!next) {
    const err = new Error(`Invalid order status: ${orderStatus}`)
    err.statusCode = 400
    throw err
  }
  await ensureOrdersSchema()
  const db = getTurso()
  await db.execute({
    sql: 'UPDATE orders SET order_status = ?, updated_at = ? WHERE id = ?',
    args: [next, Date.now(), String(id)],
  })
  const updated = await getOrderById(id)
  if (!updated) {
    const err = new Error('Order not found')
    err.statusCode = 404
    throw err
  }
  return updated
}

/** Update payment outcome after the on-chain transaction settles. */
export async function updatePaymentStatus(id, { paymentStatus, paymentMethod = null, txHash = null }) {
  const next = validStatus(paymentStatus, PAYMENT_STATUSES)
  if (!next) {
    const err = new Error(`Invalid payment status: ${paymentStatus}`)
    err.statusCode = 400
    throw err
  }
  await ensureOrdersSchema()
  const db = getTurso()
  const method = paymentMethod ? (validStatus(paymentMethod, PAYMENT_METHODS) || 'USDC') : undefined
  await db.execute({
    sql: method
      ? 'UPDATE orders SET payment_status = ?, payment_method = ?, tx_hash = ?, updated_at = ? WHERE id = ?'
      : 'UPDATE orders SET payment_status = ?, tx_hash = ?, updated_at = ? WHERE id = ?',
    args: method
      ? [next, method, txHash, Date.now(), String(id)]
      : [next, txHash, Date.now(), String(id)],
  })
  const updated = await getOrderById(id)
  if (!updated) {
    const err = new Error('Order not found')
    err.statusCode = 404
    throw err
  }
  return updated
}

/* ─── Notifications ────────────────────────────────────────── */

export const NOTIFICATION_TYPES = [
  'new_order',
  'order_placed',
  'payment',
  'status',
  'cancelled',
  'general',
]

let notifSchemaReady = null

async function ensureNotificationsSchema() {
  if (notifSchemaReady) return notifSchemaReady
  notifSchemaReady = (async () => {
    const db = getTurso()
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        order_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'general',
        title TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `)
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at)`,
    )
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_notifications_order ON notifications(order_id)`,
    )
  })().catch((err) => {
    notifSchemaReady = null
    throw err
  })
  return notifSchemaReady
}

function mapNotificationRow(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    orderId: row.order_id,
    type: row.type,
    title: row.title,
    message: row.message || '',
    isRead: Number(row.is_read) === 1,
    createdAt: Number(row.created_at),
  }
}

/**
 * Create a notification linked to a user (owner or customer) and an order.
 * Returns the persisted notification row.
 */
export async function createNotification({ userId, role, orderId, type = 'general', title, message = '' }) {
  await ensureNotificationsSchema()
  const db = getTurso()
  const id = newId('NOT')
  const now = Date.now()
  await db.execute({
    sql: `INSERT INTO notifications (id, user_id, role, order_id, type, title, message, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    args: [id, norm(userId), role === 'customer' ? 'customer' : 'owner', String(orderId), type, String(title), String(message), now],
  })
  const res = await db.execute({
    sql: 'SELECT * FROM notifications WHERE id = ?',
    args: [id],
  })
  return mapNotificationRow(res.rows[0])
}

/** List a user's notifications, newest first. */
export async function getNotificationsForUser(userId, { limit = 100 } = {}) {
  if (!userId) return []
  await ensureNotificationsSchema()
  const db = getTurso()
  const res = await db.execute({
    sql: 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    args: [norm(userId), Math.max(1, Number(limit) || 100)],
  })
  return res.rows.map(mapNotificationRow)
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0
  await ensureNotificationsSchema()
  const db = getTurso()
  const res = await db.execute({
    sql: 'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0',
    args: [norm(userId)],
  })
  return Number(res.rows[0]?.c || 0)
}

/** Mark a single notification read — only the owner of the notification may do so. */
export async function markNotificationRead(id, userId) {
  await ensureNotificationsSchema()
  const db = getTurso()
  await db.execute({
    sql: 'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    args: [String(id), norm(userId)],
  })
  return true
}

/** Mark every notification for a user as read. */
export async function markAllNotificationsRead(userId) {
  if (!userId) return true
  await ensureNotificationsSchema()
  const db = getTurso()
  await db.execute({
    sql: 'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
    args: [norm(userId)],
  })
  return true
}

/** Delete a single notification (owner of the row only). */
export async function deleteNotification(id, userId) {
  if (!id || !userId) return false
  await ensureNotificationsSchema()
  const db = getTurso()
  await db.execute({
    sql: 'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    args: [String(id), norm(userId)],
  })
  return true
}

/**
 * Clear notifications for a user.
 * @param {{ onlyRead?: boolean }} opts — if onlyRead, delete read ones; else all
 */
export async function clearNotifications(userId, { onlyRead = true } = {}) {
  if (!userId) return 0
  await ensureNotificationsSchema()
  const db = getTurso()
  const sql = onlyRead
    ? 'DELETE FROM notifications WHERE user_id = ? AND is_read = 1'
    : 'DELETE FROM notifications WHERE user_id = ?'
  const res = await db.execute({
    sql,
    args: [norm(userId)],
  })
  return Number(res.rowsAffected || 0)
}
