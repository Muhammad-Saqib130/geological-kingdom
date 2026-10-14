import { useRef, useState } from 'react'
import { imageSrcSet, imageUrl } from '../../lib/images.js'
import GemVisual from '../GemVisual.jsx'
import { ChevronLeft, ChevronRight, ZoomIcon } from '../icons.jsx'
import Lightbox from './Lightbox.jsx'

const ZOOM = 2.2

// Product gallery: hover to magnify (mouse), tap/click for the fullscreen viewer,
// swipe or arrows to browse on touch screens.
export default function Gallery({ product }) {
  const images = product.images ?? []
  const [index, setIndex] = useState(0)
  const [lens, setLens] = useState(null) // { x, y } in % while magnifying
  const [viewer, setViewer] = useState(false)
  const swipe = useRef(null)
  const swiped = useRef(false) // suppresses the click that follows a swipe
  const count = images.length
  const current = images[index]

  const go = (delta) => count > 1 && setIndex((i) => (i + delta + count) % count)

  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    setLens({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }

  return (
    <div className="lg:sticky lg:top-20">
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (swiped.current) swiped.current = false
            else setViewer(true)
          }}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setLens(null)}
          onPointerDown={(e) => e.pointerType !== 'mouse' && (swipe.current = e.clientX)}
          onPointerUp={(e) => {
            if (swipe.current === null) return
            const dx = e.clientX - swipe.current
            swipe.current = null
            if (Math.abs(dx) > 50) {
              swiped.current = true
              go(dx < 0 ? 1 : -1)
            }
          }}
          className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden bg-ivory-100"
          aria-label={`Open image ${index + 1} of ${Math.max(count, 1)} in fullscreen viewer`}
        >
          <div
            className="h-full w-full transition-transform duration-200 ease-out"
            style={lens ? { transform: `scale(${ZOOM})`, transformOrigin: `${lens.x}% ${lens.y}%` } : undefined}
          >
            {current ? (
              <img
                src={imageUrl(current.url, { width: 1200 })}
                srcSet={imageSrcSet(current.url, [640, 960, 1280, 1600, 2000])}
                sizes="(min-width: 1024px) 50vw, 100vw"
                alt={current.alt || `${product.name}, ${product.carat} ct`}
                fetchPriority="high"
                draggable={false}
                className="h-full w-full object-cover"
              />
            ) : (
              <GemVisual color={product.colorHex} className="h-full w-full" />
            )}
          </div>
          <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 bg-ivory-50/90 px-2.5 py-1.5 text-[11px] uppercase tracking-[0.15em] text-emerald-900 opacity-90 transition-opacity group-hover:opacity-0">
            <ZoomIcon className="h-4 w-4" /> <span className="max-sm:hidden">Hover to zoom · click to enlarge</span><span className="sm:hidden">Tap to enlarge</span>
          </span>
        </button>

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ivory-50/90 text-emerald-900 shadow sm:hidden" aria-label="Previous image">
              <ChevronLeft />
            </button>
            <button type="button" onClick={() => go(1)} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ivory-50/90 text-emerald-900 shadow sm:hidden" aria-label="Next image">
              <ChevronRight />
            </button>
            <p className="absolute left-3 top-3 bg-ivory-50/90 px-2 py-0.5 text-xs text-emerald-900 sm:hidden" aria-hidden="true">{index + 1} / {count}</p>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2 max-sm:hidden" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.publicId ?? img.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                className={`block aspect-square w-full overflow-hidden border transition-colors ${i === index ? 'border-gold-500' : 'border-transparent hover:border-ivory-200'}`}
              >
                <img src={imageUrl(img.url, { width: 200 })} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewer && <Lightbox images={images} index={index} onIndex={setIndex} onClose={() => setViewer(false)} title={product.name} colorHex={product.colorHex} />}
    </div>
  )
}
