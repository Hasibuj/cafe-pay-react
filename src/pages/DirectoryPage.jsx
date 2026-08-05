import { useState, useEffect, useMemo, useCallback } from 'react'
import { useReadContract } from 'wagmi'
import { ethers } from 'ethers'
import { Coffee, AlertTriangle } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import CategoryFilter from '../components/CategoryFilter'
import ShopCard from '../components/ShopCard'
import { CONTRACT_ADDRESS, ABI_CAFEPAY } from '../config/wagmi'

function assignCategory(shopName) {
  const lower = shopName.toLowerCase()
  if (lower.includes('burger') || lower.includes('pizza') || lower.includes('fast')) return 'fastfood'
  if (lower.includes('bakery') || lower.includes('bread') || lower.includes('cafe')) return 'bakery'
  return 'coffee'
}

function DirectoryPage({ onOpenStore }) {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const { data: allShopAddresses, isLoading: addressesLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI_CAFEPAY,
    functionName: 'getAllShops',
  })

  useEffect(() => {
    let cancelled = false

    async function loadShops() {
      if (!allShopAddresses || allShopAddresses.length === 0) {
        if (!cancelled) { setShops([]); setLoading(false) }
        return
      }

      setLoading(true)
      try {
        const readOnlyProvider = new (await import('ethers')).ethers.JsonRpcProvider(
          'https://rpc.blockdaemon.testnet.arc.io'
        )
        const contract = new (await import('ethers')).ethers.Contract(
          CONTRACT_ADDRESS,
          ['function shops(address) external view returns (string shopName, address ownerAddress, bool exists)'],
          readOnlyProvider
        )

        const loaded = []
        for (const ownerAddr of allShopAddresses) {
          try {
            const cleanAddr = ethers.getAddress(ownerAddr)
            const shop = await contract.shops(cleanAddr)
            if (shop && (shop.exists || shop[2])) {
              const name = shop.shopName || shop[0]
              if (name) loaded.push({ address: cleanAddr, name, category: assignCategory(name) })
            }
          } catch (e) {
            console.error('Error parsing shop:', e)
          }
        }
        if (!cancelled) setShops(loaded)
      } catch (err) {
        console.error('Error loading directory:', err)
        if (!cancelled) setError('Failed to load restaurants.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (!addressesLoading) loadShops()
    return () => { cancelled = true }
  }, [allShopAddresses, addressesLoading])

  const filteredShops = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return shops.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(q)
      const matchCat = activeCategory === 'all' || s.category === activeCategory
      return matchSearch && matchCat
    })
  }, [shops, searchQuery, activeCategory])

  const handleSearch = useCallback((v) => setSearchQuery(v), [])
  const handleCategory = useCallback((c) => setActiveCategory(c), [])

  return (
    <section className="space-y-5 animate-fade-in">
      <div
        className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl border"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
        }}
      >
        <SearchBar value={searchQuery} onChange={handleSearch} />
        <CategoryFilter activeCategory={activeCategory} onCategoryChange={handleCategory} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading || addressesLoading ? (
          <div
            className="col-span-3 flex flex-col items-center justify-center py-20 gap-3"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-brand-500)' }} />
            <p className="text-sm font-medium">Loading restaurants from blockchain…</p>
          </div>
        ) : error ? (
          <div
            className="col-span-3 flex flex-col items-center justify-center py-20 gap-3"
            style={{ color: 'var(--color-error)' }}
          >
            <AlertTriangle size={32} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div
            className="col-span-3 flex flex-col items-center justify-center py-20 gap-3"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Coffee size={32} />
            <p className="text-sm font-medium">
              {shops.length === 0 ? 'No restaurants found.' : 'No restaurants match your search.'}
            </p>
          </div>
        ) : (
          filteredShops.map((shop) => (
            <ShopCard
              key={shop.address}
              shopAddress={shop.address}
              shopName={shop.name}
              category={shop.category}
              onClick={onOpenStore}
            />
          ))
        )}
      </div>
    </section>
  )
}

export default DirectoryPage
