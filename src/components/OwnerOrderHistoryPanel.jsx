import { useMemo, useState } from 'react'
import { History, Search, CalendarDays, DollarSign, Filter } from 'lucide-react'
import { useOrderFeed } from '../hooks/useOrders'
import {
  isHistoryOrder,
  filterOrders,
  buildSalesSummary,
  localDayKey,
} from '../utils/orders'
import { OrderRow, OrderDetail } from './OwnerOrdersPanel'

const FILTERS = [
  { id: 'all', label: 'All finished' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Cancelled', label: 'Cancelled' },
]

/**
 * Permanent order archive: search, filter, daily sales — never deletes orders.
 */
export default function OwnerOrderHistoryPanel({
  ownerAddress,
  expandedId,
  onExpandedChange,
}) {
  const { orders, loading } = useOrderFeed(ownerAddress)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dayFilter, setDayFilter] = useState('') // YYYY-MM-DD or ''

  const history = useMemo(
    () => (orders || []).filter(isHistoryOrder),
    [orders],
  )

  const sales = useMemo(() => buildSalesSummary(orders || []), [orders])

  const filtered = useMemo(() => {
    let list = history
    if (statusFilter !== 'all') {
      list = list.filter((o) => o.orderStatus === statusFilter)
    }
    if (dayFilter) {
      list = list.filter((o) => localDayKey(o.createdAt) === dayFilter)
    }
    return filterOrders(list, query)
  }, [history, statusFilter, dayFilter, query])

  const selected = filtered.find((o) => o.id === expandedId)
    || history.find((o) => o.id === expandedId)

  const dayOptions = useMemo(() => {
    const keys = new Set(history.map((o) => localDayKey(o.createdAt)))
    return [...keys].sort((a, b) => (a < b ? 1 : -1))
  }, [history])

  return (
    <div className="cp-history space-y-4">
      {/* Sales strip */}
      <div className="cp-sales-strip">
        <div className="cp-sales-card">
          <span className="cp-dash-stat-label">Sold today</span>
          <span className="cp-sales-value tabular-nums">{sales.todayUsd.toFixed(2)} USDC</span>
          <span className="cp-dash-stat-hint">{sales.todayCount} paid order{sales.todayCount === 1 ? '' : 's'}</span>
        </div>
        <div className="cp-sales-card">
          <span className="cp-dash-stat-label">Last 7 days</span>
          <span className="cp-sales-value tabular-nums">{sales.weekUsd.toFixed(2)} USDC</span>
          <span className="cp-dash-stat-hint">{sales.weekCount} paid orders</span>
        </div>
        <div className="cp-sales-card">
          <span className="cp-dash-stat-label">All-time paid</span>
          <span className="cp-sales-value tabular-nums">{sales.totalUsd.toFixed(2)} USDC</span>
          <span className="cp-dash-stat-hint">{sales.totalCount} orders kept in archive</span>
        </div>
      </div>

      {sales.days.length > 0 && (
        <section className="cp-owner-section">
          <div className="cp-owner-section-head">
            <h4>
              <CalendarDays size={15} />
              Daily sales
            </h4>
            <span className="text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>
              Successful + Cash · not cancelled
            </span>
          </div>
          <ul className="cp-sales-day-list">
            {sales.days.slice(0, 14).map((d) => (
              <li key={d.date}>
                <button
                  type="button"
                  className={`cp-sales-day-row ${dayFilter === d.date ? 'is-active' : ''}`}
                  onClick={() => setDayFilter((cur) => (cur === d.date ? '' : d.date))}
                >
                  <span className="font-medium tabular-nums">{d.date}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {d.count} order{d.count === 1 ? '' : 's'}
                  </span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--color-brand-400)' }}>
                    {d.usd.toFixed(2)} USDC
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {dayFilter && (
            <button
              type="button"
              className="cp-btn cp-btn-ghost !min-h-8 !text-xs mt-2"
              onClick={() => setDayFilter('')}
            >
              Clear day filter ({dayFilter})
            </button>
          )}
        </section>
      )}

      <section className="cp-owner-section">
        <div className="cp-owner-section-head">
          <h4>
            <History size={15} />
            Order history
          </h4>
          <span className="text-[0.65rem] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length} shown · {history.length} archived
          </span>
        </div>

        <div className="cp-history-toolbar">
          <label className="cp-history-search">
            <Search size={14} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="cp-input !min-h-10 !text-sm"
              placeholder="Search order #, table, item, status…"
              aria-label="Search order history"
            />
          </label>

          <div className="cp-history-filters">
            <span className="cp-owner-label !mb-0 flex items-center gap-1">
              <Filter size={11} /> Status
            </span>
            <div className="cp-chip-row">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`cp-filter-chip ${statusFilter === f.id ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {dayOptions.length > 0 && (
            <div className="cp-history-filters">
              <label className="cp-owner-label" htmlFor="history-day">
                <CalendarDays size={11} /> Day
              </label>
              <select
                id="history-day"
                className="cp-input !min-h-10 !text-sm"
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
              >
                <option value="">All days</option>
                {dayOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading && history.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            Loading history…
          </p>
        ) : history.length === 0 ? (
          <div className="text-center py-10">
            <DollarSign size={22} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} className="mx-auto" />
            <p className="text-sm font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
              No completed orders yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              When you finish or cancel a live order, it lands here permanently.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            No orders match your search / filters.
          </p>
        ) : (
          <>
            <div className="cp-order-list mt-3">
              {filtered.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  showDate
                  onExpand={() => onExpandedChange?.(order.id === expandedId ? null : order.id)}
                />
              ))}
            </div>
            {selected && (
              <OrderDetail order={selected} onUpdated={() => {}} readOnly />
            )}
          </>
        )}
      </section>
    </div>
  )
}
