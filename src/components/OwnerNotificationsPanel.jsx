import { CheckCheck, Bell, ArrowRight, Trash2, Eraser } from 'lucide-react'
import { useNotifications } from '../hooks/useOrders'
import { useToast } from '../context/ToastContext'

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
  return new Date(ts).toLocaleString()
}

/**
 * Owner alerts — mark read, dismiss one, clear read. Orders are never deleted;
 * completed tickets live under History.
 */
export default function OwnerNotificationsPanel({ ownerAddress, enabled, onViewOrder }) {
  const toast = useToast()
  const {
    notifications,
    unread,
    loading,
    markRead,
    markAllRead,
    dismiss,
    clearRead,
  } = useNotifications(ownerAddress, 'owner', enabled)

  const readCount = notifications.filter((n) => n.isRead).length

  const handleMarkAll = async () => {
    await markAllRead()
    toast.success('Notifications', 'All alerts marked as read.')
  }

  const handleClearRead = async () => {
    if (readCount === 0) return
    if (!window.confirm(`Remove ${readCount} read alert${readCount === 1 ? '' : 's'}? Orders stay in History.`)) return
    await clearRead()
    toast.success('Alerts cleared', 'Read notifications removed. Order history is untouched.')
  }

  const handleDismiss = async (id) => {
    await dismiss(id)
  }

  return (
    <section className="cp-owner-section">
      <div className="cp-owner-section-head">
        <h4 className="flex items-center gap-1.5">
          <Bell size={15} />
          Alerts
          {unread > 0 && <span className="cp-notif-badge-inline">{unread}</span>}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {notifications.length > 0 && unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="cp-btn cp-btn-ghost !min-h-8 !px-2.5 !text-[0.65rem]"
            >
              <CheckCheck size={12} />
              Mark all read
            </button>
          )}
          {readCount > 0 && (
            <button
              type="button"
              onClick={handleClearRead}
              className="cp-btn cp-btn-ghost !min-h-8 !px-2.5 !text-[0.65rem]"
            >
              <Eraser size={12} />
              Clear read
            </button>
          )}
        </div>
      </div>

      <p className="cp-field-hint !mt-0 mb-3">
        New orders and payments show here. Finishing an order does not delete it —
        check History to look up order #, table, or past sales. Dismiss only clears the alert.
      </p>

      {loading && notifications.length === 0 ? (
        <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
          Loading notifications…
        </p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8">
          <Bell size={22} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} className="mx-auto" />
          <p className="text-sm font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
            No alerts
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            You will be notified for new orders and payments.
          </p>
        </div>
      ) : (
        <ul className="cp-notif-list cp-notif-list-owner">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`cp-notif-item ${n.isRead ? '' : 'is-unread'}`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                onClick={() => markRead(n.id)}
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
              </button>
              <div className="cp-notif-actions">
                {onViewOrder && n.orderId && (
                  <button
                    type="button"
                    onClick={() => {
                      markRead(n.id)
                      onViewOrder(n.orderId)
                    }}
                    className="cp-btn cp-btn-ghost !min-h-8 !px-2.5 !text-[0.65rem] shrink-0"
                  >
                    View
                    <ArrowRight size={11} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDismiss(n.id)}
                  className="cp-btn cp-btn-ghost !min-h-8 !px-2 !text-[0.65rem] shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="Dismiss alert"
                  aria-label="Dismiss alert"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {!n.isRead && <span className="cp-notif-dot" aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
