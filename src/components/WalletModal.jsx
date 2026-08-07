import { useState } from 'react'
import { useConnect, useSwitchChain } from 'wagmi'
import { X, Download, AlertCircle, Wallet, Loader2, ExternalLink } from 'lucide-react'
import { useWalletStore } from '../context/WalletStoreContext'
import { arcTestnet } from '../config/wagmi'

const INSTALL_LINKS = [
  { name: 'MetaMask', url: 'https://metamask.io/download/', hint: 'Browser extension' },
  { name: 'Rabby', url: 'https://rabby.io/', hint: 'Multi-chain' },
  { name: 'Coinbase', url: 'https://www.coinbase.com/wallet', hint: 'App + extension' },
  { name: 'Brave', url: 'https://brave.com/wallet/', hint: 'Built-in wallet' },
]

export default function WalletModal() {
  const { installedWallets, modalOpen, closeModal } = useWalletStore()
  const { connectAsync, connectors, isPending, error, reset } = useConnect()
  const { switchChainAsync } = useSwitchChain()
  const [connectingId, setConnectingId] = useState(null)
  const [localError, setLocalError] = useState(null)

  if (!modalOpen) return null

  async function ensureArcChain() {
    try {
      await switchChainAsync({ chainId: arcTestnet.id })
    } catch (err) {
      // Wallet may not have Arc yet — try wallet_addEthereumChain via injected provider
      const provider = window.ethereum
      if (!provider?.request) throw err
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${arcTestnet.id.toString(16)}` }],
        })
      } catch (switchErr) {
        if (switchErr?.code === 4902 || switchErr?.data?.originalError?.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${arcTestnet.id.toString(16)}`,
                chainName: arcTestnet.name,
                nativeCurrency: arcTestnet.nativeCurrency,
                rpcUrls: [...arcTestnet.rpcUrls.default.http],
                blockExplorerUrls: [arcTestnet.blockExplorers.default.url],
              },
            ],
          })
        } else if (switchErr?.code !== 4001) {
          throw switchErr
        }
      }
    }
  }

  async function handleConnect(wallet) {
    setLocalError(null)
    reset?.()
    setConnectingId(wallet.rdns || wallet.name)

    try {
      const connector =
        connectors.find((c) => c.id === 'injected') ||
        connectors.find((c) => c.name === wallet.name) ||
        connectors[0]

      if (!connector) {
        setLocalError('No wallet connector available.')
        return
      }

      // Prefer connecting already on Arc Testnet
      try {
        await connectAsync({ connector, chainId: arcTestnet.id })
      } catch {
        await connectAsync({ connector })
      }

      // Always request Arc after connect
      try {
        await ensureArcChain()
      } catch {
        setLocalError('Connected, but please switch to Arc Testnet to pay with USDC.')
      }

      closeModal()
    } catch (err) {
      const msg = err?.shortMessage || err?.message || 'Connection failed'
      if (msg.includes('User rejected') || err?.code === 4001) {
        setLocalError('Connection rejected. Try again when ready.')
      } else {
        setLocalError(msg)
      }
    } finally {
      setConnectingId(null)
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget && !isPending) closeModal()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape' && !isPending) closeModal()
  }

  const busy = isPending || !!connectingId
  const displayError = localError || (error
    ? (error.message?.includes('User rejected')
      ? 'Connection rejected. Please try again.'
      : error.message?.includes('No providers')
        ? 'No wallet provider found. Install a wallet below.'
        : 'Connection failed. Please try again.')
    : null)

  return (
    <div
      className="cp-modal-overlay"
      style={{ zIndex: 100 }}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
    >
      <div className="cp-modal cp-wallet-modal animate-scale-in">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-start gap-3 min-w-0">
            <div className="cp-wallet-modal-icon" aria-hidden>
              <Wallet size={18} strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <h2
                id="wallet-modal-title"
                className="font-display text-xl font-semibold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Connect wallet
              </h2>
              <p className="text-xs mt-1 leading-relaxed text-pretty" style={{ color: 'var(--text-secondary)' }}>
                We&apos;ll ask your wallet to use <strong style={{ color: 'var(--text-primary)' }}>Arc Testnet</strong> and show your <strong style={{ color: 'var(--text-primary)' }}>USDC</strong> balance for CafePay.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            disabled={busy}
            className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="mt-4 mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[0.7rem] font-medium"
          style={{
            background: 'oklch(0.58 0.11 48 / 0.1)',
            color: 'var(--color-brand-300)',
            border: '1px solid oklch(0.58 0.11 48 / 0.2)',
          }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-success)' }} />
          Network: Arc Testnet · Currency: USDC
        </div>

        <div className="space-y-2">
          {installedWallets.length === 0 ? (
            <div className="text-center py-2">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'var(--bg-input)' }}
              >
                <Download size={22} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                No browser wallet detected
              </p>
              <p className="text-xs mb-4 max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Install one of these, then refresh the page.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {INSTALL_LINKS.map((w) => (
                  <a
                    key={w.name}
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cp-wallet-install-card"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{w.name}</p>
                      <p className="text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>{w.hint}</p>
                    </div>
                    <ExternalLink size={13} style={{ color: 'var(--text-tertiary)' }} />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            installedWallets.map((wallet) => {
              const isThis = connectingId === (wallet.rdns || wallet.name)
              return (
                <button
                  key={wallet.rdns}
                  type="button"
                  onClick={() => handleConnect(wallet)}
                  disabled={busy}
                  className="cp-wallet-option"
                >
                  <img
                    src={wallet.icon}
                    alt=""
                    className="w-11 h-11 rounded-xl shrink-0"
                    style={{ background: 'var(--bg-input)' }}
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {wallet.name}
                    </p>
                    <p className="text-[0.7rem]" style={{ color: 'var(--text-secondary)' }}>
                      {isThis ? 'Connecting & switching to Arc…' : 'Detected in this browser'}
                    </p>
                  </div>
                  {isThis ? (
                    <Loader2 size={18} className="animate-spin shrink-0" style={{ color: 'var(--color-brand-400)' }} />
                  ) : (
                    <span className="cp-wallet-option-badge">Connect</span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {displayError && (
          <div
            className="mt-4 flex items-start gap-2 p-3 rounded-xl text-xs leading-relaxed"
            style={{
              background: 'oklch(0.60 0.18 25 / 0.1)',
              color: 'var(--color-error)',
            }}
          >
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{displayError}</span>
          </div>
        )}

        <p className="text-center text-[0.65rem] mt-5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Browsing shops uses public RPC — wallet is only needed to pay or manage a shop.
        </p>
      </div>
    </div>
  )
}
