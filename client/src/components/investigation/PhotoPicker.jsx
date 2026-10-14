import { useEffect, useId, useRef, useState } from 'react'
import { CloseIcon, PlusIcon } from '../icons.jsx'
import { imageUrl } from '../../lib/images.js'
import { uploadImage } from '../../lib/upload.js'

const SIGN_PATH = '/investigations/uploads/sign'
let tempId = 0

// Customer photo uploader for the investigation form. Files upload as soon as they are picked,
// so sending the form is quick and a failed upload is visible next to the photo.
export default function PhotoPicker({ photos, onChange, max, label, hint, error, onBusyChange }) {
  const id = useId()
  const inputRef = useRef(null)
  const [pending, setPending] = useState([]) // { id, name, preview, progress, error }
  const latest = useRef(photos)
  useEffect(() => {
    latest.current = photos
  }, [photos])

  const busy = pending.some((p) => !p.error)
  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])

  // Release preview URLs when the picker goes away
  const pendingRef = useRef(pending)
  useEffect(() => {
    pendingRef.current = pending
  }, [pending])
  useEffect(() => () => pendingRef.current.forEach((p) => p.preview && URL.revokeObjectURL(p.preview)), [])

  const patch = (jobId, changes) => setPending((prev) => prev.map((p) => (p.id === jobId ? { ...p, ...changes } : p)))

  const addFiles = (fileList) => {
    const room = max - latest.current.length - pending.filter((p) => !p.error).length
    const files = [...fileList].slice(0, Math.max(0, room))
    const jobs = files.map((file) => ({ id: ++tempId, file, name: file.name, preview: URL.createObjectURL(file), progress: 0 }))
    setPending((prev) => [...prev, ...jobs])

    for (const job of jobs) {
      uploadImage(job.file, 'investigations', { signPath: SIGN_PATH, onProgress: (progress) => patch(job.id, { progress }) })
        .then((ref) => {
          latest.current = [...latest.current, ref]
          onChange(latest.current)
          URL.revokeObjectURL(job.preview)
          setPending((prev) => prev.filter((p) => p.id !== job.id))
        })
        .catch((err) => patch(job.id, { error: err.message }))
    }
  }

  const remove = (publicId) => onChange(photos.filter((p) => p.publicId !== publicId))
  const dismiss = (job) => {
    URL.revokeObjectURL(job.preview)
    setPending((prev) => prev.filter((p) => p.id !== job.id))
  }

  const full = photos.length + pending.filter((p) => !p.error).length >= max
  const tile = 'relative aspect-square overflow-hidden border bg-ivory-50'

  return (
    <fieldset aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}>
      <legend className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">{label}</legend>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {photos.map((p, i) => (
          <li key={p.publicId} className={`${tile} border-ivory-200`}>
            <img loading="lazy" decoding="async" src={imageUrl(p.url, { width: 240 })} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            <button type="button" onClick={() => remove(p.publicId)} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:text-red-700" aria-label={`Remove photo ${i + 1}`}>
              <CloseIcon className="h-4 w-4" />
            </button>
          </li>
        ))}
        {pending.map((job) => (
          <li key={job.id} className={`${tile} ${job.error ? 'border-red-300' : 'border-ivory-200'}`}>
            <img loading="lazy" decoding="async" src={job.preview} alt="" className={`h-full w-full object-cover ${job.error ? 'opacity-30' : 'opacity-60'}`} />
            {job.error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center">
                <p role="alert" className="text-[11px] leading-tight text-red-800">{job.error}</p>
                <button type="button" onClick={() => dismiss(job)} className="text-[11px] underline">Dismiss</button>
              </div>
            ) : (
              <span className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-white/80" role="progressbar" aria-label={`Uploading ${job.name}`} aria-valuenow={Math.round(job.progress * 100)}>
                <span className="block h-full bg-emerald-900 transition-[width]" style={{ width: `${Math.max(5, job.progress * 100)}%` }} />
              </span>
            )}
          </li>
        ))}
        {!full && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`flex aspect-square w-full flex-col items-center justify-center gap-1 border-2 border-dashed text-xs text-emerald-900 hover:border-emerald-700 ${error ? 'border-red-400' : 'border-ivory-200'}`}
            >
              <PlusIcon className="h-5 w-5" />
              Add photo
            </button>
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,.heic"
        multiple={max > 1}
        hidden
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <p id={`${id}-hint`} className="mt-2 text-xs text-muted">{hint}</p>
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-700">{error}</p>}
    </fieldset>
  )
}
