// Las tasas van de 0,0006 (ARS→USD) a más de 3.000 (USD→COP): ajustamos los decimales según el tamaño.
export function formatRate(value: number, locale = 'es-AR'): string {
  if (value >= 100) return value.toLocaleString(locale, { maximumFractionDigits: 2 })
  if (value >= 1) return value.toLocaleString(locale, { maximumFractionDigits: 4 })
  return value.toLocaleString(locale, { maximumSignificantDigits: 4 })
}

export function formatDateTime(iso: string, locale = 'es-AR'): string {
  return new Date(iso).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
}
