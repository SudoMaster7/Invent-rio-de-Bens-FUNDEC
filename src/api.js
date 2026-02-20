const ENV_URL = import.meta.env.VITE_APPS_SCRIPT_URL

export const LS_KEY    = 'fundec_api_url'
export const QUEUE_KEY = 'fundec_offline_queue'

// ─── URL helpers ─────────────────────────────────────────────
export function getApiUrl()  { return localStorage.getItem(LS_KEY) || ENV_URL || '' }
export function saveApiUrl(url)  { localStorage.setItem(LS_KEY, url) }
export function clearApiUrl()    { localStorage.removeItem(LS_KEY) }
export function isConfigured() {
  const url = getApiUrl()
  return !!url && !url.includes('SEU_ID')
}

// ─── Offline Queue ────────────────────────────────────────────
function _notify(count) {
  window.dispatchEvent(new CustomEvent('fundec:queue-updated', { detail: count }))
}
export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}
export function getQueueCount() { return getQueue().length }
function _setQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
  _notify(q.length)
}
export function addToQueue(data) {
  const q = getQueue()
  q.push({ ...data, _queuedAt: new Date().toISOString(), _id: Date.now() })
  _setQueue(q)
}

/** Tenta enviar todos os itens pendentes da fila. */
export async function syncQueue() {
  const q = getQueue()
  if (!q.length || !navigator.onLine) return { synced: 0, failed: 0 }
  let synced = 0
  const remaining = []
  for (const item of q) {
    const { _queuedAt, _id, ...data } = item
    try {
      await _postOnline(data)
      synced++
    } catch {
      remaining.push(item)
    }
  }
  _setQueue(remaining)
  return { synced, failed: remaining.length }
}

// ─── Core API calls ───────────────────────────────────────────
async function _postOnline(data) {
  const url = getApiUrl()
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify({ action: 'insert', ...data }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.message || 'Erro desconhecido')
  return json
}

/**
 * Envia registro — salva na fila offline se sem conexão.
 * @returns {{ success, offline? }}
 */
export async function postRegistro(data) {
  if (!navigator.onLine) {
    addToQueue(data)
    return { success: true, offline: true }
  }
  return _postOnline(data)
}

/** Exclui um registro pelo número de linha na aba. */
export async function deleteRegistro(unidade, rowNum) {
  const url = getApiUrl()
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify({ action: 'delete', unidade, rowNum }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.message || 'Erro ao excluir')
  return json
}

/** Busca registros com filtros e paginação. */
export async function getRegistros({ unidade = '', estadoBem = '', busca = '', pagina = 1 } = {}) {
  const url    = getApiUrl()
  const params = new URLSearchParams({ unidade, estadoBem, busca, pagina })
  const res    = await fetch(`${url}?${params}`)
  const json   = await res.json()
  if (!json.success) throw new Error(json.message || 'Erro ao buscar registros')
  return json
}

/** Testa ping no Apps Script. */
export async function testConnection() {
  const url = getApiUrl()
  if (!url || url.includes('SEU_ID')) return { ok: false, message: 'URL não configurada.' }
  try {
    const res  = await fetch(`${url}?ping=1`)
    const json = await res.json()
    return { ok: true, message: json.message || 'Conexão OK!' }
  } catch {
    return { ok: false, message: 'Não foi possível conectar.' }
  }
}
