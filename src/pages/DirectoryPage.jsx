import { useState, useEffect, useMemo, useCallback } from 'react'
import { Coffee, AlertTriangle, RefreshCw } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import CategoryFilter from '../components/CategoryFilter'
import ShopCard from '../components/ShopCard'
import { fetchShopDirectory } from '../utils/rpc'
import { fetchShopMeta } from '../utils/storage'
import { useMetaVersion } from '../hooks/useShopMeta'

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
  useMetaVersion() // re-render cards when Turso meta arrives

  const loadShops = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Public Arc RPC — no wallet connection required
      const loaded = await fetchShopDirectory()
      const mapped = loaded.map((s) => ({
        ...s,
        category: assignCategory(s.name),
      }))
      setShops(mapped)
      // Prefetch Turso logos/taglines (non-blocking)
      mapped.forEach((s) => {
        fetchShopMeta(s.address).catch(() => {})
      })
    } catch (err) {
      console.error('Error loading directory:', err)
      setError('Could not load shops from Arc RPC. Check your network and try again.')
      setShops([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadShops()
  }, [loadShops])

  const filteredShops = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return shops.filter((s) => {
      const matchSearch = !q || s.name.toLowerCase().includes(q)
      const matchCat = activeCategory === 'all' || s.category === activeCategory
      return matchSearch && matchCat
    })
  }, [shops, searchQuery, activeCategory])

  const handleSearch = useCallback((v) => setSearchQuery(v), [])
  const handleCategory = useCallback((c) => setActiveCategory(c), [])

  const countLabel = loading
    ? 'Loading from Arc RPC…'
    : error
      ? 'Unable to load'
      : `${filteredShops.length} place${filteredShops.length === 1 ? '' : 's'}${
          searchQuery || activeCategory !== 'all' ? ' match' : ' on directory'
        }`

  return (
    <section className="cp-directory animate-fade-in" aria-labelledby="directory-heading">
      <header className="cp-directory-head">
        <div className="min-w-0">
          <h2 id="directory-heading" className="cp-h2" style={{ color: 'var(--text-primary)' }}>
            Nearby shops
          </h2>
          <p className="cp-directory-meta" style={{ color: 'var(--text-secondary)' }}>
            {countLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={loadShops}
          disabled={loading}
          className="cp-btn cp-btn-ghost !min-h-10 !text-xs shrink-0"
          aria-label="Refresh shop list"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      <div className="cp-panel cp-toolbar">
        <SearchBar value={searchQuery} onChange={handleSearch} />
        <CategoryFilter activeCategory={activeCategory} onCategoryChange={handleCategory} />
      </div>

      <div className="cp-directory-results" aria-live="polite">
        {loading ? (
          <div className="cp-empty">
            <div className="cp-spinner" aria-hidden />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Reading restaurants from the chain…
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              No wallet needed — public RPC
            </p>
          </div>
        ) : error ? (
          <div className="cp-empty" style={{ color: 'var(--color-error)' }}>
            <AlertTriangle size={30} strokeWidth={1.5} />
            <p className="text-sm font-medium max-w-sm">{error}</p>
            <button type="button" onClick={loadShops} className="cp-btn cp-btn-primary !min-h-10 !text-xs mt-1">
              Try again
            </button>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="cp-empty">
            <Coffee size={30} strokeWidth={1.5} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {shops.length === 0
                ? 'No restaurants yet — connect a wallet and register the first shop.'
                : 'Nothing matches that search.'}
            </p>
          </div>
        ) : (
          <div className="cp-grid-shops">
            {filteredShops.map((shop) => (
              <ShopCard
                key={shop.address}
                shopAddress={shop.address}
                shopName={shop.name}
                category={shop.category}
                onClick={onOpenStore}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default DirectoryPage
