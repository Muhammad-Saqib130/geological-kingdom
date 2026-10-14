import { imageSrcSet, imageUrl } from '../../lib/images.js'
import GemVisual from '../GemVisual.jsx'

// A product photo with responsive sources, or the tinted gem illustration when there is none.
export default function ProductImage({ product, image = product.images?.[0], className = '', sizes = '(min-width: 1024px) 25vw, 50vw', width = 640, eager = false }) {
  if (!image) return <GemVisual color={product.colorHex} className={className} />
  return (
    <img
      src={imageUrl(image.url, { width })}
      srcSet={imageSrcSet(image.url)}
      sizes={sizes}
      alt={image.alt || `${product.name}${product.carat ? `, ${product.carat} ct` : ''}`}
      width={image.width}
      height={image.height}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      className={`object-cover ${className}`}
    />
  )
}
