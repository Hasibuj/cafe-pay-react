import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const WalletStoreContext = createContext(null)

export function WalletStoreProvider({ children }) {
  const [installedWallets, setInstalledWallets] = useState([])
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const wallets = []

    function onAnnounce(e) {
      const { info, provider } = e.detail
      if (wallets.some((w) => w.rdns === info.rdns)) return
      wallets.push({ ...info, provider })
      setInstalledWallets([...wallets])
    }

    window.addEventListener('eip6963:announceProvider', onAnnounce)
    window.dispatchEvent(new CustomEvent('eip6963:requestProvider'))

    return () => window.removeEventListener('eip6963:announceProvider', onAnnounce)
  }, [])

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])

  return (
    <WalletStoreContext.Provider value={{ installedWallets, modalOpen, openModal, closeModal }}>
      {children}
    </WalletStoreContext.Provider>
  )
}

export function useWalletStore() {
  const ctx = useContext(WalletStoreContext)
  if (!ctx) throw new Error('useWalletStore must be used within WalletStoreProvider')
  return ctx
}
