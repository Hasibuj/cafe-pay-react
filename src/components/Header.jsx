import { useState, useEffect, useCallback } from 'react'
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi'
import { useBalance } from 'wagmi'
import { Coffee, ChevronDown, Copy, Check, LogOut, Building2 } from 'lucide-react'
import { useWalletStore } from '../context/WalletStoreContext'
import { arcTestnet } from '../config/wagmi'

export default function Header({ onOpenOwnerModal }) {
  const { address, isConnected, chain } = useAccount()
  const { openModal } = useWalletStore()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { data: balanceData } = useBalance({ address })

  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isCorrectChain, setIsCorrectChain] = useState(true)

  useEffect(() => {
    if (chain) setIsCorrectChain(chain.id === arcTestnet.id)
  }, [chain])

  const displayAddress = address
    ? `${address.substring(0, 6)}…${address.substring(38)}`
    : null

  const formattedBalance = balanceData
    ? `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}`
    : null

  const handleCopy = useCallback(() => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [address])

  const handleSwitchChain = useCallback(async () => {
    try {
      await switchChain({ chainId: arcTestnet.id })
    } catch (err) {
      if (err?.message?.includes('User rejected')) return
      alert('Failed to switch network. Please switch manually in your wallet.')
    }
  }, [switchChain])

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        background: 'color-mix(in oklch, var(--bg-app) 80%, transparent)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="index.html" className="flex items-center gap-2.5 group" aria-label="CafePay Home">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, var(--color-brand-400), var(--color-brand-600))' }}
          >
            <Coffee size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              CafePay
            </h1>
            <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: 'var(--color-brand-500)' }}>
              Arc Testnet
            </span>
          </div>
        </a>

        <div className="flex items-center gap-2.5">
          {isConnected && (
            <button
              onClick={onOpenOwnerModal}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-colors"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              <Building2 size={14} />
              Owner Panel
            </button>
          )}

          {isConnected ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl border transition-all duration-200"
                style={{
                  background: isCorrectChain ? 'var(--bg-card)' : 'oklch(0.60 0.18 25 / 0.08)',
                  borderColor: isCorrectChain ? 'var(--border-default)' : 'oklch(0.60 0.18 25 / 0.3)',
                }}
                aria-expanded={menuOpen}
                aria-label="Wallet menu"
              >
                {isCorrectChain ? (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-brand-400), var(--color-brand-600))',
                      color: 'white',
                    }}
                  >
                    {address?.substring(2, 4).toUpperCase()}
                  </div>
                ) : (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'oklch(0.60 0.18 25 / 0.15)' }}
                  >
                    <span className="text-[10px] font-bold" style={{ color: 'var(--color-error)' }}>!</span>
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {displayAddress}
                  </p>
                  {formattedBalance && (
                    <p className="text-[10px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
                      {formattedBalance}
                    </p>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className="transition-transform"
                  style={{
                    color: 'var(--text-tertiary)',
                    transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)',
                  }}
                />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-xl border shadow-xl py-1.5 z-50 animate-scale-in"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border-default)',
                    }}
                  >
                    <div className="px-3.5 py-2.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                      <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Connected Account
                      </p>
                      <p className="text-xs font-mono mt-0.5 break-all" style={{ color: 'var(--text-primary)' }}>
                        {address}
                      </p>
                      {formattedBalance && (
                        <p className="text-xs font-semibold mt-1" style={{ color: 'var(--color-brand-500)' }}>
                          {formattedBalance}
                        </p>
                      )}
                    </div>

                    {chain && (
                      <div className="px-3.5 py-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
                        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          Network: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{chain.name}</span>
                        </p>
                      </div>
                    )}

                    <div className="p-1.5">
                      {!isCorrectChain && (
                        <button
                          onClick={() => { handleSwitchChain(); setMenuOpen(false) }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                          style={{ color: 'var(--color-warning)' }}
                        >
                          Switch to Arc Testnet
                        </button>
                      )}

                      <button
                        onClick={() => { handleCopy(); setMenuOpen(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy Address'}
                      </button>

                      <button
                        onClick={() => { disconnect(); setMenuOpen(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
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
            <button
              onClick={openModal}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
                color: 'white',
                boxShadow: '0 4px 12px oklch(0.65 0.19 70 / 0.25)',
              }}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
