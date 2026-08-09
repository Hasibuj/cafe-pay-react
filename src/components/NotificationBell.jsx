import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck, ShoppingBag } from 'lucide-react'
import { useNotifications } from '../hooks/useOrders'

const TYPE_ICON = {
  new_order: '🔔',
  order_placed: '📦',
  payment: '💳',
  status: '🔔',
  cancelled: '❌',
  general: 'ℹ️',
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}

/**
 * Customer notification bell — shows unread badge and a dropdown of the
 * current customer's own notifications (never anyone else's).
 */
export default function NotificationBell({ address }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const { notifications, unread, loading, markRead, markAllRead } = useNotifications(address, 'customer', Boolean(address))

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (!address) return null

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="cp-bell-btn"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={17} />
        {unread > 0 && <span className="cp-bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="cp-notif-panel animate-scale-in" role="dialog" aria-label="Your notifications">
          <div className="cp-notif-panel-head">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="cp-notif-markall"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="cp-notif-list">
            {loading ? (
              <div className="cp-notif-empty">
                <div className="cp-spinner" aria-hidden />
                <p>Loading notifications…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="cp-notif-empty">
                <ShoppingBag size={22} strokeWidth={1.5} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No notifications yet</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Order something and we'll keep you posted here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id)}
                  className={`cp-notif-item ${n.isRead ? '' : 'is-unread'}`}
                >
                  <span className="cp-notif-item-icon" aria-hidden>{TYPE_ICON[n.type] || 'ℹ️'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.78rem] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {n.title}
                    </span>
                    <span className="block text-[0.7rem] leading-snug mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {n.message}
                    </span>
                    <span className="block text-[0.62rem] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  {!n.isRead && <span className="cp-notif-dot" aria-hidden />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
