import { useState } from 'react'

export default function Input({ label, id, required, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--fundec-muted)' }}>
          {label} {required && <span style={{ color: 'var(--fundec-gold)' }}>*</span>}
        </label>
      )}
      <input
        id={id}
        required={required}
        className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all"
        style={{
          background: 'var(--fundec-surface)',
          border: focused ? '2px solid var(--fundec-navy)' : '1.5px solid var(--fundec-border)',
          color: 'var(--fundec-text)',
          boxShadow: focused ? '0 0 0 3px rgba(13,36,72,0.10)' : 'none',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </div>
  )
}
