import { memo } from 'react'
import { CheckCircle, ExternalLink, Download, ArrowLeft } from 'lucide-react'
import { arcTestnet } from '../config/wagmi'

function ReceiptModal({ receipt }) {
  if (!receipt) return null

  return (
    <div
      className="cp-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Payment receipt"
    >
      <div className="cp-modal animate-scale-in">
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'oklch(0.68 0.12 145 / 0.14)' }}
          >
            <CheckCircle size={28} style={{ color: 'var(--color-success)' }} />
          </div>
          <h3 className="font-display text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Payment successful
          </h3>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            Receipt from {receipt.shopName}
          </p>
        </div>

        <div
          className="rounded-xl p-4 space-y-3.5 mb-6 border"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border-default)',
          }}
        >
          <div className="flex justify-between gap-3 text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>Item</span>
            <span className="font-semibold text-right" style={{ color: 'var(--text-primary)' }}>{receipt.itemName}</span>
          </div>
          {receipt.tableNumber ? (
            <div className="flex justify-between gap-3 text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>Table</span>
              <span className="font-semibold text-right" style={{ color: 'var(--text-primary)' }}>#{receipt.tableNumber}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-3 text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>Total paid</span>
            <span className="font-bold tabular-nums" style={{ color: 'var(--color-brand-400)' }}>
              {receipt.finalAmount.toFixed(2)} USDC
            </span>
          </div>
          <div className="flex justify-between gap-3 text-xs items-center">
            <span style={{ color: 'var(--text-secondary)' }}>Tx</span>
            <a
              href={`${arcTestnet.blockExplorers.default.url}/tx/${receipt.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono truncate max-w-[min(11rem,45vw)]"
              style={{ color: 'var(--color-brand-400)' }}
            >
              {String(receipt.txHash).substring(0, 10)}…
              <ExternalLink size={11} className="shrink-0" />
            </a>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="cp-btn cp-btn-ghost flex-1"
          >
            <Download size={14} />
            Print
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cp-btn cp-btn-primary flex-1"
          >
            <ArrowLeft size={14} />
            Back to menu
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(ReceiptModal)
