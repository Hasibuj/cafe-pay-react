import { memo } from 'react'
import { Coffee } from 'lucide-react'

function Footer() {
  return (
    <footer
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12 border-t"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coffee size={14} style={{ color: 'var(--color-brand-500)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            &copy; 2026 CafePay. Powered by Arc Testnet & USDC.
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          <span>Built with Ethereum</span>
          <span className="w-1 h-1 rounded-full" style={{ background: 'var(--text-tertiary)' }} />
          <span>USDC Payments</span>
        </div>
      </div>
    </footer>
  )
}

export default memo(Footer)
