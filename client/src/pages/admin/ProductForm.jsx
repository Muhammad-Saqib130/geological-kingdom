import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ImageManager from '../../components/admin/ImageManager.jsx'
import { Card, Checkbox, SelectField, TextArea, TextField } from '../../components/admin/form.jsx'
import { useApi } from '../../hooks/useApi.js'
import { api } from '../../lib/api.js'
import { MAX_PRODUCT_IMAGES, SHAPES, TREATMENTS, TREATMENT_NOTES } from '../../lib/catalog.js'
import { imageUrl } from '../../lib/images.js'
import { uploadImage } from '../../lib/upload.js'
import { formatMoney, useCurrency } from '../../store/currencyStore.js'
import { toast } from '../../store/toastStore.js'

const EMPTY = {
  name: '',
  slug: '',
  category: '',
  sku: '',
  description: '',
  carat: '',
  dimensionsMm: '',
  color: '',
  colorHex: '',
  clarity: '',
  shape: 'Other',
  origin: '',
  treatment: 'Unknown',
  certificate: { lab: '', number: '', image: null },
  pricePKR: '',
  stock: '1',
  isFeatured: false,
  isActive: true,
  images: [],
}

// API product -> form state (numbers as strings so inputs can be empty while typing)
const toForm = (p) => ({
  ...EMPTY,
  ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? EMPTY[k]])),
  category: p.category?.id ?? p.category ?? '',
  carat: String(p.carat ?? ''),
  pricePKR: String(p.pricePKR ?? ''),
  stock: String(p.stock ?? 0),
  certificate: { lab: p.certificate?.lab ?? '', number: p.certificate?.number ?? '', image: p.certificate?.image ?? null },
})

// Form state -> API payload
const toPayload = (f) => ({
  ...f,
  carat: f.carat === '' ? undefined : Number(f.carat),
  pricePKR: f.pricePKR === '' ? undefined : Number(f.pricePKR),
  stock: f.stock === '' ? 0 : Number(f.stock),
  images: f.images.map(({ url, publicId, alt, width, height }) => ({ url, publicId, alt: alt?.trim() || undefined, width, height })),
  certificate: {
    lab: f.certificate.lab,
    number: f.certificate.number,
    image: f.certificate.image ? { url: f.certificate.image.url, publicId: f.certificate.image.publicId, width: f.certificate.image.width, height: f.certificate.image.height } : null,
  },
})

// Client-side checks for the obvious mistakes; the server validates everything again.
function validate(f) {
  const e = {}
  if (f.name.trim().length < 2) e.name = 'Name is required'
  if (!f.category) e.category = 'Choose a category'
  if (!(Number(f.carat) > 0)) e.carat = 'Enter the carat weight'
  if (f.pricePKR === '' || !Number.isInteger(Number(f.pricePKR)) || Number(f.pricePKR) < 0) e.pricePKR = 'Enter a whole rupee amount'
  if (f.stock !== '' && (!Number.isInteger(Number(f.stock)) || Number(f.stock) < 0)) e.stock = 'Stock must be 0 or more'
  if (f.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug)) e.slug = 'Use lowercase letters, numbers and hyphens'
  if (f.colorHex && !/^#[0-9a-fA-F]{6}$/.test(f.colorHex)) e.colorHex = 'Use a hex colour like #1f7a4d'
  return e
}

