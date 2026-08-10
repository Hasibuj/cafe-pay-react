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
import DirectoryPage from './pages/DirectoryPage'
import StorePage from './pages/StorePage'
import OwnerDashboardPage from './pages/OwnerDashboardPage'

const queryClient = new QueryClient()

function AppInner() {
  const [currentView, setCurrentView] = useState('directory')
  const [selectedShopAddress, setSelectedShopAddress] = useState(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shopParam = urlParams.get('shop')
    const viewParam = urlParams.get('view')
    if (viewParam === 'owner') {
      setCurrentView('owner')
      return
    }
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

  const handleOpenOwnerDashboard = useCallback(() => {
    window.history.pushState({}, '', '?view=owner')
    setCurrentView('owner')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const isOwner = currentView === 'owner'

  return (
    <div className="cp-shell">
      <Header onOpenOwnerModal={handleOpenOwnerDashboard} />

      <main className={`cp-main ${isOwner ? 'cp-main--owner' : ''}`}>
        {currentView === 'directory' && <HeroBanner />}

        {currentView === 'directory' && (
          <DirectoryPage onOpenStore={handleOpenStore} />
        )}
        {currentView === 'store' && (
          <StorePage
            shopOwnerAddress={selectedShopAddress}
            onBackToDirectory={handleBackToDirectory}
          />
        )}
        {currentView === 'owner' && (
          <OwnerDashboardPage onBack={handleBackToDirectory} />
        )}
      </main>

      {!isOwner && <Footer />}

      <WalletModal />
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
