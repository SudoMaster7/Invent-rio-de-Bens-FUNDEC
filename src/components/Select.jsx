import { useState } from 'react'

const CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7a99' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")"

export default function Select({ label, id, options = [], placeholder = 'Selecione...', required, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--fundec-muted)' }}>
          {label} {required && <span style={{ color: 'var(--fundec-gold)' }}>*</span>}
        </label>
      )}
      <select
        id={id}
        required={required}
        className="w-full rounded-xl px-4 py-3 text-base outline-none appearance-none transition-all cursor-pointer"
        style={{
          background: 'var(--fundec-surface)',
          border: focused ? '2px solid var(--fundec-navy)' : '1.5px solid var(--fundec-border)',
          color: 'var(--fundec-text)',
          boxShadow: focused ? '0 0 0 3px rgba(13,36,72,0.10)' : 'none',
          backgroundImage: CHEVRON,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 1rem center',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}