export default function ProductForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()

  const existing = useApi(isNew ? null : `/admin/products/${id}`)
  const categories = useApi('/admin/categories').data?.items ?? []
  const origins = useApi('/products/filters').data?.origins ?? []
  const rate = useCurrency((s) => s.pkrPerUsd)

  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(EMPTY) // last saved state, for the unsaved-changes check
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [certUploading, setCertUploading] = useState(false)
  const [loadedId, setLoadedId] = useState(null)

  // Fill the form once the product loads (or when navigating to another product)
  if (!isNew && existing.data && loadedId !== existing.data.product.id) {
    const f = toForm(existing.data.product)
    setLoadedId(existing.data.product.id)
    setForm(f)
    setSaved(f)
  }

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved])

  useEffect(() => {
    if (!dirty) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = (key) => (e) => {
    const value = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }
  const setCert = (key) => (e) => setForm((f) => ({ ...f, certificate: { ...f.certificate, [key]: e.target.value } }))
  const setImages = useCallback((images) => setForm((f) => ({ ...f, images })), [])

  const uploadCertificate = async (file) => {
    if (!file) return
    setCertUploading(true)
    try {
      const ref = await uploadImage(file, 'certificates')
      setForm((f) => ({ ...f, certificate: { ...f.certificate, image: ref } }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCertUploading(false)
    }
  }

  const focusFirstError = (errs) => {
    const first = Object.keys(errs)[0]
    requestAnimationFrame(() => document.querySelector(`[data-field="${first?.split('.')[0]}"] input, [data-field="${first?.split('.')[0]}"] select, [data-field="${first?.split('.')[0]}"] textarea`)?.focus())
  }

  const submit = async (e) => {
    e.preventDefault()
    const clientErrors = validate(form)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) {
      focusFirstError(clientErrors)
      return
    }

    setSaving(true)
    try {
      const { product } = await api(isNew ? '/admin/products' : `/admin/products/${id}`, {
        method: isNew ? 'POST' : 'PATCH',
        json: toPayload(form),
      })
      const f = toForm(product)
      setForm(f)
      setSaved(f)
      setLoadedId(product.id)
      toast.success(isNew ? `${product.name} created` : 'Changes saved')
      if (isNew) navigate(`/admin/products/${product.id}`, { replace: true })
    } catch (err) {
      const fieldErrors = err.fieldErrors ?? {}
      setErrors(fieldErrors)
      toast.error(Object.keys(fieldErrors).length ? 'Please fix the highlighted fields' : err.message)
      focusFirstError(fieldErrors)
    } finally {
      setSaving(false)
    }
  }

  if (!isNew && existing.error) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl">{existing.error.status === 404 ? 'Product not found' : 'Could not load product'}</h1>
        <Link to="/admin/products" className="btn-outline mt-6">Back to products</Link>
      </div>
    )
  }
  if (!isNew && !loadedId) return <p className="py-16 text-center text-sm text-muted" role="status">Loading product…</p>

  const usd = rate && form.pricePKR !== '' ? formatMoney(Number(form.pricePKR) / rate, 'USD') : null
  const busy = saving || uploading || certUploading
  // Exact match, or the first nested error ("images.0" shows under images)
  const err = (k) => errors[k] ?? Object.entries(errors).find(([path]) => path.startsWith(`${k}.`))?.[1]

  return (
    <form onSubmit={submit} noValidate>
      <div className="sticky top-14 z-30 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ivory-200 bg-ivory-100/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="min-w-0">
          <Link to="/admin/products" className="text-xs uppercase tracking-[0.15em] text-muted hover:text-emerald-900">← Products</Link>
          <h1 className="truncate text-3xl">{isNew ? 'Add product' : saved.name || 'Edit product'}</h1>
        </div>
        <div className="flex items-center gap-3">
          {dirty && !saving && <span className="text-xs text-muted">Unsaved changes</span>}
          {!isNew && saved.isActive && existing.data && (
            <a href={`/gems/${existing.data.product.slug}`} target="_blank" rel="noreferrer" className="text-sm text-emerald-900 hover:underline">View in shop ↗</a>
          )}
          <button type="submit" className="btn-primary" disabled={busy}>
            {saving ? 'Saving…' : uploading || certUploading ? 'Uploading…' : isNew ? 'Create product' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Basics">
            <div className="grid gap-5 sm:grid-cols-2">
              <div data-field="name" className="sm:col-span-2">
                <TextField label="Name" required maxLength={120} value={form.name} onChange={set('name')} error={err('name')} placeholder="e.g. Swat Emerald" />
              </div>
              <div data-field="category">
                <SelectField label="Category" required value={form.category} onChange={set('category')} error={err('category')} placeholder="Choose…" options={categories.map((c) => ({ value: c.id, label: c.isActive ? c.name : `${c.name} (hidden)` }))} />
              </div>
              <div data-field="sku">
                <TextField label="SKU" maxLength={40} value={form.sku} onChange={set('sku')} error={err('sku')} hint="Optional stock code, e.g. GK-EM-003" />
              </div>
              <div data-field="slug" className="sm:col-span-2">
                <TextField
                  label="URL slug"
                  maxLength={140}
                  value={form.slug}
                  onChange={set('slug')}
                  error={err('slug')}
                  placeholder="generated from the name"
                  hint={`Shop address: /gems/${form.slug || 'auto-generated-from-name'}. Changing it breaks old links.`}
                />
              </div>
              <div data-field="description" className="sm:col-span-2">
                <TextArea label="Description" maxLength={5000} value={form.description} onChange={set('description')} error={err('description')} placeholder="Colour, character, where it was mined, what makes it special…" />
              </div>
            </div>
          </Card>

          <Card title="Images">
            <div data-field="images">
              <ImageManager images={form.images} onChange={setImages} max={MAX_PRODUCT_IMAGES} onBusyChange={setUploading} />
              {err('images') && <p className="mt-2 text-xs text-red-700">{err('images')}</p>}
            </div>
          </Card>

          <Card title="Gem details">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div data-field="carat">
                <TextField label="Carat weight" required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.carat} onChange={set('carat')} error={err('carat')} />
              </div>
              <div data-field="dimensionsMm">
                <TextField label="Dimensions (mm)" maxLength={60} value={form.dimensionsMm} onChange={set('dimensionsMm')} error={err('dimensionsMm')} placeholder="8.1 x 6.2 x 4.0" />
              </div>
              <div data-field="shape">
                <SelectField label="Cut / shape" value={form.shape} onChange={set('shape')} error={err('shape')} options={SHAPES.map((s) => ({ value: s, label: s }))} />
              </div>
              <div data-field="color">
                <TextField label="Colour" maxLength={60} value={form.color} onChange={set('color')} error={err('color')} placeholder="Vivid green" />
              </div>
              <div data-field="colorHex">
                <TextField
                  label="Swatch colour"
                  maxLength={7}
                  value={form.colorHex}
                  onChange={set('colorHex')}
                  error={err('colorHex')}
                  placeholder="#1f7a4d"
                  hint="Used for the placeholder until photos are added"
                />
                <input type="color" aria-label="Pick swatch colour" value={/^#[0-9a-fA-F]{6}$/.test(form.colorHex) ? form.colorHex : '#1f7a4d'} onChange={set('colorHex')} className="mt-2 h-8 w-16 cursor-pointer border border-ivory-200" />
              </div>
              <div data-field="clarity">
                <TextField label="Clarity" maxLength={60} value={form.clarity} onChange={set('clarity')} error={err('clarity')} placeholder="Eye clean" />
              </div>
              <div data-field="origin" className="sm:col-span-2">
                <TextField label="Origin" maxLength={100} list="origin-options" value={form.origin} onChange={set('origin')} error={err('origin')} placeholder="Swat, Pakistan" />
                <datalist id="origin-options">{origins.map((o) => <option key={o} value={o} />)}</datalist>
              </div>
              <div data-field="treatment">
                <SelectField label="Treatment" value={form.treatment} onChange={set('treatment')} error={err('treatment')} hint={TREATMENT_NOTES[form.treatment]} options={TREATMENTS.map((t) => ({ value: t, label: t }))} />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Visibility">
            <div className="space-y-4">
              <Checkbox label="Visible in the shop" hint="Unticked = archived" checked={form.isActive} onChange={set('isActive')} />
              <Checkbox label="Featured" hint="Shown on the home page" checked={form.isFeatured} onChange={set('isFeatured')} />
            </div>
          </Card>

          <Card title="Price & stock">
            <div className="space-y-5">
              <div data-field="pricePKR">
                <TextField label="Price (PKR)" required type="number" inputMode="numeric" min="0" step="1" value={form.pricePKR} onChange={set('pricePKR')} error={err('pricePKR')} hint={usd ? `≈ ${usd} at today's rate` : 'USD is calculated from the exchange rate'} />
              </div>
              <div data-field="stock">
                <TextField label="Stock" type="number" inputMode="numeric" min="0" step="1" value={form.stock} onChange={set('stock')} error={err('stock')} hint="Most stones are one of a kind: 1 = available, 0 = sold" />
              </div>
            </div>
          </Card>

          <Card title="Certificate">
            <div className="space-y-5" data-field="certificate">
              <TextField label="Lab" maxLength={80} value={form.certificate.lab} onChange={setCert('lab')} error={err('certificate.lab')} placeholder="GIA, PGL, GRS…" />
              <TextField label="Report number" maxLength={80} value={form.certificate.number} onChange={setCert('number')} error={err('certificate.number')} />
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">Certificate scan</p>
                {form.certificate.image ? (
                  <div className="border border-ivory-200">
                    <img src={imageUrl(form.certificate.image.url, { width: 600 })} alt="Certificate scan" className="max-h-56 w-full bg-ivory-50 object-contain" />
                    <div className="flex justify-between p-2 text-xs">
                      <label className="cursor-pointer text-emerald-900 hover:underline">
                        Replace
                        <input type="file" accept="image/*,.heic" hidden onChange={(e) => uploadCertificate(e.target.files[0])} />
                      </label>
                      <button type="button" onClick={() => setForm((f) => ({ ...f, certificate: { ...f.certificate, image: null } }))} className="text-red-700 hover:underline">Remove</button>
                    </div>
                  </div>
                ) : (
                  <label className={`flex cursor-pointer items-center justify-center border-2 border-dashed border-ivory-200 bg-white px-4 py-6 text-sm text-emerald-900 hover:border-emerald-700 ${certUploading ? 'opacity-60' : ''}`}>
                    {certUploading ? 'Uploading…' : '+ Upload certificate image'}
                    <input type="file" accept="image/*,.heic" hidden disabled={certUploading} onChange={(e) => uploadCertificate(e.target.files[0])} />
                  </label>
                )}
                {err('certificate.image') && <p className="mt-1 text-xs text-red-700">{err('certificate.image')}</p>}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </form>
  )
}
