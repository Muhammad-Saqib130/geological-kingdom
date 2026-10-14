import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi.js'
import { whatsappLink } from '../../lib/whatsapp.js'
import CurrencyToggle from '../CurrencyToggle.jsx'
import { WhatsAppIcon } from '../icons.jsx'
import Logo from '../Logo.jsx'

const YEAR = new Date().getFullYear()
const PAYMENTS = ['Visa / Mastercard', 'Bank transfer', 'JazzCash', 'Easypaisa', 'Cash on delivery']

const heading = 'mb-5 font-sans text-[11px] font-medium uppercase tracking-[0.25em] text-gold-400'
const link = 'text-sm text-ivory-200/80 transition-colors hover:text-gold-300'

export default function Footer() {
  const categories = useApi('/categories').data?.items ?? []
  const whatsapp = whatsappLink('Hello Geological Kingdom, I have a question.')

  return (
    <footer className="bg-emerald-950 text-ivory-200">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="space-y-5">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-ivory-200/75">
            Natural loose gemstones, hand-selected in Namak Mandi, Peshawar, with origin and treatment disclosed on every stone.
          </p>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-ivory-50/20 px-4 py-2 text-sm text-ivory-50 transition-colors hover:border-gold-400 hover:text-gold-300">
              <WhatsAppIcon className="h-4 w-4" /> Chat on WhatsApp
            </a>
          )}
        </div>

        <nav aria-label="Shop">
          <h2 className={heading}>Shop</h2>
          <ul className="space-y-2.5">
            <li><Link to="/shop" className={link}>All gemstones</Link></li>
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}><Link to={`/shop?category=${c.slug}`} className={link}>{c.name}</Link></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Help">
          <h2 className={heading}>Help</h2>
          <ul className="space-y-2.5">
            <li><Link to="/investigation" className={link}>Gem Investigation</Link></li>
            <li><Link to="/info/shipping" className={link}>Shipping & delivery</Link></li>
            <li><Link to="/info/returns" className={link}>Returns</Link></li>
            <li><Link to="/info/treatments" className={link}>Gem treatments explained</Link></li>
            <li><Link to="/about" className={link}>Our story</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className={heading}>Visit</h2>
          <address className="text-sm not-italic leading-relaxed text-ivory-200/80">
            Namak Mandi<br />Peshawar, Khyber Pakhtunkhwa<br />Pakistan
          </address>
          <h2 className={`${heading} mt-8`}>Payment options</h2>
          <ul className="flex flex-wrap gap-2">
            {PAYMENTS.map((p) => (
              <li key={p} className="border border-ivory-50/15 px-2 py-1 text-[11px] text-ivory-200/80">{p}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-ivory-200/60 sm:flex-row sm:px-6">
          <p>© {YEAR} Geological Kingdom. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span>Prices in</span>
            <CurrencyToggle dark />
          </div>
        </div>
      </div>
    </footer>
  )
}
