import { useCallback, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, ChevronLeft, ChevronRight, Store, UtensilsCrossed, Wallet, Coins,
  Receipt, CheckCircle2, MapPin, Coffee, ShieldCheck, Zap, Search, Star,
  Table2, ChefHat, Bell, LayoutDashboard, History, Crown, ArrowRight,
} from 'lucide-react'

const FOOD = [
  {
    src: 'https://images.pexels.com/photos/8488379/pexels-photo-8488379.jpeg?auto=compress&cs=tinysrgb&w=640',
    label: 'Latte',
    price: '3.20',
  },
  {
    src: 'https://images.pexels.com/photos/23017571/pexels-photo-23017571.jpeg?auto=compress&cs=tinysrgb&w=640',
    label: 'Pizza',
    price: '5.75',
    famous: true,
  },
  {
    src: 'https://images.pexels.com/photos/5374420/pexels-photo-5374420.jpeg?auto=compress&cs=tinysrgb&w=640',
    label: 'Burger',
    price: '6.50',
  },
  {
    src: 'https://images.pexels.com/photos/8696558/pexels-photo-8696558.jpeg?auto=compress&cs=tinysrgb&w=640',
    label: 'Chicken',
    price: '7.00',
  },
]

/**
 * Customer journey first, then owner — never mixed in one scene.
 */
const STEPS = [
  {
    role: 'customer',
    title: 'Find a café',
    caption: 'Open CafePay and browse local shops accepting USDC on Arc Testnet.',
    icon: Store,
  },
  {
    role: 'customer',
    title: 'Build your order',
    caption: 'Pick dishes from the menu. Famous items ask for your table number.',
    icon: UtensilsCrossed,
  },
  {
    role: 'customer',
    title: 'Connect & pay',
    caption: 'Connect your wallet, switch to Arc, and pay the bill in USDC.',
    icon: Wallet,
  },
  {
    role: 'customer',
    title: 'Track your order',
    caption: 'Watch status update live — from paid to ready — with a lasting receipt.',
    icon: Receipt,
  },
  {
    role: 'owner',
    title: 'Run your shop',
    caption: 'Owners open a full dashboard: menu, branding, QR link, and subscription.',
    icon: LayoutDashboard,
  },
  {
    role: 'owner',
    title: 'Kitchen tickets',
    caption: 'New orders land instantly with table, items, and one-tap status updates.',
    icon: ChefHat,
  },
  {
    role: 'owner',
    title: 'History & sales',
    caption: 'Finished orders stay searchable forever. See what sold today and every day.',
    icon: History,
  },
]

const AUTO_MS = 5200

function RolePill({ role }) {
  const isOwner = role === 'owner'
  return (
    <span className={`cp-how-role ${isOwner ? 'is-owner' : 'is-customer'}`}>
      {isOwner ? 'Owner view' : 'Customer view'}
    </span>
  )
}

function SceneCustomerBrowse() {
  return (
    <div className="cp-how-scene cp-how-scene--browse">
      <div className="cp-how-film-bg" />
      <div className="cp-how-phone">
        <div className="cp-how-phone-notch" />
        <div className="cp-how-phone-bar">
          <Coffee size={12} />
          <span>CafePay</span>
        </div>
        <div className="cp-how-phone-search">
          <Search size={12} />
          <span>Cafés near you</span>
        </div>
        <div className="cp-how-phone-list">
          {[
            { img: FOOD[0], name: 'Roast House', meta: '0.4 km · Open' },
            { img: FOOD[1], name: 'Night Oven', meta: '0.7 km · Open' },
            { img: FOOD[2], name: 'Bean & Grain', meta: '1.1 km · Open' },
          ].map((shop, i) => (
            <div key={shop.name} className={`cp-how-phone-shop cp-how-stagger-${i + 1}`}>
              <img src={shop.img.src} alt="" />
              <div>
                <strong>{shop.name}</strong>
                <span>{shop.meta}</span>
              </div>
              <MapPin size={12} />
            </div>
          ))}
        </div>
        <div className="cp-how-phone-cta cp-how-stagger-4">Open menu</div>
      </div>
    </div>
  )
}

