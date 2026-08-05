import { memo } from 'react'

function HeroBanner() {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border p-6 md:p-8 flex flex-col lg:flex-row justify-between items-center gap-6 animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, var(--bg-card), oklch(0.22 0.04 70 / 0.15), var(--bg-card))',
        borderColor: 'var(--border-default)',
      }}
      aria-label="Welcome banner"
    >
      <div
        className="absolute -right-16 -top-16 w-60 h-60 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'oklch(0.65 0.19 70 / 0.08)' }}
      />
      <div
        className="absolute left-1/4 bottom-0 w-40 h-40 rounded-full blur-2xl pointer-events-none"
        style={{ background: 'oklch(0.55 0.18 65 / 0.05)' }}
      />

      <div className="relative z-10 max-w-lg">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full mb-3 border"
          style={{
            background: 'oklch(0.65 0.19 70 / 0.08)',
            color: 'var(--color-brand-500)',
            borderColor: 'oklch(0.65 0.19 70 / 0.15)',
          }}
        >
          Web3 Dining Experience
        </span>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
          Discover Local Cafes & Restaurants
        </h2>
        <p className="text-xs md:text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
          Pay seamlessly with USDC on Arc Testnet. Fast, secure, and decentralized dining.
        </p>

        <div className="flex flex-wrap items-center gap-5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--color-success)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--color-success)' }} />
            </span>
            <span className="font-medium">Instant Settlement</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-brand-400)' }} />
            <span className="font-medium">Zero Gas Hassle</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full lg:w-auto flex flex-row gap-3 justify-center">
        <div
          className="w-36 h-28 sm:w-44 sm:h-32 rounded-xl overflow-hidden border shadow-lg group"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <img
            src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80"
            alt="Cozy cafe interior with warm lighting"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
        <div
          className="w-36 h-28 sm:w-44 sm:h-32 rounded-xl overflow-hidden border shadow-lg group"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80"
            alt="Delicious gourmet dish"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  )
}

export default memo(HeroBanner)
