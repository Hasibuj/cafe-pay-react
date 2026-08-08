import { memo } from 'react'
import { Zap, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react'

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

        <h2 className="cp-hero-title text-balance" style={{ color: 'var(--text-primary)' }}>
          Order from local cafés.
          <span className="block" style={{ color: 'var(--color-brand-400)' }}>
            Pay in USDC.
          </span>
        </h2>

        <p className="cp-hero-desc">Discover local cafés, order instantly, and pay securely on-chain.</p>

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
            <CheckCircle2 size={14} style={{ color: 'var(--color-brand-400)' }} aria-hidden />
            On-chain receipt
          </li>
        </ul>

        <div className="cp-hero-ctas">
          <button type="button" onClick={scrollToShops} className="cp-btn cp-btn-primary cp-hero-cta">
            Explore cafés
            <ArrowRight size={15} aria-hidden />
          </button>
          <button type="button" onClick={scrollToShops} className="cp-btn cp-btn-ghost cp-hero-cta">
            How it works
            <ArrowRight size={15} aria-hidden />
          </button>
        </div>
      </div>

      <div className="cp-hero-media">
        <img
          src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1280&q=80"
          alt="A barista pouring a warm coffee on a dark wooden café table in cinematic light"
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  )
}

export default memo(HeroBanner)
