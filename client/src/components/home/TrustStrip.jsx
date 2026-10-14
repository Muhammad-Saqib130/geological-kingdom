import { Link } from 'react-router-dom'
import { CertificateIcon, LeafIcon, LoupeIcon, TruckIcon } from '../icons.jsx'

const items = [
  { icon: CertificateIcon, title: 'Certified', body: 'Lab certificates from recognised laboratories on selected stones, with report numbers you can check.' },
  { icon: LeafIcon, title: 'Ethically sourced', body: 'Bought from miners and cutters we know in the north, with origin recorded for each stone.' },
  { icon: TruckIcon, title: 'Secure shipping', body: 'Discreet, insured and tracked delivery across Pakistan and worldwide.' },
  { icon: LoupeIcon, title: 'Gem Investigation', body: 'Not sure about a stone you already own? We will examine it for $10.', to: '/investigation' },
]

export default function TrustStrip() {
  return (
    <section aria-labelledby="why" className="bg-emerald-900 text-ivory-50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <p className="eyebrow text-gold-400!">Our promise</p>
          <h2 id="why" className="mt-2 text-4xl text-ivory-50! sm:text-5xl">Why Geological Kingdom</h2>
        </div>
        <ul className="grid gap-px overflow-hidden bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, body, to }) => (
            <li key={title} className="bg-emerald-900 p-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/40 text-gold-400">
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-2xl text-ivory-50!">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ivory-200/75">{body}</p>
              {to && <Link to={to} className="mt-4 inline-block text-xs uppercase tracking-[0.18em] text-gold-300 underline-offset-4 hover:underline">Learn more</Link>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
