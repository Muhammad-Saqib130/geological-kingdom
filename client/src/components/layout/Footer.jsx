import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi.js'
import { email, phoneDisplay, phoneHref, socials } from '../../lib/contact.js'
import { whatsappLink } from '../../lib/whatsapp.js'
import CurrencyToggle from '../CurrencyToggle.jsx'
import { MailIcon, PhoneIcon, PinIcon, SocialIcon, WhatsAppIcon } from '../icons.jsx'
import Logo from '../Logo.jsx'

const YEAR = new Date().getFullYear()
const PAYMENTS = ['Visa / Mastercard', 'Bank transfer', 'JazzCash', 'Easypaisa', 'Cash on delivery']

const heading = 'mb-5 font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-900'
const link = 'text-sm text-muted transition-colors hover:text-gold-600'

// Light, five-column footer.
export default function Footer() {
  const categories = useApi('/categories').data?.items ?? []
  const whatsapp = whatsappLink('Hello Geological Kingdom, I have a question.')

  return (
    <footer className="border-t border-ivory-200 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.4fr]">
        <div className="col-span-2 space-y-5 lg:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Natural loose gemstones, hand-selected in Namak Mandi, Peshawar, with origin and treatment disclosed on every stone.
          </p>
          {socials.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-emerald-900">Follow us</p>
              <ul className="flex gap-2">
                {socials.map((s) => (
                  <li key={s.name}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.name} className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900 text-ivory-50 transition-colors hover:bg-gold-500 hover:text-emerald-950">
                      <SocialIcon name={s.name} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <nav aria-label="Gemstones">
          <h2 className={heading}>Gemstones</h2>
          <ul className="space-y-2.5">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}><Link to={`/shop?category=${c.slug}`} className={link}>{c.name}</Link></li>
            ))}
            <li><Link to="/shop" className={link}>All gemstones</Link></li>
          </ul>
        </nav>

        <nav aria-label="Help">
          <h2 className={heading}>Help</h2>
          <ul className="space-y-2.5">
            <li><Link to="/info/shipping" className={link}>Shipping & delivery</Link></li>
            <li><Link to="/info/returns" className={link}>Returns</Link></li>
            <li><Link to="/info/treatments" className={link}>Gem treatments</Link></li>
            <li><Link to="/investigation" className={link}>Gem Investigation</Link></li>
          </ul>
        </nav>

        <nav aria-label="Your account">
          <h2 className={heading}>Customer</h2>
          <ul className="space-y-2.5">
            <li><Link to="/login" className={link}>Sign in</Link></li>
            <li><Link to="/cart" className={link}>Your cart</Link></li>
            <li><Link to="/about" className={link}>Our story</Link></li>
          </ul>
        </nav>

        <div className="col-span-2 sm:col-span-1">
          <h2 className={heading}>Get in touch</h2>
          <ul className="space-y-3 text-sm text-muted">
            {whatsapp && (
              <li>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:text-gold-600">
                  <WhatsAppIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-900" /> WhatsApp{phoneDisplay ? ` ${phoneDisplay}` : ''}
                </a>
              </li>
            )}
            {phoneHref && (
              <li>
                <a href={phoneHref} className="flex items-start gap-3 hover:text-gold-600"><PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-900" /> {phoneDisplay}</a>
              </li>
            )}
            {email && (
              <li>
                <a href={`mailto:${email}`} className="flex items-start gap-3 hover:text-gold-600"><MailIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-900" /> {email}</a>
              </li>
            )}
            <li className="flex items-start gap-3">
              <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-900" />
              <address className="not-italic">Namak Mandi, Peshawar<br />Khyber Pakhtunkhwa, Pakistan</address>
            </li>
          </ul>
          <h2 className={`${heading} mt-8 mb-3!`}>We accept</h2>
          <ul className="flex flex-wrap gap-1.5">
            {PAYMENTS.map((p) => (
              <li key={p} className="rounded-full border border-ivory-200 px-2.5 py-1 text-[10px] text-muted">{p}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-ivory-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 text-xs text-muted sm:flex-row sm:px-6">
          <p>© {YEAR} Geological Kingdom. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span>Prices in</span>
            <CurrencyToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}
