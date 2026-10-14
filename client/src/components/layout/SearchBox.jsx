import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, toQuery } from '../../lib/api.js'
import { SearchIcon } from '../icons.jsx'
import Price from '../Price.jsx'
import ProductImage from '../product/ProductImage.jsx'

// Search field with live suggestions (ARIA combobox). Enter with no highlighted suggestion
// opens the full results in the shop.
export default function SearchBox({ autoFocus = false, onDone, className = '' }) {
  const navigate = useNavigate()
  const listId = useId()
  const inputRef = useRef(null)
  const [q, setQ] = useState('')
  const [found, setFound] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      api(`/products${toQuery({ q: term, limit: 5 })}`, { signal: ctrl.signal })
        .then((d) => {
          setFound(d.items)
          setActive(-1)
          setOpen(true)
        })
        .catch(() => {})
    }, 200)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q])

  // Suggestions only apply to a query of 2+ characters
  const results = q.trim().length >= 2 ? found : []

  const go = (path) => {
    setOpen(false)
    setQ('')
    onDone?.()
    navigate(path)
  }

  const onKeyDown = (e) => {
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1))
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        if (active >= 0 && results[active]) go(`/gems/${results[active].slug}`)
        else if (q.trim()) go(`/shop${toQuery({ q: q.trim() })}`)
      }}
    >
      <label className="sr-only" htmlFor={`${listId}-input`}>Search gemstones</label>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search emerald, Swat, 2 carat…"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className="w-full border border-ivory-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-muted/70 focus:border-emerald-700 focus:outline-none"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 border border-ivory-200 bg-white shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">No stones match “{q.trim()}”.</p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Suggestions">
              {results.map((p, i) => (
                <li
                  key={p.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(`/gems/${p.slug}`)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? 'bg-ivory-100' : ''}`}
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden bg-ivory-100">
                    <ProductImage product={p} width={80} sizes="40px" className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-emerald-900">{p.name}</p>
                    <p className="truncate text-xs text-muted">{[p.category?.name, `${p.carat} ct`, p.origin].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Price pkr={p.pricePKR} className="text-sm text-emerald-900" />
                </li>
              ))}
            </ul>
          )}
          <button
            type="submit"
            onMouseDown={(e) => e.preventDefault()}
            className="block w-full border-t border-ivory-200 px-4 py-2.5 text-left text-xs uppercase tracking-[0.15em] text-emerald-900 hover:bg-ivory-100"
          >
            See all results for “{q.trim()}”
          </button>
        </div>
      )}
    </form>
  )
}
