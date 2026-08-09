import { useState, useEffect, useCallback } from 'react'
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi'
import { Coffee, ChevronDown, Copy, Check, LogOut, Building2, Wallet, AlertTriangle } from 'lucide-react'
import { useWalletStore } from '../context/WalletStoreContext'
import { arcTestnet } from '../config/wagmi'
import { fetchWalletUsdcBalance } from '../utils/walletBalance'
import NotificationBell from './NotificationBell'

export default function Header({ onOpenOwnerModal }) {
  const { address, isConnected, chain, chainId } = useAccount()
  const { openModal } = useWalletStore()
  const { disconnect } = useDisconnect()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()

  const [balance, setBalance] = useState(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const isCorrectChain = !isConnected || chainId === arcTestnet.id

  const refreshBalance = useCallback(async () => {
    if (!address || !isConnected) {
      setBalance(null)
      return
    }
    setBalanceLoading(true)
    try {
      // eth_call balanceOf(USDC) via wallet provider, public RPC fallback
      const bal = await fetchWalletUsdcBalance(address)
      setBalance(bal)
    } catch (err) {
      console.error(err)
      setBalance(null)
    } finally {
      setBalanceLoading(false)
    }
  }, [address, isConnected])

  useEffect(() => {
    refreshBalance()
    if (!isConnected) return undefined
    const t = setInterval(refreshBalance, 15_000)
    return () => clearInterval(t)
  }, [refreshBalance, isConnected, chainId])

  // Auto-switch to Arc Testnet when connected on the wrong chain
  useEffect(() => {
    if (!isConnected || !chainId || chainId === arcTestnet.id) return
    let cancelled = false
    ;(async () => {
      try {
        await switchChainAsync({ chainId: arcTestnet.id })
      } catch {
        /* user may reject */
      }
      if (!cancelled) refreshBalance()
    })()
    return () => { cancelled = true }
  }, [isConnected, chainId, switchChainAsync, refreshBalance])

  const displayAddress = address
    ? `${address.substring(0, 6)}…${address.substring(38)}`
    : null

  const formattedBalance = (() => {
    if (!isConnected) return null
    if (balanceLoading && !balance) return '…'
    if (!balance) return '0.00 USDC'
    const n = parseFloat(balance.formatted)
    const shown = Number.isFinite(n)
      ? (n >= 1000 ? n.toFixed(2) : n >= 1 ? n.toFixed(2) : n.toFixed(4))
      : '0.00'
    return `${shown} ${balance.symbol || 'USDC'}`
  })()

  const handleCopy = useCallback(() => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [address])

  const handleSwitchChain = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: arcTestnet.id })
      await refreshBalance()
    } catch (err) {
      if (err?.message?.includes('User rejected') || err?.code === 4001) return
      alert('Failed to switch network. Please switch to Arc Testnet in your wallet.')
    }
  }, [switchChainAsync, refreshBalance])

  return (
    <header className="cp-header">
      <div className="cp-container cp-header-inner">
        <a href="/" className="flex items-center gap-2.5 min-w-0 group" aria-label="CafePay Home">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-[0.7rem] flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(160deg, oklch(0.62 0.11 50), oklch(0.38 0.08 38))',
            }}
          >
            <Coffee size={18} strokeWidth={2.25} style={{ color: 'oklch(0.97 0.02 85)' }} />
          </div>
          <div className="min-w-0">
            <h1
              className="font-display text-[0.95rem] sm:text-[1.05rem] font-semibold tracking-tight truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              CafePay
            </h1>
            <span
              className="block text-[0.6rem] sm:text-[0.625rem] font-semibold tracking-[0.14em] uppercase"
              style={{ color: 'var(--color-brand-400)' }}
            >
              Arc Testnet
            </span>
          </div>
        </a>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isConnected && (
            <button
              type="button"
              onClick={onOpenOwnerModal}
              className="cp-btn cp-btn-ghost !min-h-10 !px-2.5 sm:!px-3 !text-[0.7rem] sm:!text-xs hidden sm:inline-flex"
              aria-label="Open owner panel"
            >
              <Building2 size={15} />
              Owner
            </button>
          )}

          {isConnected && <NotificationBell address={address} />}

          {isConnected ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="cp-wallet-pill"
                style={{
                  borderColor: isCorrectChain
                    ? 'var(--border-default)'
                    : 'oklch(0.65 0.16 45 / 0.45)',
                  background: isCorrectChain
                    ? 'var(--bg-card)'
                    : 'oklch(0.65 0.16 45 / 0.1)',
                }}
                aria-expanded={menuOpen}
                aria-label="Wallet menu"
              >
                <span
                  className="cp-wallet-avatar"
                  style={{
                    background: isCorrectChain
                      ? 'linear-gradient(160deg, oklch(0.62 0.11 50), oklch(0.4 0.09 40))'
                      : 'oklch(0.60 0.18 25 / 0.2)',
                    color: isCorrectChain ? 'oklch(0.98 0.01 85)' : 'var(--color-error)',
                  }}
                >
                  {isCorrectChain ? address?.substring(2, 4).toUpperCase() : '!'}
                </span>
                <span className="hidden sm:flex flex-col items-start min-w-0 text-left">
                  <span className="text-xs font-semibold leading-tight truncate max-w-[7.5rem]" style={{ color: 'var(--text-primary)' }}>
                    {displayAddress}
                  </span>
                  <span
                    className="text-[0.65rem] leading-tight tabular-nums font-medium"
                    style={{ color: isCorrectChain ? 'var(--color-brand-400)' : 'var(--color-warning)' }}
                  >
                    {isCorrectChain ? formattedBalance : 'Wrong network'}
                  </span>
                </span>
                <span className="sm:hidden text-[0.65rem] font-semibold tabular-nums" style={{ color: 'var(--color-brand-400)' }}>
                  {isCorrectChain ? (formattedBalance?.split(' ')[0] ?? '…') : '!'}
                </span>
                <ChevronDown
                  size={14}
                  className="shrink-0 transition-transform"
                  style={{
                    color: 'var(--text-tertiary)',
                    transform: menuOpen ? 'rotate(180deg)' : 'none',
                  }}
                />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                  <div className="cp-wallet-menu animate-scale-in" role="menu">
                    <div className="px-3.5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        Wallet
                      </p>
                      <p className="text-[0.7rem] font-mono mt-1 break-all leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {address}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="text-[0.7rem]" style={{ color: 'var(--text-secondary)' }}>
                          USDC (eth_call)
                        </span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-brand-400)' }}>
                          {formattedBalance}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-[0.7rem]" style={{ color: 'var(--text-secondary)' }}>
                          Network
                        </span>
                        <span className="text-[0.7rem] font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {chain?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      {!isCorrectChain && (
                        <button
                          type="button"
                          onClick={() => { handleSwitchChain(); setMenuOpen(false) }}
                          disabled={isSwitching}
                          className="cp-wallet-menu-item"
                          style={{ color: 'var(--color-warning)' }}
                        >
                          <AlertTriangle size={14} />
                          {isSwitching ? 'Switching…' : 'Switch to Arc Testnet'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { handleCopy(); setMenuOpen(false) }}
                        className="cp-wallet-menu-item"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy address'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { onOpenOwnerModal(); setMenuOpen(false) }}
                        className="cp-wallet-menu-item sm:hidden"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Building2 size={14} />
                        Owner panel
                      </button>
                      <button
                        type="button"
                        onClick={() => { disconnect(); setMenuOpen(false) }}
                        className="cp-wallet-menu-item"
                        style={{ color: 'var(--color-error)' }}
                      >
                        <LogOut size={14} />
                        Disconnect
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button type="button" onClick={openModal} className="cp-connect-btn">
              <Wallet size={15} strokeWidth={2.25} />
              <span>Connect wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
