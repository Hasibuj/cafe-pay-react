import { memo } from 'react'
import { Zap, ShieldCheck } from 'lucide-react'

function HeroBanner() {
  return (
    <section className="cp-hero animate-fade-in" aria-label="Welcome">
      <div className="relative z-10 min-w-0">
        <span className="cp-chip mb-4">On-chain dining</span>

        <h2 className="cp-h1 text-balance mb-3" style={{ color: 'var(--text-primary)' }}>
          Order from local cafés.
          <span className="block mt-1" style={{ color: 'var(--color-brand-400)' }}>
            Pay in USDC.
          </span>
        </h2>

        <p
          className="text-pretty max-w-md mb-6 text-[0.875rem] sm:text-[0.9375rem] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          A quiet directory of independent shops on Arc Testnet — browse menus, settle instantly, skip the card terminal.
        </p>

        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[0.8rem]" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full opacity-70"
                style={{ background: 'var(--color-success)' }}
              />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--color-success)' }} />
            </span>
            <span className="font-medium">Live settlement</span>
          </li>
          <li className="flex items-center gap-2">
            <Zap size={14} style={{ color: 'var(--color-brand-400)' }} aria-hidden />
            <span className="font-medium">USDC only</span>
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck size={14} style={{ color: 'var(--color-brand-400)' }} aria-hidden />
            <span className="font-medium">Your wallet, your receipt</span>
          </li>
        </ul>
      </div>

      <div className="cp-hero-media relative z-10 cp-hero-media-visible" aria-hidden="true">
        <div className="cp-hero-frame">
          <img
            src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=640&q=80"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="cp-hero-frame">
          <img
            src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=480&q=80"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  )
}

export default memo(HeroBanner)
