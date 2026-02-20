import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import Select from '../components/Select'
import Toast from '../components/Toast'
import { getRegistros, isConfigured, deleteRegistro } from '../api'
import { UNIDADES, ESTADOS_BEM } from '../data/cadastros'

const CONFIGURED = isConfigured()

const ESTADO_STYLE = {
  'Novo':                       { bg: 'rgba(30,107,56,0.10)',  border: '#6dbe8d', text: '#155a2a' },
  'Semi-Novo':                  { bg: 'rgba(13,36,72,0.08)',   border: '#a5b4e0', text: 'var(--fundec-navy)' },
  'Precisa de Reparo':          { bg: 'rgba(232,160,16,0.12)', border: '#f5bc3a', text: '#7a5000' },
  'Precisa de Grandes Reparos': { bg: 'rgba(220,100,0,0.10)',  border: '#f5a05a', text: '#7a3000' },
  'Inservível':                 { bg: 'rgba(180,30,30,0.10)',  border: '#f5a5a5', text: '#9b1c1c' },
}

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] || { bg: 'rgba(0,0,0,0.05)', border: '#ccc', text: '#555' }
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ background: s.bg, border: `1.5px solid ${s.border}`, color: s.text }}
    >
      {estado}
    </span>
  )
}

function RegistroCard({ r, onDeleteRequest, confirming, onDeleteConfirm, onDeleteCancel, deleting }) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm transition-all"
      style={{ background: 'var(--fundec-surface)', border: `1px solid ${confirming ? '#f5a5a5' : 'var(--fundec-border)'}` }}
    >
      <div
        className="px-4 py-3 flex items-start justify-between gap-2"
        style={{ borderBottom: '2px solid var(--fundec-gold)', background: 'linear-gradient(90deg, rgba(13,36,72,0.04), transparent)' }}
      >
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-sm truncate" style={{ color: 'var(--fundec-navy)' }}>{r.nomeBem || '—'}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fundec-muted)' }}>{r.unidade}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-xs font-bold rounded-lg px-2.5 py-1"
            style={{ background: 'var(--fundec-navy)', color: 'var(--fundec-gold-light)' }}
          >
            {r.plaquetaFisica || 'S/N'}
          </span>
          <button
            onClick={onDeleteRequest}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(180,30,30,0.08)', color: '#c0392b', border: '1px solid #f5a5a5' }}
            aria-label="Excluir registro"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Confirmação de exclusão */}
      {confirming && (
        <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ background: 'rgba(180,30,30,0.06)', borderBottom: '1px solid #f5a5a5' }}>
          <p className="text-xs font-bold" style={{ color: '#9b1c1c' }}>Excluir este registro definitivamente?</p>
          <div className="flex gap-2">
            <button onClick={onDeleteCancel} className="text-xs px-2.5 py-1 rounded-lg font-bold" style={{ background: 'var(--fundec-bg)', border: '1px solid var(--fundec-border)', color: 'var(--fundec-navy)' }}>Cancelar</button>
            <button onClick={onDeleteConfirm} disabled={deleting} className="text-xs px-2.5 py-1 rounded-lg font-bold disabled:opacity-60" style={{ background: '#9b1c1c', color: '#fff' }}>
              {deleting ? '...' : 'Excluir'}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex flex-col gap-2">
        {r.descricaoBem && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--fundec-text)' }}>{r.descricaoBem}</p>
        )}
        <div className="flex flex-wrap gap-1.5 items-center">
          {r.marcaBem && (
            <span
              className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: 'rgba(13,36,72,0.07)', color: 'var(--fundec-navy)', border: '1px solid rgba(13,36,72,0.12)' }}
            >
              {r.marcaBem}
            </span>
          )}
          {r.estadoBem && <EstadoBadge estado={r.estadoBem} />}
        </div>
        {r.numeroSerie && (
          <p className="text-xs font-mono" style={{ color: 'var(--fundec-muted)' }}>S/N: {r.numeroSerie}</p>
        )}
        {r.coordenadores && (
          <div className="mt-1 pt-2" style={{ borderTop: '1px solid var(--fundec-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fundec-muted)' }}>Coordenador(es)</p>
            {r.coordenadores.split(';').map((c, i) => (
              <p key={i} className="text-xs font-semibold" style={{ color: 'var(--fundec-navy)' }}>{c.trim()}</p>
            ))}
          </div>
        )}
        {r.foto && (
          <img src={r.foto} alt="Foto do bem" className="w-full rounded-xl object-cover mt-1" style={{ maxHeight: 180, border: '1px solid var(--fundec-border)' }} />
        )}
        {r.registradoEm && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--fundec-muted)' }}>📅 {r.registradoEm}</p>
        )}
      </div>
    </div>
  )
}

