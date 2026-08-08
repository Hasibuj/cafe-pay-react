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
