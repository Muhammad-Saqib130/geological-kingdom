import { Link } from 'react-router-dom'
import { CheckIcon } from '../icons.jsx'

const points = [
  'Origin documented for every stone',
  'Treatments disclosed in plain words, never hidden',
  'Independent lab certificates on selected stones',
]

function CertificateArt() {
  return (
    <svg viewBox="0 0 320 240" className="h-auto w-full max-w-sm" aria-hidden="true">
      <rect x="28" y="18" width="264" height="204" fill="#fbf9f4" stroke="#c9a24b" strokeWidth="1.5" />
      <rect x="40" y="30" width="240" height="180" fill="none" stroke="#c9a24b" strokeWidth=".6" />
      <text x="160" y="62" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="18" fill="#0b3d2e" letterSpacing="2">CERTIFICATE</text>
      <text x="160" y="80" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fill="#a9843a" letterSpacing="3">OF AUTHENTICITY</text>
      {[104, 118, 132, 146].map((y, i) => (
        <g key={y}>
          <line x1="64" y1={y} x2="130" y2={y} stroke="#5f665f" strokeOpacity=".35" />
          <line x1="140" y1={y} x2={i % 2 ? 220 : 196} y2={y} stroke="#0b3d2e" strokeOpacity=".55" />
        </g>
      ))}
      <path d="M78 176h60" stroke="#0b3d2e" strokeOpacity=".5" />
      <circle cx="232" cy="172" r="22" fill="#c9a24b" />
      <circle cx="232" cy="172" r="16" fill="none" stroke="#fbf9f4" strokeWidth="1" />
      <path d="m224 172 6 6 10-12" fill="none" stroke="#fbf9f4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m220 190-6 22 10-6 6 10 4-20zM244 190l6 22-10-6-6 10-4-20z" fill="#a9843a" />
    </svg>
  )
}

export default function AuthenticityBanner() {
  return (
    <section aria-labelledby="authenticity" className="bg-ivory-100">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
        <div className="order-2 flex justify-center md:order-1">
          <CertificateArt />
        </div>
        <div className="order-1 md:order-2">
          <p className="eyebrow">Authenticity, first</p>
          <h2 id="authenticity" className="mt-3 text-4xl sm:text-5xl">Every stone is examined before it is listed</h2>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-ink">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-ivory-50">
                  <CheckIcon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-10 border-l-2 border-gold-500 pl-5">
            <p className="font-serif text-2xl text-emerald-900">Bought a gem somewhere else?</p>
            <p className="mt-1 text-sm text-muted">Our Gem Investigation service checks it for you, for $10.</p>
            <Link to="/investigation" className="btn-primary mt-5">Request an investigation</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
