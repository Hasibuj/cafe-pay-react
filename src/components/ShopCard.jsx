import { memo, useState, useEffect } from 'react'
import { Coffee, ArrowRight } from 'lucide-react'
import { getShopLogo, getShopTagline } from '../utils/storage'
import { useMetaVersion } from '../hooks/useShopMeta'

function ShopCard({ shopAddress, shopName, onClick }) {
  useMetaVersion()
  const logoUrl = getShopLogo(shopAddress)
  const tagline = getShopTagline(shopAddress)
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => {
    setLogoFailed(false)
  }, [logoUrl])

  return (
    <article
      className="cp-card cp-shop-card group"
      tabIndex={0}
      role="button"
      aria-label={`View menu for ${shopName}`}
      onClick={() => onClick(shopAddress)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(shopAddress)
        }
      }}
    >
      <div className="cp-shop-card-top">
        <div className="cp-shop-logo" aria-hidden={!logoUrl || logoFailed}>
          {logoUrl && !logoFailed ? (
            <img
              src={logoUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <Coffee size={22} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
          )}
        </div>
        <div className="cp-shop-card-copy min-w-0">
          <h3 className="cp-shop-card-title">{shopName}</h3>
          <p className="cp-shop-card-tagline">{tagline}</p>
        </div>
      </div>

      <button
        type="button"
        className="cp-view-menu-btn"
        onClick={(e) => {
          e.stopPropagation()
          onClick(shopAddress)
        }}
      >
        <span>View menu</span>
        <ArrowRight size={15} className="cp-view-menu-arrow" aria-hidden />
      </button>
    </article>
  )
}

export default memo(ShopCard)
