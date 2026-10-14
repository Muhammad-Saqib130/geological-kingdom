import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Modal behaviour for drawers, overlays and lightboxes:
// locks page scroll, closes on Escape, keeps Tab focus inside, restores focus on close.
export function useDialog(open, onClose) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const node = ref.current
    const initial = node?.querySelector('[data-autofocus]') ?? node?.querySelector(FOCUSABLE)
    initial?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current?.()
      } else if (e.key === 'Tab' && node) {
        const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  return ref
}
