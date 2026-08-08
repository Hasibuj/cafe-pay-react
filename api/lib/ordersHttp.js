/**
 * Shared HTTP handling for the CafePay order + notification API.
 * Used by the Vercel serverless function AND the local Vite dev middleware.
 *
 * ORDERS
 *   GET   /api/orders?owner=0x...          → orders for a shop owner
 *   GET   /api/orders?buyer=0x...          → orders placed by one customer
 *   GET   /api/orders?id=ORD-...&buyer=0x  → single order (buyer-scoped)
 *   POST  /api/orders                      → create order
 *   PATCH /api/orders                      → { id, orderStatus } | { id, paymentStatus, txHash }
 *
 * NOTIFICATIONS
 *   GET    /api/notifications?user=0x...&role=owner|customer
 *   GET    /api/notifications/count?user=0x...&role=owner|customer
 *   PATCH  /api/notifications/read      → { id, user }
 *   PATCH  /api/notifications/read-all  → { user }
 *
 * `publish` (optional) receives realtime events ({ type, order?, notification? })
 * after every mutation so the local WebSocket hub can broadcast live updates.
 */
import { corsHeaders, sendJson, readNodeBody } from './http.js'
import {
  createOrder,
  getOrdersByOwner,
  getOrdersByBuyer,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  isOrdersConfigured,
  createNotification,
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from './orders.js'

function isAddress(v) {
  return typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v)
}

function fmtItems(order) {
  return (order?.items || [])
    .map((it) => `${it.qty} × ${it.name}`)
    .join(', ')
}

async function notifyNewOrder(order, publish) {
  const ownerNotif = await createNotification({
    userId: order.shopOwner,
    role: 'owner',
    orderId: order.id,
    type: 'new_order',
    title: `New Order ${order.id}`,
    message: `Table ${order.tableNumber} · ${fmtItems(order)} · Total ${order.totalUsd} USDC · Payment ${order.paymentStatus}`,
  })
  if (publish) {
    publish({ type: 'notification.created', notification: ownerNotif, channels: [`owner:${order.shopOwner}`] })
    publish({ type: 'order.created', order })
  }
  return ownerNotif
}

async function notifyPayment(order, publish) {
  const title = order.paymentStatus === 'Successful'
    ? 'Payment Successful'
    : order.paymentStatus === 'Failed'
      ? 'Payment Failed'
      : `Payment ${order.paymentStatus}`
  const ownerNotif = await createNotification({
    userId: order.shopOwner,
    role: 'owner',
    orderId: order.id,
    type: 'payment',
    title,
    message: `${order.id} · ${order.totalUsd} USDC (${order.paymentMethod}) · ${order.paymentStatus}`,
  })
  const buyerNotif = await createNotification({
    userId: order.buyer,
    role: 'customer',
    orderId: order.id,
    type: 'payment',
    title,
    message: `Your payment of ${order.totalUsd} USDC was ${order.paymentStatus === 'Successful' ? 'successful' : order.paymentStatus === 'Failed' ? 'not successful' : order.paymentStatus}.`,
  })
  if (publish) {
    publish({ type: 'notification.created', notification: ownerNotif, channels: [`owner:${order.shopOwner}`] })
    publish({ type: 'notification.created', notification: buyerNotif, channels: [`buyer:${order.buyer}`] })
    publish({ type: 'order.updated', order })
  }
}

async function notifyStatusChange(order, prevStatus, publish) {
  const status = order.orderStatus
  const title = status === 'Cancelled' ? 'Order Cancelled' : `Order ${status}`
  const buyerNotif = await createNotification({
    userId: order.buyer,
    role: 'customer',
    orderId: order.id,
    type: status === 'Cancelled' ? 'cancelled' : 'status',
    title,
    message: `Your order ${order.id} is now ${status}.`,
  })
  const ownerNotif = await createNotification({
    userId: order.shopOwner,
    role: 'owner',
    orderId: order.id,
    type: 'status',
    title,
    message: `${order.id} moved from ${prevStatus || 'Pending'} to ${status}.`,
  })
  if (publish) {
    publish({ type: 'notification.created', notification: buyerNotif, channels: [`buyer:${order.buyer}`] })
    publish({ type: 'notification.created', notification: ownerNotif, channels: [`owner:${order.shopOwner}`] })
    publish({ type: 'order.updated', order })
  }
}

function jsonHeaders(origin) {
  return corsHeaders(origin)
}

