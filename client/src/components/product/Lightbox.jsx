import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialog } from '../../hooks/useDialog.js'
import { imageUrl } from '../../lib/images.js'
import GemVisual from '../GemVisual.jsx'
import { ChevronLeft, ChevronRight, CloseIcon, MinusIcon, PlusIcon } from '../icons.jsx'

const MAX_SCALE = 4
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

// Fullscreen viewer: swipe or arrow keys to navigate; pinch, double-tap, wheel or +/- to zoom;
// drag to pan while zoomed.
export default function Lightbox({ images, index, onIndex, onClose, title, colorHex }) {
  const ref = useDialog(true, onClose)
  const stageRef = useRef(null)
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const gesture = useRef({ pointers: new Map(), startDist: 0, startScale: 1, swipeX: 0, lastTap: 0, moved: false })
  const count = Math.max(images.length, 1)
  const image = images[index]

  // Reset zoom when changing image
  const [lastIndex, setLastIndex] = useState(index)
  if (lastIndex !== index) {
    setLastIndex(index)
    setView({ scale: 1, x: 0, y: 0 })
  }

  const go = (delta) => count > 1 && onIndex((index + delta + count) % count)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Keep the zoomed image covering the stage (no panning into empty space)
  const bound = (v) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect || v.scale <= 1) return { scale: Math.max(1, v.scale), x: 0, y: 0 }
    const maxX = ((v.scale - 1) * rect.width) / 2
    const maxY = ((v.scale - 1) * rect.height) / 2
    return { scale: v.scale, x: clamp(v.x, -maxX, maxX), y: clamp(v.y, -maxY, maxY) }
  }

  // Zoom keeping the point under (cx, cy) fixed
  const zoomAt = (nextScale, cx, cy) =>
    setView((v) => {
      const rect = stageRef.current.getBoundingClientRect()
      const scale = clamp(nextScale, 1, MAX_SCALE)
      const px = cx - rect.left - rect.width / 2
      const py = cy - rect.top - rect.height / 2
      const k = scale / v.scale
      return bound({ scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k })
    })

  const zoomCenter = (factor) => {
    const r = stageRef.current.getBoundingClientRect()
    zoomAt(view.scale * factor, r.left + r.width / 2, r.top + r.height / 2)
  }

  const g = gesture.current
  const distance = () => {
    const [a, b] = [...g.pointers.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    g.moved = false
    g.swipeX = 0
    if (g.pointers.size === 2) {
      g.startDist = distance()
      g.startScale = view.scale
    }
  }

  const onPointerMove = (e) => {
    const prev = g.pointers.get(e.pointerId)
    if (!prev) return
    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (Math.abs(dx) + Math.abs(dy) > 2) g.moved = true

    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()]
      zoomAt((g.startScale * distance()) / g.startDist, (a.x + b.x) / 2, (a.y + b.y) / 2)
    } else if (view.scale > 1) {
      setView((v) => bound({ ...v, x: v.x + dx, y: v.y + dy }))
    } else {
      g.swipeX += dx
    }
  }

  const onPointerUp = (e) => {
    g.pointers.delete(e.pointerId)
    if (g.pointers.size > 0) return

    if (view.scale === 1 && Math.abs(g.swipeX) > 60) {
      go(g.swipeX < 0 ? 1 : -1)
      return
    }
    if (!g.moved) {
      // Double tap / double click toggles zoom at that point
      const now = Date.now()
      if (now - g.lastTap < 300) {
        if (view.scale > 1) setView({ scale: 1, x: 0, y: 0 })
        else zoomAt(2.5, e.clientX, e.clientY)
        g.lastTap = 0
      } else {
        g.lastTap = now
      }
    }
  }

  const onWheel = (e) => zoomAt(view.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY)

  const roundButton = 'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30'

  // Portalled to <body>: the gallery sits in a sticky container, which would trap z-index
  return createPortal(
    <div ref={ref} role="dialog" aria-modal="true" aria-label={`${title}: image ${index + 1} of ${count}`} className="fixed inset-0 z-[60] flex animate-[fadein_.2s_ease] flex-col bg-[#0a1f18]">
      <div className="flex items-center justify-between px-4 py-3 text-sm text-ivory-200">
        <span aria-live="polite">{index + 1} / {count}</span>
        <div className="flex items-center gap-2">
          <button type="button" className={roundButton} onClick={() => zoomCenter(1 / 1.5)} disabled={view.scale <= 1} aria-label="Zoom out"><MinusIcon /></button>
          <button type="button" className={roundButton} onClick={() => zoomCenter(1.5)} disabled={view.scale >= MAX_SCALE} aria-label="Zoom in"><PlusIcon /></button>
          <button type="button" className={roundButton} onClick={onClose} aria-label="Close viewer" data-autofocus><CloseIcon /></button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={`relative flex-1 touch-none select-none overflow-hidden ${view.scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-75 will-change-transform sm:p-10"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {image ? (
            <img src={imageUrl(image.url, { width: 2000 })} alt={image.alt || title} draggable={false} className="max-h-full max-w-full object-contain" />
          ) : (
            <GemVisual color={colorHex} bare className="h-full max-h-[70vh] w-full max-w-[70vh]" />
          )}
        </div>

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} onPointerDown={(e) => e.stopPropagation()} className={`${roundButton} absolute left-3 top-1/2 -translate-y-1/2 max-sm:hidden`} aria-label="Previous image"><ChevronLeft /></button>
            <button type="button" onClick={() => go(1)} onPointerDown={(e) => e.stopPropagation()} className={`${roundButton} absolute right-3 top-1/2 -translate-y-1/2 max-sm:hidden`} aria-label="Next image"><ChevronRight /></button>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="scrollbar-none flex justify-center gap-2 overflow-x-auto px-4 py-4">
          {images.map((img, i) => (
            <li key={img.publicId ?? img.url}>
              <button type="button" onClick={() => onIndex(i)} aria-label={`Show image ${i + 1}`} aria-current={i === index} className={`block h-14 w-14 overflow-hidden border-2 ${i === index ? 'border-gold-500' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                <img src={imageUrl(img.url, { width: 120 })} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="pb-3 text-center text-xs text-ivory-200/50 max-sm:hidden">Scroll or double-click to zoom · drag to move · ← → to browse</p>
    </div>,
    document.body,
  )
}
