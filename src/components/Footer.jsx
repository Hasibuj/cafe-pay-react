import { memo } from 'react'
import { Coffee } from 'lucide-react'

function Footer() {
  return (
    <footer
      className="cp-footer mt-auto"
      style={{ paddingBottom: 'max(1.25rem, var(--safe-bottom))' }}
    >
      <div className="cp-container py-7 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background: 'oklch(0.55 0.1 50 / 0.14)',
              }}
            >
              <Coffee size={14} style={{ color: 'var(--color-brand-400)' }} />
            </div>
            <div>
              <p className="font-display text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                CafePay
              </p>
              <p className="text-xs mt-0.5 max-w-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                On-chain cafe directory. Menu prices & payments in USDC on Arc Testnet.
              </p>
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] font-medium"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span>© {new Date().getFullYear()}</span>
            <span aria-hidden style={{ opacity: 0.4 }}>·</span>
            <span>Arc Testnet</span>
            <span aria-hidden style={{ opacity: 0.4 }}>·</span>
            <span>USDC</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default memo(Footer)
