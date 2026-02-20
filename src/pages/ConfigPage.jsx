import { useState, useEffect } from 'react'
import Input from '../components/Input'
import Toast from '../components/Toast'
import { getApiUrl, saveApiUrl, clearApiUrl, isConfigured, testConnection } from '../api'

function StatusDot({ ok }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
      style={
        ok
          ? { background: 'rgba(30,107,56,0.10)', border: '1.5px solid #6dbe8d', color: '#155a2a' }
          : { background: 'rgba(180,30,30,0.10)', border: '1.5px solid #f5a5a5', color: '#9b1c1c' }
      }
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: ok ? '#1e6b38' : '#dc2626' }}
      />
      {ok ? 'Conectado' : 'Não configurado'}
    </span>
  )
}

export default function ConfigPage() {
  const [url, setUrl]         = useState('')
  const [saved, setSaved]     = useState(false)
  const [testing, setTesting] = useState(false)
  const [toast, setToast]     = useState(null)

  useEffect(() => {
    const current = getApiUrl()
    if (current && !current.includes('SEU_ID')) setUrl(current)
    setSaved(isConfigured())
  }, [])

  const handleSave = () => {
    const trimmed = url.trim()
    if (!trimmed.startsWith('https://script.google.com')) {
      setToast({ type: 'error', message: 'URL inválida. Deve começar com https://script.google.com' })
      return
    }
    saveApiUrl(trimmed)
    setSaved(true)
    setToast({ type: 'success', message: 'URL salva! O app já pode enviar e buscar dados.' })
  }

  const handleTest = async () => {
    const trimmed = url.trim()
    if (!trimmed) { setToast({ type: 'error', message: 'Cole a URL antes de testar.' }); return }
    saveApiUrl(trimmed)
    setTesting(true)
    const result = await testConnection()
    setTesting(false)
    setSaved(result.ok)
    setToast({ type: result.ok ? 'success' : 'error', message: result.message })
  }

  const handleClear = () => {
    clearApiUrl()
    setUrl('')
    setSaved(false)
    setToast({ type: 'error', message: 'Configuração removida.' })
  }

  return (
    <div className="flex flex-col min-h-[100dvh] pb-24" style={{ background: 'var(--fundec-bg)' }}>

      {/* Header */}
      <header
        className="relative overflow-hidden px-4 pt-12 pb-7 shadow-lg"
        style={{ background: 'linear-gradient(135deg,var(--fundec-navy-dark) 0%,var(--fundec-navy) 55%,var(--fundec-navy-light) 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.07]" style={{ background: 'var(--fundec-gold)' }} />
        <div className="relative flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-md"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)' }}
          >
            <img
              src="https://www.fundec.rj.gov.br/images/logo.png"
              alt="FUNDEC"
              className="w-full h-full object-contain p-1"
              onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="font-size:22px;font-weight:900;color:#fff">F</span>' }}
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: 'var(--fundec-gold-light)' }}>
              Inventário de Bens
            </p>
            <h1 className="text-white text-[1.1rem] font-extrabold leading-tight">Configurações</h1>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]"
          style={{ background: 'linear-gradient(90deg,var(--fundec-gold),var(--fundec-gold-light),transparent)' }} />
      </header>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-5">

        {/* Status */}
        <div
          className="rounded-2xl px-4 py-4 flex items-center justify-between gap-3"
          style={{ background: 'var(--fundec-surface)', border: '1px solid var(--fundec-border)' }}
        >
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest mb-1" style={{ color: 'var(--fundec-muted)' }}>Status da Conexão</p>
            <StatusDot ok={saved} />
          </div>
          <svg className="w-8 h-8 opacity-20" style={{ color: 'var(--fundec-navy)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0v-4m0-5v-1M8.5 12a3.5 3.5 0 017 0"/>
          </svg>
        </div>

        {/* Google Apps Script */}
        <section
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{ background: 'var(--fundec-surface)', border: '1px solid var(--fundec-border)' }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: '1px solid var(--fundec-border)', background: 'rgba(13,36,72,0.03)' }}
          >
            <span className="text-base">🔗</span>
            <h2 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: 'var(--fundec-navy)' }}>
              URL do Google Apps Script
            </h2>
          </div>
          <div className="px-4 py-4 flex flex-col gap-4">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--fundec-muted)' }}>
              Cole aqui a URL gerada ao implantar o script como <strong>App da Web</strong> no Google Sheets.
            </p>
            <Input
              id="apps-script-url"
              label="URL do App da Web"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={testing || !url.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'rgba(13,36,72,0.07)', border: '1.5px solid var(--fundec-navy)', color: 'var(--fundec-navy)' }}
              >
                {testing
                  ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                  : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
                }
                {testing ? 'Testando...' : 'Testar'}
              </button>
              <button
                onClick={handleSave}
                disabled={!url.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,var(--fundec-navy),var(--fundec-navy-light))', color: '#fff' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                Salvar
              </button>
            </div>
          </div>
        </section>

        {/* Passo a passo */}
        <section
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{ background: 'var(--fundec-surface)', border: '1px solid var(--fundec-border)' }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: '1px solid var(--fundec-border)', background: 'rgba(13,36,72,0.03)' }}
          >
            <span className="text-base">📋</span>
            <h2 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: 'var(--fundec-navy)' }}>
              Como configurar
            </h2>
          </div>
          <ol className="px-4 py-4 flex flex-col gap-3">
            {[
              'Abra a planilha do inventário no Google Sheets',
              'Clique em Extensões → Apps Script',
              'Cole o código do arquivo Code.gs fornecido',
              'Clique em Implantar → Nova implantação',
              'Tipo: App da Web | Acesso: Qualquer pessoa',
              'Copie a URL gerada e cole no campo acima',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold"
                  style={{ background: 'var(--fundec-navy)', color: 'var(--fundec-gold-light)' }}
                >
                  {i + 1}
                </span>
                <p className="text-sm pt-0.5" style={{ color: 'var(--fundec-text)' }}>{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Remover configuração */}
        {saved && (
          <button
            onClick={handleClear}
            className="w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'rgba(180,30,30,0.07)', border: '1.5px solid #f5a5a5', color: '#9b1c1c' }}
          >
            Remover configuração salva
          </button>
        )}
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