function SceneCustomerMenu() {
  return (
    <div className="cp-how-scene cp-how-scene--menu">
      <div className="cp-how-film-bg" />
      <div className="cp-how-phone">
        <div className="cp-how-phone-notch" />
        <div className="cp-how-phone-shophead">
          <img src={FOOD[0].src} alt="" />
          <div>
            <strong>Roast House</strong>
            <span>Fresh food · USDC</span>
          </div>
          <span className="cp-how-table-chip">
            <Table2 size={10} />
            Table 04
          </span>
        </div>
        <div className="cp-how-phone-menu">
          {FOOD.map((item, i) => (
            <div
              key={item.label}
              className={`cp-how-phone-dish cp-how-stagger-${i + 1}${i === 1 ? ' is-picked' : ''}`}
            >
              <img src={item.src} alt="" />
              <div>
                <strong>
                  {item.label}
                  {item.famous ? (
                    <em>
                      <Star size={9} /> Famous
                    </em>
                  ) : null}
                </strong>
                <span>{item.price} USDC</span>
              </div>
              {i === 1 ? <span className="cp-how-added">+</span> : <span className="cp-how-add">+</span>}
            </div>
          ))}
        </div>
        <div className="cp-how-phone-cart cp-how-stagger-5">
          1 × Pizza · Table 04
          <strong>5.75 USDC</strong>
        </div>
      </div>
    </div>
  )
}

function SceneCustomerPay() {
  return (
    <div className="cp-how-scene cp-how-scene--pay">
      <div className="cp-how-film-bg" />
      <div className="cp-how-phone">
        <div className="cp-how-phone-notch" />
        <div className="cp-how-pay-stack">
          <div className="cp-how-wallet-mini cp-how-stagger-1">
            <div className="cp-how-wallet-orb">
              <Wallet size={20} />
            </div>
            <div>
              <strong>Wallet connected</strong>
              <span>0xA1…f3B2</span>
            </div>
            <CheckCircle2 size={16} className="cp-how-ok" />
          </div>
          <div className="cp-how-chain-mini cp-how-stagger-2">
            <ShieldCheck size={12} />
            Arc Testnet
          </div>
          <div className="cp-how-bill cp-how-stagger-3">
            <div><span>Pepperoni Pizza</span><span>5.75</span></div>
            <div><span>Table</span><span>04</span></div>
            <div className="is-total"><span>Total</span><strong>5.75 USDC</strong></div>
          </div>
          <div className="cp-how-pay-anim cp-how-stagger-4">
            <span className="cp-how-pay-node"><Wallet size={14} /> You</span>
            <span className="cp-how-pay-line">
              <span className="cp-how-coin-fly"><Coins size={12} /> USDC</span>
            </span>
            <span className="cp-how-pay-node is-cafe"><Store size={14} /> Café</span>
          </div>
          <div className="cp-how-pay-cta cp-how-stagger-5">
            <Zap size={13} />
            Pay now
          </div>
        </div>
      </div>
    </div>
  )
}

function SceneCustomerTrack() {
  return (
    <div className="cp-how-scene cp-how-scene--track">
      <div className="cp-how-film-bg" />
      <div className="cp-how-phone">
        <div className="cp-how-phone-notch" />
        <div className="cp-how-track-card cp-how-stagger-1">
          <div className="cp-how-track-ok">
            <CheckCircle2 size={22} />
          </div>
          <h5>Order confirmed</h5>
          <p>ORD-7F2A · Table 04</p>
          <ul>
            <li><span>1 × Pizza</span><span>5.75</span></li>
            <li><span>Payment</span><span>USDC · Paid</span></li>
          </ul>
          <div className="cp-how-timeline">
            <span className="is-done">Paid</span>
            <span className="is-done">Prep</span>
            <span className="is-live">Ready</span>
            <span>Serve</span>
          </div>
          <div className="cp-how-receipt-line">
            <Receipt size={12} />
            On-chain receipt saved
          </div>
        </div>
      </div>
    </div>
  )
}

