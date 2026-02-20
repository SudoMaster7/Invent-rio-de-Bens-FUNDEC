import { useEffect } from 'react'

const CONFIG = {
  success: { bg: '#f0faf4', border: '#6dbe8d', text: '#155a2a', icon: '✓' },
  error:   { bg: '#fff4f4', border: '#f5a5a5', text: '#9b1c1c', icon: '✕' },
  loading: { bg: '#eef1fb', border: '#a5b4e0', text: 'var(--fundec-navy)', icon: null },
}

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (type === 'loading') return
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [type, onClose])

  const c = CONFIG[type]
  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center">
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-xl text-sm font-semibold max-w-sm w-full"
        style={{ background: c.bg, border: `1.5px solid ${c.border}`, color: c.text }}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
          style={{ background: c.border, color: '#fff' }}
        >
          {type === 'loading'
            ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
            : c.icon}
        </span>
        <span className="flex-1 leading-snug">{message}</span>
      </div>
    </div>
  )
}
