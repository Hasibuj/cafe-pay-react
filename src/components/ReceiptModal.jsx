import { memo } from 'react'
import { CheckCircle, ExternalLink, Download, ArrowLeft } from 'lucide-react'
import { arcTestnet } from '../config/wagmi'

function ReceiptModal({ receipt }) {
  if (!receipt) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Payment receipt"
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 md:p-8 shadow-2xl border animate-scale-in"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'oklch(0.65 0.17 155 / 0.12)' }}
          >
            <CheckCircle size={28} style={{ color: 'var(--color-success)' }} />
          </div>
          <h3 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
            Payment Successful!
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Digital Receipt from {receipt.shopName}
          </p>
        </div>

        <div
          className="rounded-xl p-4 space-y-3 mb-6 border"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border-default)',
          }}
        >
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>Item</span>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{receipt.itemName}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>Total Paid</span>
            <span className="font-bold" style={{ color: 'var(--color-brand-500)' }}>
              {receipt.finalAmount.toFixed(2)} USDC
            </span>
          </div>
          <div className="flex justify-between text-xs items-center">
            <span style={{ color: 'var(--text-secondary)' }}>Tx Hash</span>
            <a
              href={`${arcTestnet.blockExplorers.default.url}/tx/${receipt.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono truncate max-w-[160px] transition-colors"
              style={{ color: 'var(--color-brand-500)' }}
            >
              {receipt.txHash.substring(0, 10)}…
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold border transition-colors"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <Download size={13} />
            Receipt
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
              color: 'white',
              boxShadow: '0 4px 12px oklch(0.65 0.19 70 / 0.2)',
            }}
          >
            <ArrowLeft size={13} />
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(ReceiptModal)
