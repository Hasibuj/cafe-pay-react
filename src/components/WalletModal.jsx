import { useConnect } from 'wagmi'
import { X, Download, AlertCircle } from 'lucide-react'
import { useWalletStore } from '../context/WalletStoreContext'

export default function WalletModal() {
  const { installedWallets, modalOpen, closeModal } = useWalletStore()
  const { connect, connectors, isPending, error } = useConnect()

  if (!modalOpen) return null

  function handleConnect(wallet) {
    const connector = connectors.find(
      (c) => c.id === 'injected' || c.name === wallet.name
    )
    if (connector) {
      connect({ connector }, { onSuccess: () => closeModal() })
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) closeModal()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') closeModal()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)' }}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Connect Wallet"
    >
      <div
        className="w-full max-w-md animate-scale-in rounded-2xl border p-6 shadow-2xl"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Connect Wallet
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Choose a wallet to connect to CafePay
            </p>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          {installedWallets.length === 0 ? (
            <div className="text-center py-8">
              <Download
                size={40}
                className="mx-auto mb-3"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                No wallets detected
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Install a wallet extension to continue
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { name: 'MetaMask', url: 'https://metamask.io' },
                  { name: 'Rabby', url: 'https://rabby.io' },
                  { name: 'Coinbase', url: 'https://wallet.coinbase.com' },
                  { name: 'Brave Wallet', url: 'https://brave.com/wallet' },
                ].map((w) => (
                  <a
                    key={w.name}
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-colors"
                    style={{
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Download size={12} />
                    {w.name}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            installedWallets.map((wallet) => (
              <button
                key={wallet.rdns}
                onClick={() => handleConnect(wallet)}
                disabled={isPending}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'var(--border-default)',
                  background: 'var(--bg-card)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-brand-400)'
                  e.currentTarget.style.background = 'var(--bg-card-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)'
                  e.currentTarget.style.background = 'var(--bg-card)'
                }}
              >
                <img
                  src={wallet.icon}
                  alt=""
                  className="w-10 h-10 rounded-xl"
                  style={{ background: 'var(--bg-input)' }}
                />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {wallet.name}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Installed
                  </p>
                </div>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--color-success)' }}
                />
              </button>
            ))
          )}
        </div>

        {error && (
          <div
            className="mt-4 flex items-center gap-2 p-3 rounded-xl text-xs"
            style={{
              background: 'oklch(0.60 0.18 25 / 0.1)',
              color: 'var(--color-error)',
            }}
          >
            <AlertCircle size={14} />
            {error.message?.includes('User rejected')
              ? 'Connection rejected. Please try again.'
              : error.message?.includes('No providers')
              ? 'No wallet provider found. Please install a wallet.'
              : 'Connection failed. Please try again.'}
          </div>
        )}

        <p className="text-center text-[11px] mt-4" style={{ color: 'var(--text-tertiary)' }}>
          By connecting, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}
