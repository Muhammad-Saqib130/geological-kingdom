import { useEffect, useRef, useState } from 'react'
import { imageUrl } from '../../lib/images.js'
import { uploadImage } from '../../lib/upload.js'

const CONCURRENCY = 3

// Runs async jobs with a concurrency limit.
async function pool(items, worker) {
  const queue = [...items]
  const run = async () => {
    while (queue.length) await worker(queue.shift())
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, run))
}

let tempId = 0

// Gallery editor: upload several images, set alt text, reorder, choose the cover, remove.
// `images` are saved image refs; in-flight uploads are tracked locally until they finish.
export default function ImageManager({ images, onChange, max, folder = 'products', onBusyChange }) {
  const inputRef = useRef(null)
  const [pending, setPending] = useState([]) // { id, name, preview, progress, error }
  const [dragOver, setDragOver] = useState(false)
  // Latest gallery for upload callbacks that finish after newer renders
  const latest = useRef(images)
  useEffect(() => {
    latest.current = images
  }, [images])

  // Tell the form while uploads are running, so it can block saving
  const busy = pending.some((p) => !p.error)
  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])

  const addFiles = async (fileList) => {
    const room = max - latest.current.length - pending.filter((p) => !p.error).length
    const files = [...fileList].slice(0, Math.max(0, room))
    if (!files.length) return

    const jobs = files.map((file) => ({ id: ++tempId, file, name: file.name, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null, progress: 0 }))
    setPending((prev) => [...prev, ...jobs])
    const patch = (id, changes) => setPending((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)))

    await pool(jobs, async (job) => {
      try {
        const ref = await uploadImage(job.file, folder, { onProgress: (progress) => patch(job.id, { progress }) })
        // Append to the latest gallery state (other uploads may have finished meanwhile)
        latest.current = [...latest.current, { ...ref, alt: '' }]
        onChange(latest.current)
        if (job.preview) URL.revokeObjectURL(job.preview)
        setPending((prev) => prev.filter((p) => p.id !== job.id))
      } catch (err) {
        patch(job.id, { error: err.message })
      }
    })
  }

  const move = (index, delta) => {
    const next = [...images]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onChange(next)
  }

  const full = images.length + pending.filter((p) => !p.error).length >= max

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.publicId} className="border border-ivory-200 bg-ivory-50">
            <div className="relative aspect-square overflow-hidden bg-white">
              <img loading="lazy" decoding="async" src={imageUrl(img.url, { width: 360 })} alt={img.alt || ''} className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-2 top-2 bg-emerald-900 px-2 py-0.5 text-[10px] uppercase tracking-widest text-ivory-50">Cover</span>}
            </div>
            <div className="space-y-2 p-2">
              <input
                type="text"
                value={img.alt ?? ''}
                maxLength={160}
                onChange={(e) => onChange(images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                placeholder="Alt text (describe the photo)"
                aria-label={`Alt text for image ${i + 1}`}
                className="w-full border border-ivory-200 bg-white px-2 py-1 text-xs"
              />
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move image ${i + 1} earlier`} className="border border-ivory-200 bg-white px-2 py-1 disabled:opacity-30">←</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label={`Move image ${i + 1} later`} className="border border-ivory-200 bg-white px-2 py-1 disabled:opacity-30">→</button>
                  {i > 0 && (
                    <button type="button" onClick={() => move(i, -i)} className="px-1 text-emerald-900 hover:underline">Make cover</button>
                  )}
                </div>
                <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} className="text-red-700 hover:underline" aria-label={`Remove image ${i + 1}`}>
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}

        {pending.map((p) => (
          <li key={p.id} className={`border ${p.error ? 'border-red-300 bg-red-50' : 'border-ivory-200 bg-ivory-50'}`}>
            <div className="relative aspect-square overflow-hidden bg-white">
              {p.preview ? (
                <img loading="lazy" decoding="async" src={p.preview} alt="" className={`h-full w-full object-cover ${p.error ? 'opacity-40' : 'opacity-60'}`} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-muted" aria-hidden="true">Not an image</div>
              )}
              {!p.error && (
                <div className="absolute inset-x-3 bottom-3 h-1.5 bg-white/80" role="progressbar" aria-label={`Uploading ${p.name}`} aria-valuenow={Math.round(p.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-emerald-900 transition-[width]" style={{ width: `${Math.round(p.progress * 100)}%` }} />
                </div>
              )}
            </div>
            <div className="p-2 text-xs">
              {p.error ? (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-red-800">{p.error}</p>
                  <button type="button" onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))} className="text-muted hover:underline">Dismiss</button>
                </div>
              ) : (
                <p className="truncate text-muted">Uploading {p.name}…</p>
              )}
            </div>
          </li>
        ))}

        {!full && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                addFiles(e.dataTransfer.files)
              }}
              className={`flex aspect-square w-full flex-col items-center justify-center gap-2 border-2 border-dashed text-sm transition-colors ${dragOver ? 'border-emerald-700 bg-emerald-900/5' : 'border-ivory-200 bg-white hover:border-emerald-700'}`}
            >
              <span className="text-2xl text-emerald-900" aria-hidden="true">+</span>
              <span className="text-emerald-900">Add images</span>
              <span className="text-xs text-muted">or drop them here</span>
            </button>
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <p className="mt-3 text-xs text-muted">
        {images.length} of {max} images. The first image is the cover shown in the shop. JPG, PNG, WebP or HEIC up to 10 MB.
      </p>
    </div>
  )
}
