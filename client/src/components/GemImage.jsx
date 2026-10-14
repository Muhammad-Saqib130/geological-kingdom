import GemVisual from './GemVisual.jsx'

export default function GemImage({ gem, className = '', eager = false }) {
  const img = gem.images?.[0]
  if (!img) return <GemVisual color={gem.colorHex} className={className} />
  return (
    <img
      src={img.url}
      alt={img.alt || `${gem.name}, ${gem.carat} ct`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`object-cover ${className}`}
    />
  )
}