export async function handleOrders(req, res, publish) {
  const origin = req.headers?.origin || '*'
  const headers = jsonHeaders(origin)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
    res.end()
    return
  }

  try {
    if (!isOrdersConfigured()) {
      return sendJson(
        res,
        503,
        { error: 'Orders require Turso. Add TURSO_DATABASE_URL / TURSO_AUTH_TOKEN.' },
        headers,
      )
    }

    if (req.method === 'GET') {
      const q = new URL(req.url || '/', 'http://localhost').searchParams
      const owner = q.get('owner')
      const buyer = q.get('buyer')
      const id = q.get('id')

      if (id) {
        if (!buyer || !isAddress(buyer)) {
          return sendJson(res, 400, { error: 'buyer address required for order lookup' }, headers)
        }
        const order = await getOrderById(id)
        if (!order || order.buyer !== String(buyer).toLowerCase()) {
          return sendJson(res, 404, { error: 'Order not found' }, headers)
        }
        return sendJson(res, 200, { ok: true, order }, headers)
      }

      if (owner && isAddress(owner)) {
        const orders = await getOrdersByOwner(owner)
        return sendJson(res, 200, { ok: true, orders }, headers)
      }

      if (buyer && isAddress(buyer)) {
        const orders = await getOrdersByBuyer(buyer)
        return sendJson(res, 200, { ok: true, orders }, headers)
      }

      return sendJson(res, 400, { error: 'Provide owner or buyer address' }, headers)
    }

    if (req.method === 'POST') {
      const body = await readNodeBody(req)
      const shopOwner = body.shopOwner
      const buyer = body.buyer
      if (!isAddress(shopOwner) || !isAddress(buyer)) {
        return sendJson(res, 400, { error: 'shopOwner and buyer must be 0x addresses' }, headers)
      }
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return sendJson(res, 400, { error: 'Order needs at least one item' }, headers)
      }
      const order = await createOrder({
        shopOwner,
        buyer,
        tableNumber: Number(body.tableNumber) || 0,
        items: body.items,
        totalUsd: Number(body.totalUsd) || 0,
        paymentMethod: body.paymentMethod || 'USDC',
        paymentStatus: body.paymentStatus || 'Pending',
      })
      await notifyNewOrder(order, publish)
      return sendJson(res, 201, { ok: true, order }, headers)
    }

    if (req.method === 'PATCH') {
      const body = await readNodeBody(req)
      if (!body.id) {
        return sendJson(res, 400, { error: 'Order id required' }, headers)
      }

      if (body.orderStatus) {
        const prev = (await getOrderById(body.id))?.orderStatus
        const order = await updateOrderStatus(body.id, body.orderStatus)
        await notifyStatusChange(order, prev, publish)
        return sendJson(res, 200, { ok: true, order }, headers)
      }

      if (body.paymentStatus) {
        const order = await updatePaymentStatus(body.id, {
          paymentStatus: body.paymentStatus,
          paymentMethod: body.paymentMethod || null,
          txHash: body.txHash || null,
        })
        await notifyPayment(order, publish)
        return sendJson(res, 200, { ok: true, order }, headers)
      }

      return sendJson(res, 400, { error: 'Provide orderStatus or paymentStatus' }, headers)
    }

    return sendJson(res, 405, { error: 'Method not allowed' }, headers)
  } catch (err) {
    console.error('[api/orders]', err)
    return sendJson(res, err.statusCode || 500, { error: err.message || 'Orders API failed' }, headers)
  }
}

export async function handleNotifications(req, res, _publish) {
  const origin = req.headers?.origin || '*'
  const headers = jsonHeaders(origin)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
    res.end()
    return
  }

  try {
    if (!isOrdersConfigured()) {
      return sendJson(
        res,
        503,
        { error: 'Notifications require Turso. Add TURSO_DATABASE_URL / TURSO_AUTH_TOKEN.' },
        headers,
      )
    }

    const q = new URL(req.url || '/', 'http://localhost').searchParams

    if (req.method === 'GET') {
      const user = q.get('user')
      if (!user || !isAddress(user)) {
        return sendJson(res, 400, { error: 'user address required' }, headers)
      }
      if (q.get('count')) {
        const count = await getUnreadNotificationCount(user)
        return sendJson(res, 200, { ok: true, count }, headers)
      }
      const notifications = await getNotificationsForUser(user)
      return sendJson(res, 200, { ok: true, notifications }, headers)
    }

    if (req.method === 'PATCH') {
      const body = await readNodeBody(req)
      if (body.all) {
        if (!isAddress(body.user)) {
          return sendJson(res, 400, { error: 'user address required' }, headers)
        }
        await markAllNotificationsRead(body.user)
        return sendJson(res, 200, { ok: true }, headers)
      }
      if (body.id && isAddress(body.user)) {
        await markNotificationRead(body.id, body.user)
        return sendJson(res, 200, { ok: true }, headers)
      }
      return sendJson(res, 400, { error: 'Provide { id, user } or { all: true, user }' }, headers)
    }

    return sendJson(res, 405, { error: 'Method not allowed' }, headers)
  } catch (err) {
    console.error('[api/notifications]', err)
    return sendJson(res, err.statusCode || 500, { error: err.message || 'Notifications API failed' }, headers)
  }
}
