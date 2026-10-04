import type { P2POfferStatus } from '../../types/p2p'

/** Tasa con hasta 6 cifras significativas: "4.100" o "0,00025". */
export function formatRate(rate: number): string {
  return new Intl.NumberFormat('es-AR', { maximumSignificantDigits: 6 }).format(rate)
}

/** Tasa para escribirla en el campo (formato local, sin separador de miles): "4100,5". */
export function rateToInput(rate: number): string {
  return String(Number(rate.toPrecision(6))).replace('.', ',')
}

/** "0,5%" (formato local). */
export function percentText(percent: number): string {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(percent)}%`
}

/** "+2,5% sobre el mercado" / "-1,2% bajo el mercado" / "igual al mercado". */
export function deviationText(percent: number): string {
  if (Math.abs(percent) < 0.01) return 'igual a la tasa actual'
  const value = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Math.abs(percent))
  return percent > 0 ? `${value}% sobre la tasa actual` : `${value}% bajo la tasa actual`
}

/** "vence en 2 d 5 h" / "vence en 40 min". */
export function expiresIn(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((Date.parse(iso) - now) / 60_000))
  if (minutes < 60) return `vence en ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vence en ${hours} h`
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return `vence en ${days} d${rest ? ` ${rest} h` : ''}`
}

export const STATUS_LABEL: Record<P2POfferStatus, string> = {
  open: 'Abierta',
  completed: 'Completada',
  cancelled: 'Cancelada',
  expired: 'Vencida',
}
