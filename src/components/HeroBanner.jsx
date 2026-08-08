import { memo } from 'react'
import { Zap, ShieldCheck, Circle, ArrowRight, Play } from 'lucide-react'

function scrollToShops() {
  const el = document.querySelector('.cp-directory')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function HeroBanner() {
  return (
    <section className="cp-hero animate-fade-in" aria-label="Welcome">
      <div className="cp-hero-content">
        <span className="cp-hero-badge">
          On-chain dining
          <span aria-hidden>✦</span>
        </span>

        <h2 className="cp-hero-title">
          <span>Order from</span>
          <span className="cp-hero-title-line">local cafés.</span>
          <span className="cp-hero-title-line cp-hero-title-accent">Pay in USDC.</span>
        </h2>

        <p className="cp-hero-desc">
          Discover local cafés, order instantly,
          <br />
          and pay securely on-chain.
        </p>

        <ul className="cp-hero-features" aria-label="Benefits">
          <li className="cp-hero-feature">
            <span className="cp-hero-dot" aria-hidden />
            Live settlement
          </li>
          <li className="cp-hero-feature">
            <Zap size={14} style={{ color: 'var(--color-brand-400)' }} aria-hidden />
            USDC only
          </li>
          <li className="cp-hero-feature">
            <ShieldCheck size={14} style={{ color: 'var(--color-brand-400)' }} aria-hidden />
            Secure payment
          </li>
          <li className="cp-hero-feature">
            <Circle
              size={13}
              fill="currentColor"
              strokeWidth={0}
              style={{ color: 'var(--color-brand-400)' }}
              aria-hidden
            />
            On-chain receipt
          </li>
        </ul>

        <div className="cp-hero-ctas">
          <button type="button" onClick={scrollToShops} className="cp-btn cp-btn-primary cp-hero-cta">
            Explore cafés
            <ArrowRight size={15} aria-hidden />
          </button>
          <button type="button" onClick={scrollToShops} className="cp-btn cp-btn-hero-secondary cp-hero-cta">
            <Play size={13} fill="currentColor" aria-hidden />
            How it works
          </button>
        </div>
      </div>

      <div className="cp-hero-media">
        <img
          src="https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=80"
          alt="Cinematic latte art coffee cup on a dark wooden café table with beans and warm lighting"
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  )
}

export default memo(HeroBanner)
