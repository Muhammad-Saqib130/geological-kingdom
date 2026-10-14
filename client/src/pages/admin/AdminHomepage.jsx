import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/admin/form.jsx'
import { useApi } from '../../hooks/useApi.js'
import { api } from '../../lib/api.js'
import { imageUrl } from '../../lib/images.js'
import { uploadImage } from '../../lib/upload.js'
import { toast } from '../../store/toastStore.js'

const SLOTS = [
  { key: 'heroImage', title: 'Hero background', where: 'Full-width banner at the top of the home page. Text sits on the left, so keep the subject to the right.', size: 'Landscape, at least 2400 × 1000 px', ratio: 'aspect-[12/5]' },
  { key: 'promoImage', title: '“Verified” banner', where: 'Right half of the dark authenticity banner.', size: 'At least 1200 × 1000 px', ratio: 'aspect-[6/5]' },
  { key: 'storyImage', title: 'Testimonial photo', where: 'Beside the client quote, near the bottom of the home page.', size: 'At least 1200 × 900 px', ratio: 'aspect-[4/3]' },
]

const strip = (img) => img && { url: img.url, publicId: img.publicId, alt: img.alt?.trim() || undefined, width: img.width, height: img.height }

export default function AdminHomepage() {
  const { data, error } = useApi('/admin/settings/homepage')
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(null)
  const [uploading, setUploading] = useState({})
  const [saving, setSaving] = useState(false)

  if (data && !saved) {
    setForm(data.homepage)
    setSaved(data.homepage)
  }

  const dirty = useMemo(() => form && saved && JSON.stringify(form) !== JSON.stringify(saved), [form, saved])
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const upload = async (key, file) => {
    if (!file) return
    setUploading((u) => ({ ...u, [key]: true }))
    try {
      const ref = await uploadImage(file, 'banners')
      setForm((f) => ({ ...f, [key]: { ...ref, alt: f[key]?.alt ?? '' } }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading((u) => ({ ...u, [key]: false }))
    }
  }

  const save = async () => {
    // Only send slots that changed
    const body = Object.fromEntries(SLOTS.filter(({ key }) => JSON.stringify(form[key]) !== JSON.stringify(saved[key])).map(({ key }) => [key, strip(form[key]) ?? null]))
    if (!Object.keys(body).length) return
    setSaving(true)
    try {
      const { homepage } = await api('/admin/settings/homepage', { method: 'PUT', json: body })
      setForm(homepage)
      setSaved(homepage)
      toast.success('Home page photos saved')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load settings: {error.message}</p>
  if (!form) return <p className="py-16 text-center text-sm text-muted" role="status">Loading…</p>

  const busy = saving || Object.values(uploading).some(Boolean)

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Homepage</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Photos for the home page. Empty slots show the built-in illustrated artwork. Replaced photos are deleted when you save.</p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
          <a href="/" target="_blank" rel="noreferrer" className="text-sm text-emerald-900 hover:underline">View home page ↗</a>
          <button type="button" onClick={save} disabled={busy || !dirty} className="btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {SLOTS.map(({ key, title, where, size, ratio }) => {
          const img = form[key]
          return (
            <Card key={key} title={title}>
              <p className="-mt-2 mb-4 text-sm text-muted">{where}</p>
              <div className={`relative ${ratio} overflow-hidden border border-ivory-200 ${img ? 'bg-ivory-50' : 'bg-sparkle'}`}>
                {img ? (
                  <img src={imageUrl(img.url, { width: 800 })} alt={img.alt || ''} className="h-full w-full object-cover" />
                ) : (
                  <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs uppercase tracking-[0.18em] text-ivory-200/80">Using illustrated artwork</p>
                )}
                {uploading[key] && <p className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-emerald-900" role="status">Uploading…</p>}
              </div>
              <p className="mt-2 text-xs text-muted">{size}. JPG, PNG, WebP or HEIC up to 10 MB.</p>

              {img && (
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Alt text</span>
                  <input
                    type="text"
                    maxLength={160}
                    value={img.alt ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: { ...f[key], alt: e.target.value } }))}
                    placeholder="Describe the photo for screen readers"
                    className="w-full border border-ivory-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
              )}

              <div className="mt-4 flex items-center gap-3">
                <label className={`btn-outline cursor-pointer px-4! py-2! text-xs! ${uploading[key] ? 'pointer-events-none opacity-50' : ''}`}>
                  {img ? 'Replace photo' : 'Upload photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,.heic" hidden onChange={(e) => { upload(key, e.target.files[0]); e.target.value = '' }} aria-label={`${img ? 'Replace' : 'Upload'} ${title}`} />
                </label>
                {img && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, [key]: null }))} className="text-sm text-red-700 hover:underline">
                    Remove
                  </button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
