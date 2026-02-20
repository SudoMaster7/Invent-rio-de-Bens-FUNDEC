import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getQueueCount } from '../api'

const tabs = [
  {
    to: '/',
    label: 'Registrar',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path strokeLinecap="round" d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    to: '/historico',
    label: 'Histórico',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path strokeLinecap="round" d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
]

export default function Navbar() {
  const [pending, setPending] = useState(getQueueCount)

  useEffect(() => {
    const handler = (e) => setPending(e.detail)
    window.addEventListener('fundec:queue-updated', handler)
    return () => window.removeEventListener('fundec:queue-updated', handler)
  }, [])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 shadow-[0_-2px_16px_rgba(8,24,40,0.18)]"
      style={{ background: 'var(--fundec-navy-dark)', borderTop: '2px solid var(--fundec-gold)' }}
    >
      <div className="flex max-w-md mx-auto">
        {tabs.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-bold transition-all"
          >
            {({ isActive }) => (
              <>
                <span
                  className="relative flex items-center justify-center w-11 h-8 rounded-xl transition-all"
                  style={
                    isActive
                      ? { background: 'var(--fundec-gold)', color: 'var(--fundec-navy-dark)' }
                      : { color: 'rgba(255,255,255,0.45)' }
                  }
                >
                  {icon}
                  {to === '/' && pending > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center"
                      style={{ background: '#e55', color: '#fff' }}
                    >
                      {pending > 9 ? '9+' : pending}
                    </span>
                  )}
                </span>
                <span style={{ color: isActive ? 'var(--fundec-gold-light)' : 'rgba(255,255,255,0.4)' }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
