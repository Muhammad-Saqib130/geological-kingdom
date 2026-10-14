import { Link } from 'react-router-dom'

// size: 'sm' | 'md' | 'lg'. `tagline` adds a small spaced line under the wordmark (centred header).
export default function Logo({ light = false, size = 'md', tagline = false }) {
  const text = { sm: 'text-lg', md: 'text-lg sm:text-xl', lg: 'text-lg sm:text-2xl lg:text-[1.9rem]' }[size]
  const mark = { sm: 'h-6 w-6', md: 'h-7 w-7', lg: 'h-6 w-6 sm:h-8 sm:w-8 lg:h-9 lg:w-9' }[size]

  return (
    <Link to="/" className="inline-flex shrink-0 flex-col items-center" aria-label="Geological Kingdom, home">
      <span className="flex items-center gap-2">
        <svg viewBox="0 0 32 32" className={mark} aria-hidden="true">
          <path fill={light ? '#fbf9f4' : '#0b3d2e'} d="M8 4h16l6 8-14 17L2 12z" />
          <path fill="#c9a24b" d="M8 4l4 8h8l4-8zM2 12h28L16 29z" opacity=".6" />
        </svg>
        <span className={`whitespace-nowrap font-serif leading-none tracking-wide ${text} ${light ? 'text-ivory-50' : 'text-emerald-900'}`}>
          Geological <span className="italic text-gold-500">Kingdom</span>
        </span>
      </span>
      {tagline && (
        <span className={`mt-1.5 hidden text-[9px] uppercase tracking-[0.42em] sm:block ${light ? 'text-ivory-200/70' : 'text-muted'}`}>
          Fine gemstones · Peshawar
        </span>
      )}
    </Link>
  )
}