function SceneOwnerDash() {
  return (
    <div className="cp-how-scene cp-how-scene--owner-dash">
      <div className="cp-how-film-bg is-owner" />
      <div className="cp-how-desktop">
        <div className="cp-how-desk-side cp-how-stagger-1">
          <span className="is-active"><LayoutDashboard size={12} /> Overview</span>
          <span><UtensilsCrossed size={12} /> Orders</span>
          <span><History size={12} /> History</span>
          <span><Store size={12} /> Menu</span>
        </div>
        <div className="cp-how-desk-main">
          <div className="cp-how-desk-title cp-how-stagger-2">
            <strong>Roast House</strong>
            <span>Owner dashboard</span>
          </div>
          <div className="cp-how-desk-stats">
            <div className="cp-how-stagger-2"><em>3</em><span>Open orders</span></div>
            <div className="cp-how-stagger-3"><em>42.5</em><span>Sold today</span></div>
            <div className="cp-how-stagger-4"><em>12</em><span>Menu items</span></div>
          </div>
          <div className="cp-how-desk-sub cp-how-stagger-5">
            <Crown size={13} />
            Subscription active · 22d left
            <i />
          </div>
          <div className="cp-how-desk-actions cp-how-stagger-5">
            <span>Menu</span>
            <span>Branding</span>
            <span>QR share</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SceneOwnerKitchen() {
  return (
    <div className="cp-how-scene cp-how-scene--kitchen">
      <div className="cp-how-film-bg is-owner" />
      <div className="cp-how-desktop">
        <div className="cp-how-kitchen-banner cp-how-stagger-1">
          <Bell size={14} />
          New order received
          <em>Just now</em>
        </div>
        <div className="cp-how-tickets">
          <article className="cp-how-ticket is-new cp-how-stagger-2">
            <header>
              <strong>ORD-7F2A</strong>
              <span><Table2 size={11} /> Table 04</span>
            </header>
            <p>1 × Pizza (famous)</p>
            <footer>
              <b>5.75 USDC</b>
              <button type="button" tabIndex={-1}>Advance to Preparing</button>
            </footer>
          </article>
          <article className="cp-how-ticket cp-how-stagger-3">
            <header>
              <strong>ORD-6C91</strong>
              <span><Table2 size={11} /> Table 02</span>
            </header>
            <p>2 × Latte · 1 × Burger</p>
            <footer>
              <b>13.20 USDC</b>
              <em className="is-ready">Ready</em>
            </footer>
          </article>
        </div>
        <div className="cp-how-kitchen-hint cp-how-stagger-4">
          <ChefHat size={13} />
          Status updates stream to the customer live
        </div>
      </div>
    </div>
  )
}

function SceneOwnerHistory() {
  return (
    <div className="cp-how-scene cp-how-scene--history">
      <div className="cp-how-film-bg is-owner" />
      <div className="cp-how-desktop">
        <div className="cp-how-sales-row">
          <div className="cp-how-stagger-1"><span>Today</span><strong>42.50 USDC</strong></div>
          <div className="cp-how-stagger-2"><span>7 days</span><strong>281.00 USDC</strong></div>
          <div className="cp-how-stagger-3"><span>All time</span><strong>1,240 USDC</strong></div>
        </div>
        <div className="cp-how-hist-search cp-how-stagger-3">
          <Search size={12} />
          <span>Search order #, table, item…</span>
        </div>
        <div className="cp-how-hist-list">
          {[
            { id: 'ORD-7F2A', table: '04', total: '5.75', status: 'Completed' },
            { id: 'ORD-6C91', table: '02', total: '13.20', status: 'Completed' },
            { id: 'ORD-5A10', table: '08', total: '9.40', status: 'Cancelled' },
          ].map((row, i) => (
            <div key={row.id} className={`cp-how-hist-row cp-how-stagger-${i + 4}`}>
              <strong>{row.id}</strong>
              <span>Table {row.table}</span>
              <em className={row.status === 'Cancelled' ? 'is-bad' : 'is-ok'}>{row.status}</em>
              <b>{row.total}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DemoScene({ index }) {
  switch (index) {
    case 0: return <SceneCustomerBrowse />
    case 1: return <SceneCustomerMenu />
    case 2: return <SceneCustomerPay />
    case 3: return <SceneCustomerTrack />
    case 4: return <SceneOwnerDash />
    case 5: return <SceneOwnerKitchen />
    case 6: return <SceneOwnerHistory />
    default: return <SceneCustomerBrowse />
  }
}

export default function HowItWorksModal({ isOpen, onClose, onExplore }) {
  const titleId = useId()
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)

  const goTo = useCallback((index) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, index)))
    setProgress(0)
  }, [])

  const next = useCallback(() => {
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
    setProgress(0)
  }, [])

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1))
    setProgress(0)
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined
    setStep(0)
    setProgress(0)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  // Auto-advance like a short film (no pause control)
  useEffect(() => {
    if (!isOpen) return undefined
    const tick = 50
    const timer = window.setInterval(() => {
      setProgress((p) => {
        const nextP = p + (tick / AUTO_MS) * 100
        if (nextP >= 100) {
          setStep((s) => (s >= STEPS.length - 1 ? 0 : s + 1))
          return 0
        }
        return nextP
      })
    }, tick)
    return () => window.clearInterval(timer)
  }, [isOpen, step])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      }
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, next, prev])

  if (!isOpen || typeof document === 'undefined') return null

  const current = STEPS[step]
  const StepIcon = current.icon
  const isLast = step === STEPS.length - 1

  return createPortal(
    <div
      className="cp-how-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="cp-how-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="cp-how-x"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.25} />
        </button>

        <div className="cp-how-top">
          <div className="cp-how-top-copy">
            <div className="cp-how-top-row">
              <RolePill role={current.role} />
              <span className="cp-how-count">
                {step + 1} / {STEPS.length}
              </span>
            </div>
            <h3 id={titleId} className="cp-how-title">How CafePay works</h3>
          </div>
        </div>

        <div className="cp-how-body">
          <div className="cp-how-stage-wrap" key={step}>
            <DemoScene index={step} />
            <div className="cp-how-stage-badge">
              <StepIcon size={13} />
              {current.title}
            </div>
            <div className="cp-how-film-progress" aria-hidden>
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="cp-how-copy" key={`c-${step}`}>
            <h4 className="cp-how-step-title">{current.title}</h4>
            <p className="cp-how-step-caption">{current.caption}</p>
          </div>

          <div className="cp-how-dots" role="tablist" aria-label="Steps">
            {STEPS.map((s, i) => (
              <button
                key={`${s.role}-${s.title}`}
                type="button"
                role="tab"
                aria-selected={i === step}
                aria-label={`${s.role}: ${s.title}`}
                className={`cp-how-dot ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''} ${s.role === 'owner' ? 'is-owner' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>

          <div className="cp-how-nav">
            <button
              type="button"
              className="cp-how-nav-btn"
              onClick={prev}
              disabled={step === 0}
            >
              <ChevronLeft size={18} />
              Previous
            </button>
            {isLast ? (
              <button
                type="button"
                className="cp-how-nav-btn is-primary"
                onClick={() => {
                  onClose?.()
                  window.setTimeout(() => onExplore?.(), 40)
                }}
              >
                Explore cafés
                <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" className="cp-how-nav-btn is-primary" onClick={next}>
                Next
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
