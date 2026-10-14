import { useEffect, useMemo, useState } from 'react'
import { Card, TextField } from '../../components/admin/form.jsx'
import { useApi } from '../../hooks/useApi.js'
import { api } from '../../lib/api.js'
import { setStoreInfo } from '../../lib/whatsapp.js'
import { formatMoney } from '../../store/currencyStore.js'
import { toast } from '../../store/toastStore.js'

// Settings -> form strings
const toForm = (s) => ({
  pkrPerUsd: String(s.pkrPerUsd ?? ''),
  domesticPKR: String(s.shipping?.domesticPKR ?? 0),
  internationalUSD: String(s.shipping?.internationalUSD ?? 0),
  freeDomesticOverPKR: String(s.shipping?.freeDomesticOverPKR ?? 0),
  bank: { bankName: '', accountTitle: '', accountNumber: '', iban: '', ...s.paymentAccounts?.bank },
  jazzcash: { accountTitle: '', number: '', ...s.paymentAccounts?.jazzcash },
  easypaisa: { accountTitle: '', number: '', ...s.paymentAccounts?.easypaisa },
  whatsappNumber: s.whatsappNumber ? `+${s.whatsappNumber}` : '',
  lowStockThreshold: String(s.lowStockThreshold ?? 1),
})

// Same normalisation as the server: digits only, international format
const waDigits = (v) => v.replace(/[\s()-]/g, '').replace(/^(\+|00)/, '')

