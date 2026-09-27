export function formatDateTime(iso: string, locale = 'es-AR'): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  // Fechas sin hora (YYYY-MM-DD) se muestran solo como día.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return date.toLocaleDateString(locale, { timeZone: 'UTC' })
  return date.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
}
