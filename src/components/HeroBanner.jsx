import { memo, useEffect, useState } from 'react'
import {
  Zap, ShieldCheck, BookOpen, CircleDollarSign, Receipt, ArrowRight, Play,
} from 'lucide-react'

const HERO_SLIDES = [
  {
    src: 'https://images.pexels.com/photos/8488379/pexels-photo-8488379.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Latte art in a black ceramic cup on a wooden table',
  },
  {
    src: 'https://images.pexels.com/photos/23017571/pexels-photo-23017571.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Appetizing Margherita pizza with fresh basil and melted mozzarella',
  },
  {
    src: 'https://images.pexels.com/photos/5374420/pexels-photo-5374420.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Gourmet cheeseburger sliced in half showing juicy layers',
  },
  {
    src: 'https://images.pexels.com/photos/8696558/pexels-photo-8696558.jpeg?auto=compress&cs=tinysrgb&w=1200',
    alt: 'Crispy fried chicken with fries and salad on a black slate',
  },
]

const SLIDE_INTERVAL_MS = 2000

function scrollToShops() {
  const el = document.querySelector('.cp-directory')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToHowItWorks() {
  const el = document.querySelector('.cp-how')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const HERO_FEATURES = [
  { icon: BookOpen, line1: 'Browse', line2: 'menus' },
  { icon: Zap, line1: 'Order', line2: 'instantly' },
  { icon: CircleDollarSign, line1: 'Pay in', line2: 'USDC' },
  { icon: Receipt, line1: 'Get receipt', line2: 'on-chain' },
]

function FeatureIcons({ itemClassName }) {
  return (
    <>
      {HERO_FEATURES.map((f) => {
        const Icon = f.icon
        return (
          <div className={itemClassName} key={`${f.line1}-${f.line2}`}>
            <Icon size={20} strokeWidth={1.5} aria-hidden />
            <span className="cp-hero-panel-label">
              <span>{f.line1}</span>
              <span>{f.line2}</span>
            </span>
          </div>
        )
      })}
    </>
  )
}

function HeroBanner() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % HERO_SLIDES.length)
    }, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="cp-hero animate-fade-in" aria-label="Welcome">
      <div className="cp-hero-media" aria-hidden="true">
        {HERO_SLIDES.map((slide, index) => (
          <div
            className={`cp-hero-slide${index === activeIndex ? ' is-active' : ''}`}
            key={slide.src}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable="false"
            />
          </div>
        ))}
      </div>

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
          A quiet directory of independent shops on Arc Testnet — browse menus,
          skip the terminal, and settle in seconds.
        </p>

        <ul className="cp-hero-benefits" aria-label="Benefits">
          <li className="cp-hero-benefit">
            <span className="cp-hero-dot" aria-hidden />
            Live settlement
          </li>
          <li className="cp-hero-benefit">
            <Zap size={14} style={{ color: 'var(--color-brand-400)' }} aria-hidden />
            USDC only
          </li>
          <li className="cp-hero-benefit">
            <ShieldCheck size={14} style={{ color: 'var(--color-brand-400)' }} aria-hidden />
            Your wallet, your receipt
          </li>
        </ul>

        <div className="cp-hero-feature-cards">
          <FeatureIcons itemClassName="cp-hero-feature-card" />
        </div>

        <div className="cp-hero-ctas">
          <button type="button" onClick={scrollToShops} className="cp-btn cp-btn-primary cp-hero-cta">
            Explore cafés
            <ArrowRight size={15} aria-hidden />
          </button>
          <button type="button" onClick={scrollToHowItWorks} className="cp-btn cp-btn-hero-secondary cp-hero-cta">
            <Play size={13} fill="currentColor" aria-hidden />
            How it works
          </button>
        </div>
      </div>

      {/* Floating feature panel — desktop only, over the lower-right of the image */}
      <div className="cp-hero-panel" role="presentation">
        <FeatureIcons itemClassName="cp-hero-panel-item" />
      </div>
    </section>
  )
}

export default memo(HeroBanner)
