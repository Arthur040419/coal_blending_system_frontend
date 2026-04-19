export function formatDateTime(v) {
  if (!v) return '—'
  return String(v).replace('T', ' ').slice(0, 19)
}

export function formatMoney(v, digits = 2) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

export function maskApiKey(key) {
  if (!key) return '—'
  const s = String(key)
  if (s.length <= 8) return '******'
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}