function ChipFiltro({ label, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
      style={{ background: 'rgba(13,36,72,0.10)', color: 'var(--fundec-navy)', border: '1px solid rgba(13,36,72,0.18)' }}
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors"
        style={{ color: 'var(--fundec-navy)' }}
        aria-label="Remover filtro"
      >
        ×
      </button>
    </span>
  )
}

export default function HistoricoPage() {
  const [todos, setTodos]                     = useState([])
  const [filtroUnidade, setFiltroUnidade]     = useState('')
  const [filtroEstado, setFiltroEstado]       = useState('')
  const [buscaInput, setBuscaInput]           = useState('')
  const [busca, setBusca]                     = useState('')
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [toast, setToast]                     = useState(null)
  const [pagina, setPagina]                   = useState(1)
  const [total, setTotal]                     = useState(0)
  const [deletingRow, setDeletingRow]         = useState(null)  // { idx, rowNum, unidade }
  const [deletingLoading, setDeletingLoading] = useState(false)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)
  const closeToast = useCallback(() => setToast(null), [])

  // Busca server-side
  const fetchData = useCallback(async (pg = 1, params = {}) => {
    if (!CONFIGURED) return
    setLoading(true)
    try {
      const result = await getRegistros({
        unidade:  params.unidade  !== undefined ? params.unidade  : filtroUnidade,
        estadoBem: params.estadoBem !== undefined ? params.estadoBem : filtroEstado,
        busca:    params.busca    !== undefined ? params.busca    : busca,
        pagina:   pg,
      })
      setTodos(result.registros || [])
      setTotal(result.total || 0)
      setPagina(pg)
    } catch {
      setToast({ type: 'error', message: 'Não foi possível carregar os registros.' })
    } finally {
      setLoading(false)
    }
  }, [filtroUnidade, filtroEstado, busca])

  // Re-busca quando filtros dropdown mudam
  useEffect(() => { fetchData(1) }, [fetchData])

  // Debounce
  const handleBuscaChange = (val) => {
    setBuscaInput(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setBusca(val), 600)
  }

  // Delete handlers
  const handleDeleteRequest = (idx, r) => setDeletingRow({ idx, rowNum: r._rowNum, unidade: r.unidade })
  const handleDeleteCancel  = () => setDeletingRow(null)
  const handleDeleteConfirm = async () => {
    if (!deletingRow) return
    setDeletingLoading(true)
    try {
      await deleteRegistro(deletingRow.unidade, deletingRow.rowNum)
      setTodos(prev => prev.filter((_, i) => i !== deletingRow.idx))
      setTotal(t => t - 1)
      setToast({ type: 'success', message: 'Registro excluído com sucesso.' })
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Erro ao excluir.' })
    } finally {
      setDeletingLoading(false)
      setDeletingRow(null)
    }
  }

  // Export Excel
  const handleExport = () => {
    if (!todos.length) return
    const rows = todos.map(r => ({
      'Plaqueta Física':   r.plaquetaFisica  || '',
      'Nome do Bem':       r.nomeBem         || '',
      'Descrição':         r.descricaoBem    || '',
      'Marca':             r.marcaBem        || '',
      'Nº Série':           r.numeroSerie     || '',
      'Estado do Bem':     r.estadoBem       || '',
      'Coordenador(es)':   r.coordenadores   || '',
      'Unidade':           r.unidade         || '',
      'Registrado em':     r.registradoEm    || '',
    }))
    const ws  = XLSX.utils.json_to_sheet(rows)
    const wb  = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventário')
    const now = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
    XLSX.writeFile(wb, `inventario-fundec-${now}.xlsx`)
  }

  // Filtragem local instantânea (zero latência enquanto digita)
  const registrosFiltrados = useMemo(() => {
    const q = buscaInput.trim().toLowerCase()
    if (!q) return todos
    return todos.filter(r => {
      const txt = [r.nomeBem, r.plaquetaFisica, r.descricaoBem, r.marcaBem, r.unidade, r.coordenadores, r.numeroSerie]
        .filter(Boolean).join(' ').toLowerCase()
      return txt.includes(q)
    })
  }, [todos, buscaInput])

  // Chips de filtros ativos
  const filtrosAtivos = [
    filtroUnidade && { label: `Unidade: ${filtroUnidade}`,    onRemove: () => setFiltroUnidade('') },
    filtroEstado  && { label: `Estado: ${filtroEstado}`,      onRemove: () => setFiltroEstado('') },
    busca         && { label: `Busca: "${busca}"`,            onRemove: () => { setBusca(''); setBuscaInput('') } },
  ].filter(Boolean)

  const qtdFiltros = filtrosAtivos.length

  return (
    <div className="flex flex-col min-h-[100dvh] pb-24" style={{ background: 'var(--fundec-bg)' }}>

      {/* Header */}
      <header
        className="relative overflow-hidden px-4 pt-12 pb-7 shadow-lg"
        style={{ background: 'linear-gradient(135deg, var(--fundec-navy-dark) 0%, var(--fundec-navy) 55%, var(--fundec-navy-light) 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.07]" style={{ background: 'var(--fundec-green)' }} />
        <div className="relative flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-md"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)' }}
          >
            <img
              src="https://www.fundec.rj.gov.br/images/logo.png"
              alt="FUNDEC"
              className="w-full h-full object-contain p-1"
              onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="font-size:22px;font-weight:900;color:#fff">F</span>' }}
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: 'var(--fundec-gold-light)' }}>
              Inventário de Bens
            </p>
            <h1 className="text-white text-[1.1rem] font-extrabold leading-tight">
              Histórico de Registros
            </h1>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, var(--fundec-gold), var(--fundec-gold-light), transparent)' }} />
      </header>

      {/* Barra de busca */}
      <div className="px-4 pt-4 pb-3" style={{ background: 'var(--fundec-surface)', borderBottom: '1px solid var(--fundec-border)' }}>
        <div className="max-w-md mx-auto flex flex-col gap-2">

          {/* Input de busca */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--fundec-muted)' }}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={buscaInput}
                onChange={e => handleBuscaChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && inputRef.current?.blur()}
                placeholder="Buscar por nome, plaqueta, marca..."
                className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'var(--fundec-bg)',
                  border: '1.5px solid var(--fundec-border)',
                  color: 'var(--fundec-text)',
                }}
              />
              {buscaInput && (
                <button
                  onClick={() => { setBuscaInput(''); setBusca('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors hover:bg-red-100"
                  style={{ color: 'var(--fundec-muted)' }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Botão de filtros */}
            <button
              onClick={() => setFiltrosVisiveis(v => !v)}
              className="relative px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{
                background: filtrosVisiveis ? 'var(--fundec-navy)' : 'var(--fundec-bg)',
                border: `1.5px solid ${filtrosVisiveis ? 'var(--fundec-navy)' : 'var(--fundec-border)'}`,
                color: filtrosVisiveis ? 'white' : 'var(--fundec-navy)',
              }}
              aria-label="Abrir filtros"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" d="M3 6h18M7 12h10M11 18h2"/>
              </svg>
              {qtdFiltros > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center"
                  style={{ background: 'var(--fundec-gold)', color: 'var(--fundec-navy)' }}
                >
                  {qtdFiltros}
                </span>
              )}
            </button>
          </div>

          {/* Painel de filtros colapsável */}
          {filtrosVisiveis && (
            <div
              className="rounded-xl p-3 flex flex-col gap-3"
              style={{ background: 'var(--fundec-bg)', border: '1px solid var(--fundec-border)' }}
            >
              <Select
                id="filtro-unidade"
                placeholder="Todas as unidades"
                options={UNIDADES}
                value={filtroUnidade}
                onChange={e => setFiltroUnidade(e.target.value)}
              />
              <Select
                id="filtro-estado"
                placeholder="Todos os estados"
                options={ESTADOS_BEM}
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
              />
              {qtdFiltros > 0 && (
                <button
                  onClick={() => {
                    setFiltroUnidade('')
                    setFiltroEstado('')
                    setBusca('')
                    setBuscaInput('')
                  }}
                  className="text-xs font-bold py-1.5 rounded-lg transition-all active:scale-95"
                  style={{ color: '#9b1c1c', background: 'rgba(180,30,30,0.08)', border: '1px solid rgba(180,30,30,0.2)' }}
                >
                  Limpar todos os filtros
                </button>
              )}
              {/* Botão Exportar Excel */}
              {todos.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 text-xs font-bold py-1.5 rounded-lg transition-all active:scale-95"
                  style={{ color: '#155a2a', background: 'rgba(30,107,56,0.09)', border: '1px solid #6dbe8d' }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M12 3v13M7 11l5 5 5-5"/>
                    <path strokeLinecap="round" d="M5 20h14"/>
                  </svg>
                  Exportar {todos.length} registro{todos.length !== 1 ? 's' : ''} (.xlsx)
                </button>
              )}
            </div>
          )}

          {/* Chips de filtros ativos */}
          {filtrosAtivos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {filtrosAtivos.map((f, i) => (
                <ChipFiltro key={i} label={f.label} onRemove={f.onRemove} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full">
        {!CONFIGURED ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(232,160,16,0.12)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--fundec-gold)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
            <div>
              <p className="font-extrabold" style={{ color: 'var(--fundec-navy)' }}>Google Sheets não configurado</p>
              <p className="text-sm mt-1" style={{ color: 'var(--fundec-muted)' }}>
                Publique o Apps Script e cole a URL no arquivo{' '}
                <code className="rounded px-1" style={{ background: 'var(--fundec-bg)', color: 'var(--fundec-navy)' }}>.env</code>
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--fundec-navy)' }} viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(13,36,72,0.06)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--fundec-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <p className="font-bold" style={{ color: 'var(--fundec-navy)' }}>Nenhum resultado encontrado</p>
            <p className="text-sm" style={{ color: 'var(--fundec-muted)' }}>
              {qtdFiltros > 0 ? 'Tente remover alguns filtros.' : 'Adicione novos registros.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs mb-4 font-semibold" style={{ color: 'var(--fundec-muted)' }}>
              {buscaInput
                ? `${registrosFiltrados.length} de ${total} resultado${registrosFiltrados.length !== 1 ? 's' : ''}`
                : `${total} bem${total !== 1 ? 'ns' : ''} registrado${total !== 1 ? 's' : ''}`
              }
            </p>
            <div className="flex flex-col gap-3">
              {registrosFiltrados.map((r, i) => (
                <RegistroCard
                  key={r._rowNum || i}
                  r={r}
                  onDeleteRequest={() => handleDeleteRequest(todos.indexOf(r), r)}
                  confirming={deletingRow?.idx === todos.indexOf(r)}
                  onDeleteConfirm={handleDeleteConfirm}
                  onDeleteCancel={handleDeleteCancel}
                  deleting={deletingLoading}
                />
              ))}
            </div>
            {/* Paginação — oculta quando há busca local ativa */}
            {!buscaInput && (
              <div className="flex justify-between items-center mt-6 gap-3">
                <button
                  onClick={() => fetchData(pagina - 1)} disabled={pagina <= 1}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30 active:scale-95"
                  style={{ background: 'var(--fundec-surface)', border: '1.5px solid var(--fundec-border)', color: 'var(--fundec-navy)' }}
                >
                  ← Anterior
                </button>
                <span className="text-xs font-bold" style={{ color: 'var(--fundec-muted)' }}>Pág. {pagina}</span>
                <button
                  onClick={() => fetchData(pagina + 1)} disabled={registrosFiltrados.length < 20}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30 active:scale-95"
                  style={{ background: 'var(--fundec-surface)', border: '1.5px solid var(--fundec-border)', color: 'var(--fundec-navy)' }}
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {toast && <Toast {...toast} onClose={closeToast} />}
    </div>
  )
}
