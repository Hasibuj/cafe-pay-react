import { useState, useEffect, useCallback } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/wagmi'
import { WalletStoreProvider } from './context/WalletStoreContext'
import { ToastProvider } from './context/ToastContext'
import Header from './components/Header'
import HeroBanner from './components/HeroBanner'
import Footer from './components/Footer'
import WalletModal from './components/WalletModal'
import OwnerModal from './components/OwnerModal'
import DirectoryPage from './pages/DirectoryPage'
import StorePage from './pages/StorePage'

const queryClient = new QueryClient()

function AppInner() {
  const [currentView, setCurrentView] = useState('directory')
  const [selectedShopAddress, setSelectedShopAddress] = useState(null)
  const [ownerModalOpen, setOwnerModalOpen] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shopParam = urlParams.get('shop')
    if (shopParam) {
      setSelectedShopAddress(shopParam)
      setCurrentView('store')
    }
  }, [])

  const handleOpenStore = useCallback((address) => {
    window.history.pushState({}, '', `?shop=${address}`)
    setSelectedShopAddress(address)
    setCurrentView('store')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleBackToDirectory = useCallback(() => {
    window.history.pushState({}, '', window.location.pathname)
    setCurrentView('directory')
    setSelectedShopAddress(null)
  }, [])

  const handleOpenOwnerModal = useCallback(() => {
    setOwnerModalOpen(true)
  }, [])

  return (
    <div className="cp-shell">
      <Header onOpenOwnerModal={handleOpenOwnerModal} />

      <main className="cp-main">
        {currentView === 'directory' && <HeroBanner />}

        {currentView === 'directory' ? (
          <DirectoryPage onOpenStore={handleOpenStore} />
        ) : (
          <StorePage
            shopOwnerAddress={selectedShopAddress}
            onBackToDirectory={handleBackToDirectory}
          />
        )}
      </main>

      <Footer />

      <WalletModal />
      <OwnerModal
        isOpen={ownerModalOpen}
        onClose={() => setOwnerModalOpen(false)}
      />
    </div>
  )
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletStoreProvider>
          <ToastProvider>
            <AppInner />
          </ToastProvider>
        </WalletStoreProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
