import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchOrdersForOwner,
  fetchOrderById,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearNotifications,
  subscribeOrders,
} from '../utils/orders'

/**
 * Live list of orders for one shop owner.
 * Updates in real time via WebSocket; falls back to lightweight polling.
 */
export function useOrderFeed(ownerAddress) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const ownerRef = useRef(ownerAddress)

  useEffect(() => {
    ownerRef.current = ownerAddress
  }, [ownerAddress])

  const applyOrder = useCallback((incoming) => {
    setOrders((list) => {
      const idx = list.findIndex((o) => o.id === incoming.id)
      if (idx === -1) return [incoming, ...list]
      const next = [...list]
      if (JSON.stringify(next[idx]) !== JSON.stringify(incoming)) {
        next[idx] = incoming
      }
      return next
    })
  }, [])

  useEffect(() => {
    const owner = ownerRef.current
    if (!owner) {
      setOrders([])
      return undefined
    }

    let cancelled = false
    setLoading(true)

    const load = async () => {
      try {
        const { orders: next } = await fetchOrdersForOwner(owner)
        if (!cancelled) {
          setOrders(next || [])
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    const unsubscribe = subscribeOrders(`owner:${owner}`, {
      onEvent: (evt) => {
        if (evt.order?.shopOwner?.toLowerCase() !== owner) return
        applyOrder(evt.order)
      },
      onPollFallback: load,
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [ownerAddress, applyOrder])

  return { orders, loading, refresh: useCallback(() => {
    const owner = ownerRef.current
    if (!owner) return Promise.resolve()
    return fetchOrdersForOwner(owner).then(({ orders: next }) => setOrders(next || []))
  }, []) }
}

/**
 * Track a single order for a buyer in real time (customer view).
 * Only returns the order if it belongs to `buyer` (server enforces this too).
 */
export function useOrderTracker(orderId, buyer) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(Boolean(orderId))
  const [error, setError] = useState(null)
  const key = orderId && buyer ? `${orderId}:${buyer}` : null

  useEffect(() => {
    if (!key) {
      setOrder(null)
      setLoading(false)
      setError(null)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const [id, buyerAddr] = key.split(':')

    const load = async () => {
      try {
        const { order: next } = await fetchOrderById(id, buyerAddr)
        if (cancelled) return
        setOrder(next || null)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    load()

    const unsubscribe = subscribeOrders(`buyer:${buyerAddr}`, {
      onEvent: (event) => {
        if (event.order?.id === id) setOrder(event.order)
      },
      onPollFallback: load,
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [key])

  return { order, loading, error }
}

/**
 * Subscribe to new-order events for the owner without maintaining the full list
 * (used for instant notifications + unread badge).
 */
export function useNewOrderSignal(ownerAddress, enabled) {
  const [lastEvent, setLastEvent] = useState(null)

  useEffect(() => {
    if (!ownerAddress || !enabled) {
      setLastEvent(null)
      return undefined
    }
    return subscribeOrders(`owner:${ownerAddress}`, {
      onEvent: (event) => {
        if (event.type === 'order.created' && event.order?.shopOwner?.toLowerCase() === ownerAddress) {
          setLastEvent(event)
        }
      },
    })
  }, [ownerAddress, enabled])

  return lastEvent
}

/**
 * Live notifications for a single user (owner or customer).
 * `role` selects the realtime channel: owner:<addr> or buyer:<addr>.
 * Realtime events keep the list + unread count in sync without a refresh.
 */
export function useNotifications(userId, role = 'owner', enabled = true) {
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const roleRef = useRef(role)

  useEffect(() => {
    roleRef.current = role
  }, [role])

  const upsertNotification = useCallback((incoming) => {
    setNotifications((list) => {
      const idx = list.findIndex((n) => n.id === incoming.id)
      if (idx === -1) return [incoming, ...list]
      const next = [...list]
      if (JSON.stringify(next[idx]) !== JSON.stringify(incoming)) next[idx] = incoming
      return next
    })
    setUnread((n) => (incoming.isRead ? n : n + 1))
  }, [])

  const load = useCallback(async () => {
    const user = userId
    if (!user) return
    try {
      const [list, count] = await Promise.all([
        fetchNotifications(user),
        fetchUnreadCount(user),
      ])
      setNotifications(list?.notifications || [])
      setUnread(count?.count || 0)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }, [userId])

  useEffect(() => {
    const user = userId
    if (!user || !enabled) {
      setNotifications([])
      setUnread(0)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })

    const channel = roleRef.current === 'customer' ? `buyer:${user}` : `owner:${user}`
    const unsubscribe = subscribeOrders(channel, {
      onEvent: (event) => {
        if (event.type === 'notification.created' && event.notification?.userId?.toLowerCase() === user) {
          upsertNotification(event.notification)
        }
      },
      onPollFallback: load,
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [userId, enabled, load, upsertNotification])

  const markRead = useCallback(async (id) => {
    if (!userId) return
    try {
      await markNotificationRead(id, userId)
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
      setUnread((n) => Math.max(0, n - 1))
    } catch {
      /* ignore */
    }
  }, [userId])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    try {
      await markAllNotificationsRead(userId)
      setNotifications((list) => list.map((n) => ({ ...n, isRead: true })))
      setUnread(0)
    } catch {
      /* ignore */
    }
  }, [userId])

  const dismiss = useCallback(async (id) => {
    if (!userId || !id) return
    try {
      await deleteNotification(id, userId)
      setNotifications((list) => {
        const target = list.find((n) => n.id === id)
        if (target && !target.isRead) setUnread((u) => Math.max(0, u - 1))
        return list.filter((n) => n.id !== id)
      })
    } catch {
      /* ignore */
    }
  }, [userId])

  const clearRead = useCallback(async () => {
    if (!userId) return
    try {
      await clearNotifications(userId, 'read')
      setNotifications((list) => list.filter((n) => !n.isRead))
    } catch {
      /* ignore */
    }
  }, [userId])

  const clearAll = useCallback(async () => {
    if (!userId) return
    try {
      await clearNotifications(userId, 'all')
      setNotifications([])
      setUnread(0)
    } catch {
      /* ignore */
    }
  }, [userId])

  return {
    notifications,
    unread,
    loading,
    error,
    markRead,
    markAllRead,
    dismiss,
    clearRead,
    clearAll,
    refresh: load,
  }
}