import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="bg-emerald-950 text-ivory-200">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-ivory-200/80">
            Natural loose gemstones, hand-selected in Namak Mandi, Peshawar, and shipped across Pakistan and the world.
          </p>
        </div>
        <div>
          <h2 className="mb-4 font-sans text-xs uppercase tracking-[0.25em] text-gold-400">Explore</h2>
          <ul className="space-y-2 text-sm">
            <li><Link to="/shop" className="hover:text-gold-300">Shop gems</Link></li>
            <li><Link to="/investigation" className="hover:text-gold-300">Gem Investigation</Link></li>
            <li><Link to="/about" className="hover:text-gold-300">Our story</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 font-sans text-xs uppercase tracking-[0.25em] text-gold-400">Visit</h2>
          <address className="text-sm not-italic leading-relaxed text-ivory-200/80">
            Namak Mandi<br />Peshawar, Khyber Pakhtunkhwa<br />Pakistan
          </address>
        </div>
      </div>
      <p className="border-t border-white/10 py-5 text-center text-xs text-ivory-200/60">
        © {YEAR} Geological Kingdom. All rights reserved.
      </p>
    </footer>
  )
}
