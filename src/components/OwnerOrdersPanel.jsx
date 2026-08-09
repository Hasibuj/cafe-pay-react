import { useEffect } from 'react'
import { ChevronRight, Check, XCircle, Loader2, UtensilsCrossed, Table2, Star } from 'lucide-react'
import { useOrderFeed, useNewOrderSignal } from '../hooks/useOrders'
import { updateOrderStatus, nextOrderStatus } from '../utils/orders'
import { useToast } from '../context/ToastContext'

const PAYMENT_META = {
  Pending: { label: '⏳ Pending', cls: 'is-pending' },
  Processing: { label: '🔄 Processing', cls: 'is-pending' },
  Successful: { label: '✅ Successful', cls: 'is-success' },
  Failed: { label: '❌ Failed', cls: 'is-fail' },
  Cash: { label: '💵 Cash', cls: 'is-cash' },
  Refunded: { label: '↩️ Refunded', cls: 'is-muted' },
}

function PaymentPill({ status }) {
  const cfg = PAYMENT_META[status] || PAYMENT_META.Pending
  return <span className={`cp-pay-pill ${cfg.cls}`}>{cfg.label}</span>
}

function StatusPill({ status }) {
  const cancelled = status === 'Cancelled'
  return (
    <span className={`cp-pay-pill ${cancelled ? 'is-fail' : status === 'Completed' ? 'is-success' : 'is-muted'}`}>
      {status}
    </span>
  )
}

function OrderRow({ order, onExpand }) {
  const lines = order.items || []
  const count = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)
  return (
    <button type="button" onClick={onExpand} className="cp-order-row">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{order.id}</span>
          <span className="cp-table-chip"><Table2 size={11} /> Table {String(order.tableNumber).padStart(2, '0')}</span>
        </div>
        <p className="text-[0.7rem] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
          {lines.map((l) => `${l.qty} × ${l.name}`).join(' · ')}
        </p>
        <p className="text-[0.65rem] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {count} item{count === 1 ? '' : 's'} · {new Date(order.createdAt).toLocaleTimeString()}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-brand-400)' }}>
          {order.totalUsd.toFixed(2)} USDC
        </span>
        <div className="flex items-center gap-1.5">
          <PaymentPill status={order.paymentStatus} />
          <StatusPill status={order.orderStatus} />
        </div>
      </div>
      <ChevronRight size={15} style={{ color: 'var(--text-tertiary)' }} />
    </button>
  )
}

function OrderDetail({ order, onUpdated }) {
  const toast = useToast()
  const [busy, setBusy] = useState(null)

  const advance = nextOrderStatus(order.orderStatus)
  const cancelled = order.orderStatus === 'Cancelled'

  const changeStatus = async (next) => {
    setBusy(next)
    try {
      const { order: updated } = await updateOrderStatus(order.id, next)
      toast.success(`Order ${next}`, `${order.id} is now ${next}. Customer notified in real time.`)
      onUpdated(updated)
    } catch (err) {
      toast.error('Status update failed', err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="cp-order-detail">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h5 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Order {order.id}</h5>
        <div className="flex items-center gap-2">
          <PaymentPill status={order.paymentStatus} />
          <StatusPill status={order.orderStatus} />
        </div>
      </div>

      <div className="cp-order-table">
        <span><Table2 size={12} /> Table {String(order.tableNumber).padStart(2, '0')}</span>
        <span className="text-[0.7rem]" style={{ color: 'var(--text-tertiary)' }}>
          {new Date(order.createdAt).toLocaleDateString()} · {new Date(order.createdAt).toLocaleTimeString()}
        </span>
      </div>

      <ul className="cp-order-items">
        {order.items.map((it, idx) => (
          <li key={idx} className="cp-order-item">
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {it.name}{it.size && it.size !== 'regular' ? ` (${it.size})` : ''}
              </span>
              {it.isFamous && (
                <span className="inline-flex items-center gap-0.5 ml-1 text-[0.6rem] font-bold uppercase" style={{ color: 'var(--color-warning)' }}>
                  <Star size={9} /> Famous
                </span>
              )}
            </div>
            <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--text-secondary)' }}>
              {Number(it.unitPrice).toFixed(2)} × {it.qty}
            </span>
            <span className="text-sm font-semibold tabular-nums w-16 text-right" style={{ color: 'var(--text-primary)' }}>
              {(Number(it.unitPrice) * Number(it.qty)).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      <div className="cp-order-total">
        <span>Total</span>
        <strong className="tabular-nums">{order.totalUsd.toFixed(2)} USDC</strong>
      </div>

      <div className="cp-order-payline">
        <span style={{ color: 'var(--text-secondary)' }}>Payment</span>
        <PaymentPill status={order.paymentStatus} />
        {order.paymentMethod && (
          <span className="text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>{order.paymentMethod}</span>
        )}
      </div>

      {order.txHash && (
        <p className="text-[0.62rem] font-mono break-all mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Tx: {order.txHash}
        </p>
      )}

      <div className="cp-order-actions">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
          Update status
        </p>
        {!cancelled && advance && (
          <button
            type="button"
            onClick={() => changeStatus(advance)}
            disabled={busy != null}
            className="cp-btn cp-btn-primary !min-h-9 !text-xs"
          >
            {busy === advance ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Advance to {advance}
          </button>
        )}
        {!cancelled && (
          <button
            type="button"
            onClick={() => changeStatus('Cancelled')}
            disabled={busy != null}
            className="cp-btn cp-btn-ghost !min-h-9 !text-xs"
            style={{ color: 'var(--color-error)' }}
          >
            {busy === 'Cancelled' ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            Cancel order
          </button>
        )}
        {cancelled && (
          <span className="text-xs font-medium" style={{ color: 'var(--color-error)' }}>
            This order was cancelled.
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Owner order management — live feed with instant new-order notification,
 * full details (table, items, qty, total, payment) and status workflow.
 */
export default function OwnerOrdersPanel({ ownerAddress, enabled, expandedId, onExpandedChange }) {
  const { orders, loading, refresh } = useOrderFeed(ownerAddress)
  const newOrder = useNewOrderSignal(ownerAddress, enabled)

  // Auto-expand newest order when one arrives
  useEffect(() => {
    if (newOrder?.order?.id) onExpandedChange?.(newOrder.order.id)
  }, [newOrder, onExpandedChange])

  const selected = orders.find((o) => o.id === expandedId)

  const handleUpdated = (_updated) => {
    refresh()
  }

  return (
    <section className="cp-owner-section">
      <div className="cp-owner-section-head">
        <h4>
          <UtensilsCrossed size={15} />
          Orders
        </h4>
        <span className="text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>
          {orders.length} order{orders.length === 1 ? '' : 's'} · live
        </span>
      </div>

      {loading && orders.length === 0 ? (
        <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
          Loading orders…
        </p>
      ) : orders.length === 0 ? (
        <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
          No orders yet — new orders will appear here instantly.
        </p>
      ) : (
        <>
          <div className="cp-order-list">
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onExpand={() => onExpandedChange?.(order.id === expandedId ? null : order.id)}
              />
            ))}
          </div>
          {selected && <OrderDetail order={selected} onUpdated={handleUpdated} />}
        </>
      )}
    </section>
  )
}
