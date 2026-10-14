import { useEffect, useRef, useState } from 'react'

const HEIGHT = 220
const PAD = { top: 12, right: 8, bottom: 26, left: 56 }
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

// A "nice" axis maximum (1, 2, 2.5 or 5 x 10^n) and its three gridline steps
function niceMax(value) {
  if (value <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * exp >= value) * exp
  return step
}

// Single-series bar chart: bars anchored to the baseline with rounded tops, recessive gridlines,
// a hover/focus tooltip per bar and a visually hidden table for screen readers.
// rows: [{ key, label, tick, value, detail }]; ticks (short axis labels) are thinned to fit, counting back from the last bar.
export default function BarChart({ rows, formatValue, caption }) {
  const wrap = useRef(null)
  const [width, setWidth] = useState(640)
  const [active, setActive] = useState(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const max = niceMax(Math.max(...rows.map((r) => r.value)))
  const innerW = width - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const slot = innerW / rows.length
  const gap = Math.max(2, slot * 0.25)
  const barW = Math.max(2, slot - gap)
  const y = (v) => PAD.top + innerH - (v / max) * innerH
  const ticks = [0, max / 2, max]
  const r = Math.min(4, barW / 2)
  const tickEvery = Math.max(1, Math.ceil(52 / slot)) // ~52px per label
  const showTick = (i) => (rows.length - 1 - i) % tickEvery === 0

  // Rounded top corners only; the bottom sits flat on the baseline
  const barPath = (x, top, w, h) =>
    h <= 0 ? '' : h < r ? `M${x},${top + h}V${top}H${x + w}V${top + h}Z` : `M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${top + h}Z`

  const a = active === null ? null : rows[active]
  const tipLeft = active === null ? 0 : Math.min(Math.max(PAD.left + slot * active + slot / 2, 90), width - 90)

  return (
    <figure className="m-0">
      <div ref={wrap} className="relative" onMouseLeave={() => setActive(null)}>
        <svg width={width} height={HEIGHT} role="img" aria-label={caption} className="block max-w-full">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-ivory-200" strokeWidth="1" />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {t === 0 ? '0' : compact.format(t)}
              </text>
            </g>
          ))}
          {rows.map((row, i) => {
            const x = PAD.left + slot * i + gap / 2
            const top = y(row.value)
            return (
              <g key={row.key}>
                <path d={barPath(x, top, barW, PAD.top + innerH - top)} className={active === i ? 'fill-gold-500' : 'fill-emerald-800'} />
                {row.tick && showTick(i) && (
                  // The last label is right-aligned so it never runs off the edge
                  <text x={i === rows.length - 1 && slot < 52 ? Math.min(x + barW, width - 2) : x + barW / 2} y={HEIGHT - 8} textAnchor={i === rows.length - 1 && slot < 52 ? 'end' : 'middle'} className="fill-muted text-[11px]">{row.tick}</text>
                )}
                {/* Hit target: the whole column, larger than the bar */}
                <rect
                  x={PAD.left + slot * i}
                  y={PAD.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${row.label}: ${formatValue(row.value)}${row.detail ? `, ${row.detail}` : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="cursor-default outline-none"
                />
              </g>
            )
          })}
        </svg>
        {a && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap border border-ivory-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{ left: tipLeft }}
            role="status"
          >
            <p className="text-muted">{a.label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{formatValue(a.value)}</p>
            {a.detail && <p className="text-muted">{a.detail}</p>}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead><tr><th scope="col">Period</th><th scope="col">Value</th><th scope="col">Detail</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}><th scope="row">{row.label}</th><td>{formatValue(row.value)}</td><td>{row.detail}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
