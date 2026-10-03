import type { AuthUser } from '../types/auth'

const STATUS_LABELS: Record<AuthUser['status'], string> = {
  active: 'Activa',
  suspended: 'Suspendida',
  closed: 'Cerrada',
}

/** "active" → "Activa". Un estado desconocido se muestra tal cual, para no ocultarlo. */
export function statusLabel(status: AuthUser['status']): string {
  return STATUS_LABELS[status] ?? status
}

/** "2026-03-05T10:00:00Z" → "5 de marzo de 2026". Si la fecha no es válida devuelve "—". */
export function formatMemberSince(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** "Ana Pérez" → "AP"; "ana" → "A"; vacío → "?". Máximo dos letras. */
export function initials(fullName: string): string {
  const letters = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
  return letters.join('') || '?'
}
