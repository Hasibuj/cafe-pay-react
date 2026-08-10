/**
 * CafePay live order client API + realtime bridge.
 *
 * REST talks to /api/orders (Vite dev middleware or Vercel serverless).
 * Realtime subscribes to ws(s)://<host>/realtime (dev) and falls back to
 * lightweight polling so production (Vercel, no WS) still updates live.
 */

export const ORDER_FLOW = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Serving', 'Completed']
export const ALLOWED_ORDER_STATUSES = [...ORDER_FLOW, 'Cancelled']

export function nextOrderStatus(current) {
  const i = ORDER_FLOW.indexOf(current)
  if (i === -1 || i >= ORDER_FLOW.length - 1) return null
  return ORDER_FLOW[i + 1]
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Orders API error (${res.status})`)
  return data
}

export function fetchOrdersForOwner(owner) {
  return request(`/api/orders?owner=${encodeURIComponent(owner)}`)
}

export function fetchOrdersForBuyer(buyer) {
  return request(`/api/orders?buyer=${encodeURIComponent(buyer)}`)
}

export function fetchOrderById(id, buyer) {
  return request(`/api/orders?id=${encodeURIComponent(id)}&buyer=${encodeURIComponent(buyer)}`)
}

export function createOrder(payload) {
  return request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateOrderStatus(id, orderStatus) {
  return request('/api/orders', {
    method: 'PATCH',
    body: JSON.stringify({ id, orderStatus }),
  })
}

export function updateOrderPayment(id, paymentStatus, txHash = null, paymentMethod = null) {
  return request('/api/orders', {
    method: 'PATCH',
    body: JSON.stringify({ id, paymentStatus, txHash, paymentMethod }),
  })
}

/* ─── Notifications API ────────────────────────────────────── */

export function fetchNotifications(user) {
  return request(`/api/notifications?user=${encodeURIComponent(user)}`)
}

export function fetchUnreadCount(user) {
  return request(`/api/notifications?user=${encodeURIComponent(user)}&count=1`)
}

export function markNotificationRead(id, user) {
  return request('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ id, user }),
  })
}

export function markAllNotificationsRead(user) {
  return request('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ all: true, user }),
  })
}

export function deleteNotification(id, user) {
  return request('/api/notifications', {
    method: 'DELETE',
    body: JSON.stringify({ id, user }),
  })
}

/** clear: 'read' | 'all' */
export function clearNotifications(user, clear = 'read') {
  return request('/api/notifications', {
    method: 'DELETE',
    body: JSON.stringify({ user, clear }),
  })
}

export const ACTIVE_ORDER_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Serving']
export const HISTORY_ORDER_STATUSES = ['Completed', 'Cancelled']

export function isActiveOrder(order) {
  return ACTIVE_ORDER_STATUSES.includes(order?.orderStatus)
}

export function isHistoryOrder(order) {
  return HISTORY_ORDER_STATUSES.includes(order?.orderStatus)
}

/** Paid revenue that counts toward sales (not cancelled). */
export function isCountedSale(order) {
  if (!order || order.orderStatus === 'Cancelled') return false
  return order.paymentStatus === 'Successful' || order.paymentStatus === 'Cash'
}

function dayKey(ts, timeZone) {
  const d = new Date(ts)
  if (timeZone) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d)
    } catch {
      /* fall through */
    }
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function localDayKey(ts = Date.now()) {
  return dayKey(ts)
}

/**
 * Build sales rollups from an order list (frontend-only; uses existing orders API).
 */
export function buildSalesSummary(orders = []) {
  const paid = (orders || []).filter(isCountedSale)
  const todayKey = localDayKey()
  let todayUsd = 0
  let todayCount = 0
  let totalUsd = 0
  let totalCount = 0
  const byDay = new Map()

  for (const o of paid) {
    const usd = Number(o.totalUsd) || 0
    const key = localDayKey(o.createdAt)
    totalUsd += usd
    totalCount += 1
    if (key === todayKey) {
      todayUsd += usd
      todayCount += 1
    }
    const bucket = byDay.get(key) || { date: key, usd: 0, count: 0 }
    bucket.usd += usd
    bucket.count += 1
    byDay.set(key, bucket)
  }

  const days = [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
  const last7 = days.slice(0, 7)
  const weekUsd = last7.reduce((s, d) => s + d.usd, 0)
  const weekCount = last7.reduce((s, d) => s + d.count, 0)

  return {
    todayKey,
    todayUsd,
    todayCount,
    weekUsd,
    weekCount,
    totalUsd,
    totalCount,
    days,
  }
}

/**
 * Free-text search across order id, table, status, payment, buyer, items.
 */
export function filterOrders(orders, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return orders || []
  return (orders || []).filter((o) => {
    const table = String(o.tableNumber ?? '').padStart(2, '0')
    const items = (o.items || []).map((it) => `${it.qty} ${it.name} ${it.size || ''}`).join(' ')
    const hay = [
      o.id,
      table,
      `table ${table}`,
      o.orderStatus,
      o.paymentStatus,
      o.paymentMethod,
      o.buyer,
      o.txHash,
      String(o.totalUsd),
      items,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

/* ─── Realtime bridge ──────────────────────────────────────── */

const listeners = new Set()
let socket = null
let socketFailed = false
let reconnectTimer = null
const channels = new Set()

function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/realtime`
}

function emit(event) {
  for (const fn of [...listeners]) {
    try {
      fn(event)
    } catch {
      /* ignore */
    }
  }
}

function resubscribe() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    for (const ch of channels) socket.send(JSON.stringify({ channel: ch }))
  }
}

function openSocket() {
  if (socketFailed || socket) return
  try {
    socket = new WebSocket(wsUrl())
  } catch {
    socketFailed = true
    startPolling()
    return
  }

  socket.onopen = () => resubscribe()
  socket.onmessage = (evt) => {
    try {
      const event = JSON.parse(evt.data)
      if (event?.type && (event?.order || event?.notification)) emit(event)
    } catch {
      /* ignore */
    }
  }
  socket.onclose = () => {
    socket = null
    if (!socketFailed) {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(openSocket, 3000)
    }
  }
  socket.onerror = () => {
    socketFailed = true
    socket = null
    startPolling()
  }
}

const pollers = new Set()
let pollTimer = null

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    for (const fn of [...pollers]) {
      try {
        fn()
      } catch {
        /* ignore */
      }
    }
  }, 2500)
}

function stopPolling() {
  if (pollers.size === 0 && pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

/**
 * Subscribe to live realtime events for the given channels.
 * Channels: `owner:<address>` or `buyer:<address>` (lowercased server-side).
 * When WebSocket is unavailable, `poll` is invoked every 2.5s so the UI still
 * refreshes without a page reload.
 */
export function subscribeOrders(channel, { onEvent, onPollFallback = null } = {}) {
  if (channel) channels.add(channel)
  if (onEvent) listeners.add(onEvent)
  if (onPollFallback) {
    pollers.add(onPollFallback)
    if (socketFailed) startPolling()
  }

  if (!socket) openSocket()
  else resubscribe()

  return () => {
    if (onEvent) listeners.delete(onEvent)
    if (onPollFallback) {
      pollers.delete(onPollFallback)
      stopPolling()
    }
  }
}