export default function AdminSettings() {
  const { data, error } = useApi('/admin/settings/store')
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  if (data && !saved) {
    const f = toForm(data.settings)
    setForm(f)
    setSaved(f)
  }

  const dirty = useMemo(() => form && JSON.stringify(form) !== JSON.stringify(saved), [form, saved])
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (error) return <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load settings: {error.message}</p>
  if (!form) return <p className="py-16 text-center text-sm text-muted" role="status">Loading…</p>

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setAcc = (method, key) => (e) => setForm((f) => ({ ...f, [method]: { ...f[method], [key]: e.target.value } }))

  const save = async (e) => {
    e.preventDefault()
    const num = (v) => (v === '' ? NaN : Number(v))
    const body = {
      pkrPerUsd: num(form.pkrPerUsd),
      shipping: { domesticPKR: num(form.domesticPKR), internationalUSD: num(form.internationalUSD), freeDomesticOverPKR: num(form.freeDomesticOverPKR) },
      paymentAccounts: { bank: form.bank, jazzcash: form.jazzcash, easypaisa: form.easypaisa },
      whatsappNumber: form.whatsappNumber.trim(),
      lowStockThreshold: num(form.lowStockThreshold),
    }
    const errs = {}
    if (!(body.pkrPerUsd >= 1)) errs.pkrPerUsd = 'Enter the PKR value of 1 USD'
    for (const k of ['domesticPKR', 'freeDomesticOverPKR']) if (!Number.isInteger(body.shipping[k]) || body.shipping[k] < 0) errs[k] = 'Whole rupees, 0 or more'
    if (!(body.shipping.internationalUSD >= 0)) errs.internationalUSD = 'Enter 0 or more'
    const wa = waDigits(body.whatsappNumber)
    if (wa && !/^\d{8,15}$/.test(wa)) errs.whatsappNumber = 'Use international format, e.g. +92 300 1234567'
    else if (wa.startsWith('0')) errs.whatsappNumber = 'Start with the country code, e.g. +92 300 1234567 rather than 0300…'
    if (!Number.isInteger(body.lowStockThreshold) || body.lowStockThreshold < 0) errs.lowStockThreshold = 'Whole number, 0 or more'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const { settings } = await api('/admin/settings/store', { method: 'PUT', json: body })
      const f = toForm(settings)
      setForm(f)
      setSaved(f)
      setStoreInfo(settings) // the storefront's USD prices and WhatsApp links follow straight away
      toast.success('Settings saved')
    } catch (err) {
      setErrors(Object.fromEntries(Object.entries(err.fieldErrors ?? {}).map(([k, v]) => [k.split('.').pop(), v])))
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const rate = Number(form.pkrPerUsd) || 0
  const intlPKR = rate ? Math.ceil(Number(form.internationalUSD || 0) * rate) : null

  return (
    <form onSubmit={save} noValidate>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Settings</h1>
          <p className="mt-1 text-sm text-muted">Exchange rate, shipping, contact number and the accounts customers pay into. Changes apply to new orders.</p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
          <button type="submit" className="btn-primary" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Currency">
          <TextField label="PKR per 1 USD" type="number" inputMode="decimal" min="1" step="0.01" value={form.pkrPerUsd} onChange={set('pkrPerUsd')} error={errors.pkrPerUsd} hint="Prices are stored in PKR. USD prices and card charges use this rate." />
        </Card>

        <Card title="Shipping">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Pakistan, flat rate (PKR)" type="number" inputMode="numeric" min="0" step="1" value={form.domesticPKR} onChange={set('domesticPKR')} error={errors.domesticPKR} />
            <TextField
              label="Free in Pakistan over (PKR)"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={form.freeDomesticOverPKR}
              onChange={set('freeDomesticOverPKR')}
              error={errors.freeDomesticOverPKR}
              hint={Number(form.freeDomesticOverPKR) > 0 ? `Orders from ${formatMoney(Number(form.freeDomesticOverPKR), 'PKR')} ship free` : '0 = no free shipping'}
            />
            <TextField
              label="International, flat rate (USD)"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.internationalUSD}
              onChange={set('internationalUSD')}
              error={errors.internationalUSD}
              hint={intlPKR !== null ? `≈ ${formatMoney(intlPKR, 'PKR')} at the rate above` : undefined}
              className="sm:col-span-2"
            />
          </div>
        </Card>

        <Card title="Contact">
          <TextField
            label="WhatsApp number"
            type="tel"
            value={form.whatsappNumber}
            onChange={set('whatsappNumber')}
            error={errors.whatsappNumber}
            maxLength={20}
            placeholder="+92 300 1234567"
            hint="Used for every WhatsApp link and the phone number in the header and footer. Include the country code."
          />
        </Card>

        <Card title="Dashboard alerts">
          <TextField
            label="Low stock at or below"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={form.lowStockThreshold}
            onChange={set('lowStockThreshold')}
            error={errors.lowStockThreshold}
            hint="Active products with this many or fewer in stock are listed on the dashboard. Most stones are one of a kind, so 1 is a good default."
          />
        </Card>

        <Card title="Bank transfer" className="lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <TextField label="Bank name" value={form.bank.bankName} onChange={setAcc('bank', 'bankName')} maxLength={80} placeholder="Meezan Bank" />
            <TextField label="Bank account title" value={form.bank.accountTitle} onChange={setAcc('bank', 'accountTitle')} maxLength={80} />
            <TextField label="Bank account number" value={form.bank.accountNumber} onChange={setAcc('bank', 'accountNumber')} maxLength={40} />
            <TextField label="IBAN" value={form.bank.iban} onChange={setAcc('bank', 'iban')} maxLength={40} placeholder="PK00XXXX…" />
          </div>
        </Card>

        {['jazzcash', 'easypaisa'].map((m) => (
          <Card key={m} title={m === 'jazzcash' ? 'JazzCash' : 'Easypaisa'}>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label={`${m === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} account title`} value={form[m].accountTitle} onChange={setAcc(m, 'accountTitle')} maxLength={80} />
              <TextField label={`${m === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} number`} type="tel" value={form[m].number} onChange={setAcc(m, 'number')} maxLength={20} placeholder="03xx xxxxxxx" />
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted">Customers see these account details on their order page and in the confirmation email after choosing a transfer.</p>
    </form>
  )
}
