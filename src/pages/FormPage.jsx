import { useState, useCallback, useEffect, useRef } from 'react'
import Input from '../components/Input'
import Select from '../components/Select'
import Toast from '../components/Toast'
import { postRegistro, syncQueue, getQueueCount } from '../api'
import { UNIDADES, ESTADOS_BEM } from '../data/cadastros'

const INITIAL = {
  unidade: '',
  plaquetaFisica: '',
  nomeBem: '',
  descricaoBem: '',
  marcaBem: '',
  numeroSerie: '',
  estadoBem: '',
  coordenadores: [{ matricula: '', nome: '', funcao: '' }],
}

// ── Sub-componentes ───────────────────────────────────────────

function Card({ icon, title, children }) {
  return (
    <section
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{ background: 'var(--fundec-surface)', border: '1px solid var(--fundec-border)' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--fundec-border)', background: 'rgba(13,36,72,0.03)' }}
      >
        <span className="text-base leading-none">{icon}</span>
        <h2 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: 'var(--fundec-navy)' }}>
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">{children}</div>
    </section>
  )
}

const ESTADO_COLORS = {
  'Novo':                      { bg: 'rgba(30,107,56,0.08)',  border: '#6dbe8d', text: 'var(--fundec-green)' },
  'Semi-Novo':                 { bg: 'rgba(13,36,72,0.07)',   border: '#a5b4e0', text: 'var(--fundec-navy)' },
  'Precisa de Reparo':         { bg: 'rgba(232,160,16,0.10)', border: '#f5bc3a', text: '#8a5e00' },
  'Precisa de Grandes Reparos':{ bg: 'rgba(220,100,0,0.10)',  border: '#f5a05a', text: '#9a4000' },
  'Inservível':                 { bg: 'rgba(180,30,30,0.09)',  border: '#f5a5a5', text: '#9b1c1c' },
}

function EstadoBemSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--fundec-muted)' }}>
        Estado do Bem <span style={{ color: 'var(--fundec-gold)' }}>*</span>
      </span>
      <div className="flex flex-col gap-2">
        {ESTADOS_BEM.map((estado) => {
          const selected = value === estado
          const colors = ESTADO_COLORS[estado]
          return (
            <button
              key={estado}
              type="button"
              onClick={() => onChange(estado)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-[0.98]"
              style={{
                background: selected ? colors.bg : 'transparent',
                border: selected ? `2px solid ${colors.border}` : '1.5px solid var(--fundec-border)',
                color: selected ? colors.text : 'var(--fundec-muted)',
              }}
            >
              <span
                className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                style={{
                  border: selected ? `2px solid ${colors.border}` : '1.5px solid var(--fundec-border)',
                  background: selected ? colors.border : 'transparent',
                }}
              >
                {selected && (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="text-sm font-semibold">{estado}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Textarea({ label, id, required, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--fundec-muted)' }}>
        {label} {required && <span style={{ color: 'var(--fundec-gold)' }}>*</span>}
      </label>
      <textarea
        id={id}
        required={required}
        rows={3}
        className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all resize-none"
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

// ── Página principal ───────────────────────────────────────────

export default function FormPage() {
  const [form, setForm]       = useState(INITIAL)
  const [toast, setToast]     = useState(null)
  const [isOnline, setIsOnline]     = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(getQueueCount)
  const [syncing, setSyncing]           = useState(false)
  const [foto, setFoto]                 = useState(null) // base64 preview
  const fotoInputRef = useRef(null)
  const closeToast = useCallback(() => setToast(null), [])

  // ── Quantidade / múltiplos itens ───────────────────────────
  const [quantidade, setQuantidade] = useState(1)
  const [itens, setItens] = useState([{ plaquetaFisica: '', numeroSerie: '' }])

  // Sincroniza o array de itens quando a quantidade muda
  useEffect(() => {
    setItens(prev => {
      const next = [...prev]
      while (next.length < quantidade) next.push({ plaquetaFisica: '', numeroSerie: '' })
      return next.slice(0, quantidade)
    })
  }, [quantidade])

  const setItemField = (idx, field) => (e) =>
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, [field]: e.target.value } : item))

  useEffect(() => {
    const goOnline  = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    const onQueue   = (e) => setPendingCount(e.detail)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    window.addEventListener('fundec:queue-updated', onQueue)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('fundec:queue-updated', onQueue)
    }
  }, [])

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const addCoordenador = () =>
    setForm((prev) => ({ ...prev, coordenadores: [...prev.coordenadores, { matricula: '', nome: '', funcao: '' }] }))

  const removeCoordenador = (idx) =>
    setForm((prev) => ({ ...prev, coordenadores: prev.coordenadores.filter((_, i) => i !== idx) }))

  const setCoordenadorField = (idx, field) => (e) =>
    setForm((prev) => {
      const updated = prev.coordenadores.map((c, i) => i === idx ? { ...c, [field]: e.target.value } : c)
      return { ...prev, coordenadores: updated }
    })

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { synced } = await syncQueue()
      setToast({ type: 'success', message: `${synced} registro${synced !== 1 ? 's' : ''} sincronizados com sucesso!` })
    } catch {
      setToast({ type: 'error', message: 'Falha ao sincronizar.' })
    } finally {
      setSyncing(false)
    }
  }

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setFoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.estadoBem) {
      setToast({ type: 'error', message: 'Selecione o estado do bem antes de salvar.' })
      return
    }

    const total = quantidade
    setToast({ type: 'loading', message: isOnline
      ? `Salvando ${total > 1 ? total + ' registros' : 'na planilha'}...`
      : 'Sem internet — salvando localmente...' })

    try {
      if (total === 1) {
        // comportamento original
        const payload = {
          ...form,
          plaquetaFisica: itens[0].plaquetaFisica || form.plaquetaFisica,
          numeroSerie:    itens[0].numeroSerie    || form.numeroSerie,
          foto: foto || ''
        }
        const result = await postRegistro(payload)
        if (result.offline) {
          setToast({ type: 'success', message: '⚡ Salvo na fila! Será enviado ao reconectar.' })
        } else {
          setToast({ type: 'success', message: 'Registro salvo com sucesso!' })
        }
      } else {
        // múltiplos itens: envia um de cada vez
        let offlineCount = 0
        for (let i = 0; i < itens.length; i++) {
          setToast({ type: 'loading', message: `Salvando item ${i + 1} de ${total}...` })
          const payload = {
            ...form,
            plaquetaFisica: itens[i].plaquetaFisica,
            numeroSerie:    itens[i].numeroSerie,
            foto: foto || ''
          }
          const result = await postRegistro(payload)
          if (result.offline) offlineCount++
        }
        if (offlineCount > 0) {
          setToast({ type: 'success', message: `⚡ ${offlineCount} de ${total} itens salvos na fila offline.` })
        } else {
          setToast({ type: 'success', message: `${total} registros salvos com sucesso!` })
        }
      }

      setForm((prev) => ({ ...INITIAL, unidade: prev.unidade }))
      setFoto(null)
      setQuantidade(1)
      setItens([{ plaquetaFisica: '', numeroSerie: '' }])
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Falha ao salvar. Verifique a conexão.' })
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh] pb-24" style={{ background: 'var(--fundec-bg)' }}>

      {/* Header */}
      <header
        className="relative overflow-hidden px-4 pt-12 pb-7 shadow-lg"
        style={{ background: 'linear-gradient(135deg, var(--fundec-navy-dark) 0%, var(--fundec-navy) 55%, var(--fundec-navy-light) 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.07]" style={{ background: 'var(--fundec-gold)' }} />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: 'var(--fundec-green)' }} />
        <div className="relative flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-md"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)' }}
          >
            <img
              src="https://www.fundec.rj.gov.br/images/logo.png"
              alt="FUNDEC"
              className="w-full h-full object-contain p-1"
              onError={e => {
                e.target.style.display = 'none'
                e.target.parentElement.innerHTML = '<span style="font-size:22px;font-weight:900;color:#fff">F</span>'
              }}
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: 'var(--fundec-gold-light)' }}>
              Inventário de Bens
            </p>
            <h1 className="text-white text-[1.1rem] font-extrabold leading-tight">
              Novo Registro<br />
              <span style={{ color: 'var(--fundec-gold-light)' }}>de Bem Patrimonial</span>
            </h1>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, var(--fundec-gold), var(--fundec-gold-light), transparent)' }} />
      </header>

      {/* Banner offline */}
      {!isOnline && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#7a3000', color: '#ffe0b0' }}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 17.657a9 9 0 010-12.728M9.172 15.536a5 5 0 010-7.072M12 12h.01"/>
          </svg>
          <span className="text-xs font-bold">Sem internet — os registros serão salvos e enviados ao reconectar</span>
        </div>
      )}

      {/* Banner sincronizar pendentes */}
      {isOnline && pendingCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: 'rgba(232,160,16,0.15)', borderBottom: '1px solid var(--fundec-gold)' }}>
          <span className="text-xs font-bold" style={{ color: 'var(--fundec-navy)' }}>
            ⚡ {pendingCount} registro{pendingCount !== 1 ? 's' : ''} aguardando envio
          </span>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-60"
            style={{ background: 'var(--fundec-gold)', color: 'var(--fundec-navy)' }}
          >
            {syncing ? 'Enviando...' : 'Sincronizar agora'}
          </button>
        </div>
      )}

      {/* Form */}
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Unidade */}
          <Card icon="🏢" title="Unidade">
            <Select
              id="unidade"
              label="Unidade / Local"
              required
              placeholder="Selecione a unidade..."
              options={UNIDADES}
              value={form.unidade}
              onChange={setField('unidade')}
            />
          </Card>

          {/* Identificação do Bem */}
          <Card icon="🏷️" title="Identificação do Bem">

            {/* Quantidade */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--fundec-muted)' }}>
                Quantidade de itens
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-lg transition-all active:scale-90"
                  style={{ background: 'rgba(13,36,72,0.08)', color: 'var(--fundec-navy)', border: '1.5px solid var(--fundec-border)' }}
                >−</button>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={quantidade}
                  onChange={e => setQuantidade(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center rounded-xl px-3 py-2 text-base font-extrabold outline-none"
                  style={{ background: 'var(--fundec-surface)', border: '1.5px solid var(--fundec-border)', color: 'var(--fundec-navy)' }}
                />
                <button
                  type="button"
                  onClick={() => setQuantidade(q => Math.min(50, q + 1))}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-lg transition-all active:scale-90"
                  style={{ background: 'rgba(13,36,72,0.08)', color: 'var(--fundec-navy)', border: '1.5px solid var(--fundec-border)' }}
                >+</button>
              </div>
              {quantidade > 1 && (
                <p className="text-xs" style={{ color: 'var(--fundec-muted)' }}>
                  Preencha plaqueta e série individualmente abaixo. Os demais campos são compartilhados.
                </p>
              )}
            </div>

            {/* Nome + Descrição (sempre visíveis) */}
            <Input
              id="nomeBem"
              label="Nome do Bem"
              required
              placeholder="Ex: Cadeira Giratória"
              value={form.nomeBem}
              onChange={setField('nomeBem')}
            />
            <Textarea
              id="descricaoBem"
              label="Descrição do Bem"
              placeholder="Descreva as características do bem..."
              value={form.descricaoBem}
              onChange={setField('descricaoBem')}
            />

            {/* Plaqueta + Série — único item */}
            {quantidade === 1 && (
              <>
                <Input
                  id="plaquetaFisica"
                  label="Plaqueta Física"
                  required
                  placeholder="Ex: 001234"
                  value={itens[0].plaquetaFisica}
                  onChange={setItemField(0, 'plaquetaFisica')}
                />
                <Input
                  id="numeroSerie"
                  label="Número de Série"
                  placeholder="Ex: SN-78932ABCD"
                  value={itens[0].numeroSerie}
                  onChange={setItemField(0, 'numeroSerie')}
                />
              </>
            )}

            {/* Plaqueta + Série — múltiplos itens */}
            {quantidade > 1 && (
              <div className="flex flex-col gap-3">
                <div
                  className="grid text-xs font-extrabold uppercase tracking-widest px-2 pb-1"
                  style={{ gridTemplateColumns: '28px 1fr 1fr', color: 'var(--fundec-muted)', borderBottom: '1px solid var(--fundec-border)' }}
                >
                  <span>#</span>
                  <span>Plaqueta Física <span style={{ color: 'var(--fundec-gold)' }}>*</span></span>
                  <span>Nº de Série</span>
                </div>
                {itens.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid items-center gap-2"
                    style={{ gridTemplateColumns: '28px 1fr 1fr' }}
                  >
                    <span className="text-xs font-extrabold text-center rounded-lg py-1" style={{ background: 'rgba(13,36,72,0.07)', color: 'var(--fundec-navy)' }}>
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="000000"
                      value={item.plaquetaFisica}
                      onChange={setItemField(idx, 'plaquetaFisica')}
                      className="rounded-xl px-3 py-2.5 text-sm outline-none w-full"
                      style={{ background: 'var(--fundec-surface)', border: '1.5px solid var(--fundec-border)', color: 'var(--fundec-text)' }}
                    />
                    <input
                      type="text"
                      placeholder="SN-..."
                      value={item.numeroSerie}
                      onChange={setItemField(idx, 'numeroSerie')}
                      className="rounded-xl px-3 py-2.5 text-sm outline-none w-full"
                      style={{ background: 'var(--fundec-surface)', border: '1.5px solid var(--fundec-border)', color: 'var(--fundec-text)' }}
                    />
                  </div>
                ))}
              </div>
            )}

          </Card>

          {/* Fabricação */}
          <Card icon="🏭" title="Fabricação">
            <Input
              id="marcaBem"
              label="Marca do Bem"
              placeholder="Ex: Dell, Positivo, Tramontina..."
              value={form.marcaBem}
              onChange={setField('marcaBem')}
            />
          </Card>

          {/* Foto do Bem */}
          <Card icon="📷" title="Foto do Bem (opcional)">
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFoto}
            />
            {foto ? (
              <div className="relative">
                <img
                  src={foto}
                  alt="Foto do bem"
                  className="w-full rounded-xl object-cover"
                  style={{ maxHeight: 220, border: '2px solid var(--fundec-border)' }}
                />
                <button
                  type="button"
                  onClick={() => setFoto(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fotoInputRef.current?.click()}
                className="w-full rounded-xl py-8 flex flex-col items-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: 'var(--fundec-bg)', border: '2px dashed var(--fundec-border)', color: 'var(--fundec-muted)' }}
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <circle cx="12" cy="13" r="3"/>
                </svg>
                <span className="text-xs font-bold">Tirar foto ou escolher da galeria</span>
              </button>
            )}
          </Card>

          {/* Coordenadores */}
          <Card icon="👤" title="Coordenador(es) Presente(s)">
            {form.coordenadores.map((c, idx) => (
              <div key={idx} className="flex flex-col gap-3">
                {idx > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px" style={{ background: 'var(--fundec-border)' }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--fundec-muted)' }}>Coordenador {idx + 1}</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--fundec-border)' }} />
                    <button
                      type="button"
                      onClick={() => removeCoordenador(idx)}
                      className="ml-1 w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90"
                      style={{ background: 'rgba(180,30,30,0.10)', color: '#9b1c1c', border: '1.5px solid #f5a5a5' }}
                      title="Remover coordenador"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <Input
                  id={`matricula-${idx}`}
                  label="Matrícula"
                  required={idx === 0}
                  placeholder="Ex: 123456"
                  value={c.matricula}
                  onChange={setCoordenadorField(idx, 'matricula')}
                />
                <Input
                  id={`nomeCoordenador-${idx}`}
                  label="Nome"
                  required={idx === 0}
                  placeholder="Nome completo"
                  value={c.nome}
                  onChange={setCoordenadorField(idx, 'nome')}
                />
                <Input
                  id={`funcao-${idx}`}
                  label="Função / Cargo"
                  placeholder="Ex: Coordenador, Assistente, Analista de Licitação..."
                  value={c.funcao}
                  onChange={setCoordenadorField(idx, 'funcao')}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addCoordenador}
              className="mt-1 w-full rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(13,36,72,0.06)', border: '1.5px dashed var(--fundec-navy)', color: 'var(--fundec-navy)' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
              Adicionar outro coordenador
            </button>
          </Card>

          {/* Estado do Bem */}
          <Card icon="🔍" title="Estado do Bem">
            <EstadoBemSelector
              value={form.estadoBem}
              onChange={(val) => setForm((prev) => ({ ...prev, estadoBem: val }))}
            />
          </Card>

          <button
            type="submit"
            disabled={toast?.type === 'loading'}
            className="mt-1 w-full rounded-2xl px-6 py-4 text-base font-extrabold shadow-lg active:scale-[0.97] transition-transform disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--fundec-navy) 0%, var(--fundec-navy-light) 100%)',
              color: '#fff',
              boxShadow: '0 6px 20px rgba(13,36,72,0.30)',
            }}
          >
            {toast?.type === 'loading'
              ? <><svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg> Salvando...</>
              : quantidade > 1
                ? <><span style={{ color: 'var(--fundec-gold-light)' }}>✓</span> Salvar {quantidade} Registros na Planilha</>
                : <><span style={{ color: 'var(--fundec-gold-light)' }}>✓</span> Salvar Registro na Planilha</>
            }
          </button>
        </form>
      </main>

      {toast && <Toast {...toast} onClose={closeToast} />}
    </div>
  )
}