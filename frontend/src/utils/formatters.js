/**
 * EventFlow — Formatters Utility
 */

export function formatCurrency(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num)
}

export function parseUtcDate(dateString) {
  if (!dateString) return null
  let str = String(dateString).trim()
  // If the date string has no explicit timezone offset (no 'Z' and no '+/-HH:mm')
  if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    // Convert SQLite 'YYYY-MM-DD HH:MM:SS' to ISO 'YYYY-MM-DDTHH:MM:SSZ'
    str = str.replace(' ', 'T') + 'Z'
  }
  const date = new Date(str)
  return isNaN(date.getTime()) ? new Date(dateString) : date
}

export function formatDate(dateString) {
  if (!dateString) return '—'
  const date = parseUtcDate(dateString)
  if (!date || isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(dateString) {
  if (!dateString) return '—'
  const date = parseUtcDate(dateString)
  if (!date || isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function truncate(text, maxLength = 120) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}
