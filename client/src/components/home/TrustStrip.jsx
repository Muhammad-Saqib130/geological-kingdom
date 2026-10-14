import { Link } from 'react-router-dom'
import { CertificateIcon, LeafIcon, LoupeIcon, TruckIcon } from '../icons.jsx'

const items = [
  { icon: CertificateIcon, title: 'Certified', body: 'Independent lab certificates on selected stones, with report numbers you can check.' },
  { icon: LeafIcon, title: 'Ethically sourced', body: 'Bought from miners and cutters we know in the north; origin recorded for each stone.' },
  { icon: TruckIcon, title: 'Secure shipping', body: 'Discreet, insured and tracked delivery across Pakistan and worldwide.' },
  { icon: LoupeIcon, title: 'Gem Investigation', body: 'Not sure about a stone you already own? We will examine it for $10.', to: '/investigation' },
]

// Light band with line icons ("Why Geological Kingdom").
export default function TrustStrip() {
  return (
    <section aria-labelledby="why" className="bg-mist">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 id="why" className="text-center font-serif text-2xl uppercase tracking-[0.14em] text-emerald-900 sm:text-3xl">Why Geological Kingdom</h2>
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, body, to }) => (
            <li key={title} className="text-center">
              <Icon className="mx-auto h-10 w-10 text-gold-600" strokeWidth={1.1} />
              <h3 className="mt-4 font-sans text-xs font-semibold uppercase tracking-[0.22em] text-emerald-900">{title}</h3>
              <p className="mx-auto mt-2 max-w-[15rem] text-xs leading-relaxed text-muted sm:text-sm">{body}</p>
              {to && <Link to={to} className="mt-3 inline-block text-[11px] uppercase tracking-[0.18em] text-gold-600 underline-offset-4 hover:underline">Learn more</Link>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
