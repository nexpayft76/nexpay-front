import type { CurrencyCode } from '../../types/currency'

export function formatDateTime(iso: string, locale = 'es-AR'): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  // Fechas sin hora (YYYY-MM-DD) se muestran solo como día.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return date.toLocaleDateString(locale, { timeZone: 'UTC' })
  return date.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
}

// Pesos: sin decimales en montos grandes. Dólar y euro: siempre dos.
export function formatAmount(value: number, currency: CurrencyCode): string {
  const isPeso = currency === 'COP' || currency === 'ARS'
  const decimals = isPeso && Math.abs(value) >= 1000 ? 0 : 2
  return `${value.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${currency}`
}

// Las tasas van de 0,0003 (COP→USD) a más de 4.000 (EUR→COP): ajustamos los decimales.
export function formatRate(value: number): string {
  if (value >= 100) return value.toLocaleString('es-AR', { maximumFractionDigits: 2 })
  if (value >= 1) return value.toLocaleString('es-AR', { maximumFractionDigits: 4 })
  return value.toLocaleString('es-AR', { maximumSignificantDigits: 4 })
}
