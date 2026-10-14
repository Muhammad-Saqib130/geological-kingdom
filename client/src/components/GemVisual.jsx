import { useId } from 'react'

// Faceted gem illustration tinted with the stone's colour; used until real photos are uploaded.
export default function GemVisual({ color = '#1f7a4d', className = '', bare = false }) {
  const id = `g${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f6f2e9" />
        </radialGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity=".55" />
          <stop offset="100%" stopColor="#000" stopOpacity=".35" />
        </linearGradient>
      </defs>
      {!bare && <rect width="200" height="200" fill={`url(#${id}-bg)`} />}
      <ellipse cx="100" cy="168" rx="46" ry="6" fill="#0b3d2e" opacity={bare ? '.18' : '.08'} />
      <g transform="translate(100 98)">
        <path d="M-48-28h96l22 22-70 68-70-68z" fill={color} />
        <path d="M-48-28h96l22 22-70 68-70-68z" fill={`url(#${id}-s)`} />
        <path d="M-48-28l18 22h60l18-22M-70-6h140M-30-6L0 62 30-6M-30-6L0-28 30-6" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.2" />
        <path d="M-30-6L0-28 30-6z" fill="#fff" opacity=".22" />
      </g>
    </svg>
  )
}
