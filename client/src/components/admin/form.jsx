// Form primitives for the admin panel. Each control is labelled and wires up its error message.
import { useId } from 'react'

const control =
  'w-full border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-emerald-700 focus:outline-none disabled:bg-ivory-100'

export function Field({ label, hint, error, required, children, className = '' }) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
        {required && <span className="text-red-700" aria-hidden="true"> *</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  )
}

const border = (error) => (error ? 'border-red-600' : 'border-ivory-200')

export function TextField({ label, hint, error, required, className, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(a11y) => <input {...a11y} {...props} className={`${control} ${border(error)}`} />}
    </Field>
  )
}

export function TextArea({ label, hint, error, required, className, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(a11y) => <textarea {...a11y} {...props} className={`${control} ${border(error)} min-h-32`} />}
    </Field>
  )
}

export function SelectField({ label, hint, error, required, className, options, placeholder, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(a11y) => (
        <select {...a11y} {...props} className={`${control} ${border(error)}`}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function Checkbox({ label, hint, ...props }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" {...props} className="mt-0.5 h-4 w-4 accent-emerald-900" aria-describedby={hint ? `${id}-hint` : undefined} />
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        {hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  )
}

export function Card({ title, children, className = '' }) {
  return (
    <section className={`border border-ivory-200 bg-white p-5 sm:p-6 ${className}`}>
      {title && <h2 className="mb-5 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">{title}</h2>}
      {children}
    </section>
  )
}
