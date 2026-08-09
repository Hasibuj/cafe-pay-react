import { memo } from 'react'
import { Check, Clock, UtensilsCrossed, ChefHat, BellRing, HandPlatter, CheckCircle2, XCircle } from 'lucide-react'
import { ORDER_FLOW } from '../utils/orders'

const STATUS_ICONS = {
  Pending: Clock,
  Confirmed: Check,
  Preparing: ChefHat,
  Ready: BellRing,
  Serving: HandPlatter,
  Completed: CheckCircle2,
}

function PaymentBadge({ status }) {
  const map = {
    Pending: { label: 'Pending', cls: 'is-pending', icon: Clock },
    Processing: { label: 'Processing', cls: 'is-pending', icon: Clock },
    Successful: { label: 'Successful', cls: 'is-success', icon: Check },
    Failed: { label: 'Failed', cls: 'is-fail', icon: XCircle },
    Cash: { label: 'Cash', cls: 'is-cash', icon: Check },
    Refunded: { label: 'Refunded', cls: 'is-muted', icon: XCircle },
  }
  const cfg = map[status] || map.Pending
  const Icon = cfg.icon
  return (
    <span className={`cp-pay-badge ${cfg.cls}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  )
}

function StatusStepper({ current }) {
  return (
    <ol className="cp-track-steps" aria-label="Order status">
      {ORDER_FLOW.map((step) => {
        const idx = ORDER_FLOW.indexOf(step)
        const curIdx = ORDER_FLOW.indexOf(current)
        const done = curIdx >= 0 && idx < curIdx
        const active = current === step
        const cancelled = current === 'Cancelled'
        const Icon = STATUS_ICONS[step]
        return (
          <li key={step} className={cancelled ? 'is-cancelled' : active ? 'is-active' : done ? 'is-done' : ''}>
            <span className="cp-track-dot">
              {done ? <Check size={11} /> : <Icon size={11} />}
            </span>
            <span className="cp-track-label">{step}</span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Customer-facing live order card. Shows table, items, totals, payment status
 * and the fulfillment stepper — all of which update in real time.
 */
function OrderTracker({ order }) {
  if (!order) return null

  return (
    <section className="cp-card cp-track-card" aria-label={`Order ${order.id}`}>
      <div className="cp-track-head">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <UtensilsCrossed size={16} style={{ color: 'var(--color-brand-400)' }} />
            <h3 className="cp-track-title">Order {order.id}</h3>
            <PaymentBadge status={order.paymentStatus} />
          </div>
          <p className="cp-track-table">
            Table {String(order.tableNumber).padStart(2, '0')} · {order.items.reduce((s, i) => s + (Number(i.qty) || 0), 0)} item
            {order.items.reduce((s, i) => s + (Number(i.qty) || 0), 0) === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <ul className="cp-track-items">
        {order.items.map((it, idx) => (
          <li key={idx} className="cp-track-item">
            <span className="cp-track-qty">×{it.qty}</span>
            <span className="min-w-0 flex-1 truncate">{it.name}{it.size && it.size !== 'regular' ? ` (${it.size})` : ''}</span>
            <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {Number(it.unitPrice || 0).toFixed(2)} USDC
            </span>
          </li>
        ))}
      </ul>

      <div className="cp-track-total">
        <span>Total</span>
        <strong className="tabular-nums">{order.totalUsd.toFixed(2)} USDC</strong>
      </div>

      <div className="cp-track-divider" />

      <div className="cp-track-status">
        <p className="cp-track-status-label">Order status</p>
        {order.orderStatus === 'Cancelled' ? (
          <div className="cp-track-cancelled">
            <XCircle size={16} />
            This order was cancelled.
          </div>
        ) : (
          <StatusStepper current={order.orderStatus} />
        )}
      </div>
    </section>
  )
}

export default memo(OrderTracker)
