import { BookOpen, Wallet, CircleDollarSign, Store, QrCode, ShieldCheck } from 'lucide-react'

const STEPS = [
  {
    icon: BookOpen,
    step: '01',
    title: 'Browse',
    body: 'Explore the directory of cafés on Arc Testnet. Every shop, menu item, and price is read straight from the chain — no sign-up, no account, no wallet needed.',
  },
  {
    icon: Wallet,
    step: '02',
    title: 'Connect',
    body: 'Ready to order? Connect any web3 wallet (MetaMask, Coinbase Wallet, Brave) and switch to Arc Testnet. Your USDC balance appears right in the header.',
  },
  {
    icon: CircleDollarSign,
    step: '03',
    title: 'Pay in USDC',
    body: 'Pick your items and table, then approve and confirm in your wallet. The payment settles on-chain in USDC — with the receipt stored on-chain forever.',
  },
]

const OWNER_POINTS = [
  { icon: Store, text: 'Register your shop and add your menu — every item and price lives on-chain.' },
  { icon: QrCode, text: 'Get a shareable QR code so customers open your menu directly.' },
]

const PERKS = ['On-chain from day one', 'Stable USDC pricing', 'Your wallet, your proof']

function HowItWorks() {
  return (
    <section className="cp-how animate-fade-in" aria-labelledby="how-heading">
      <header className="cp-how-head">
        <span className="cp-chip">How it works</span>
        <h2 id="how-heading" className="cp-h2">
          Real payments in three steps
        </h2>
        <p className="cp-how-lead">
          On-chain menus, one-tap USDC payment, and a receipt you can verify on Arcscan.
        </p>
      </header>

      <ol className="cp-how-steps">
        {STEPS.map(({ icon: Icon, step, title, body }) => (
          <li className="cp-how-card" key={step}>
            <div className="cp-how-card-top">
              <span className="cp-how-icon" aria-hidden>
                <Icon size={20} strokeWidth={1.6} />
              </span>
              <span className="cp-how-step" aria-hidden>
                {step}
              </span>
            </div>
            <h3 className="cp-h3">{title}</h3>
            <p>{body}</p>
          </li>
        ))}
      </ol>

      <div className="cp-how-bottom">
        <div className="cp-how-owner">
          <h3 className="cp-h3">For café owners</h3>
          <ul className="cp-how-owner-list">
            {OWNER_POINTS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <Icon size={16} strokeWidth={1.7} aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <ul className="cp-how-perks" aria-label="Why it matters">
          {PERKS.map((perk) => (
            <li key={perk}>
              <ShieldCheck size={15} strokeWidth={1.7} aria-hidden />
              {perk}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default HowItWorks