const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "hace unos segundos", "hace 5 min", "hace 2 h", "hace 3 días". */
export function formatRelative(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  if (diff < MINUTE) return 'hace unos segundos'
  if (diff < HOUR) return `hace ${Math.floor(diff / MINUTE)} min`
  if (diff < DAY) return `hace ${Math.floor(diff / HOUR)} h`
  const days = Math.floor(diff / DAY)
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`
}

/** Hora local "17:56". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Para fechas sin hora ("2026-09-26", como publica Frankfurter): "de hoy", "de ayer" o "del vie 26/09".
 * Se compara con la fecha local del usuario.
 */
export function formatPublishedDay(isoDate: string, now: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  const published = new Date(year, month - 1, day)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const days = Math.round((today.getTime() - published.getTime()) / DAY)
  if (days <= 0) return 'de hoy'
  if (days === 1) return 'de ayer'
  const label = published.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  return `del ${label}`
}

/** Fecha y hora local: "4 oct 2026, 14:32". */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
