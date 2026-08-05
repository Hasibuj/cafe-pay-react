import { memo } from 'react'
import { Coffee, ArrowRight } from 'lucide-react'
import { getShopLogo } from '../utils/storage'

function ShopCard({ shopAddress, shopName, onClick }) {
  const logoUrl = getShopLogo(shopAddress)
  const tagline = localStorage.getItem(`shop_tagline_${shopAddress}`) || 'Fresh food & delicious coffee served daily!'

  return (
    <article
      onClick={() => onClick(shopAddress)}
      className="group flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-default)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-brand-400)'
        e.currentTarget.style.boxShadow = '0 8px 24px oklch(0.65 0.19 70 / 0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      tabIndex={0}
      role="button"
      aria-label={`View menu for ${shopName}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(shopAddress) } }}
    >
      <div>
        <div className="mb-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${shopName} logo`}
              className="w-12 h-12 rounded-xl object-cover border"
              style={{ borderColor: 'var(--border-default)' }}
              loading="lazy"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border"
              style={{
                background: 'var(--bg-input)',
                borderColor: 'var(--border-default)',
              }}
            >
              <Coffee size={20} style={{ color: 'var(--text-tertiary)' }} />
            </div>
          )}
        </div>
        <h3
          className="text-base font-bold mb-1 transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          <span className="group-hover:text-[var(--color-brand-500)] transition-colors">
            {shopName}
          </span>
        </h3>
        <p
          className="text-xs leading-relaxed line-clamp-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {tagline}
        </p>
      </div>

      <div
        className="mt-5 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200"
        style={{
          background: 'var(--bg-input)',
          borderColor: 'var(--border-default)',
          color: 'var(--color-brand-500)',
        }}
      >
        <span>View Menu</span>
        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
      </div>
    </article>
  )
}

export default memo(ShopCard)
