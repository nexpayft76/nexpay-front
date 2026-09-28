/** Acepta "1.000.000", "1000000" o "1000,50" (formato local) y devuelve el número (NaN si no es válido). */
export function parseAmount(text: string): number {
  const trimmed = text.trim()
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(trimmed)) return NaN
  return Number(trimmed.replace(/\./g, '').replace(',', '.'))
}

/** true si `value` tiene como máximo `decimals` decimales (evita errores de redondeo tipo 0.1 + 0.2). */
export function hasAtMostDecimals(value: number, decimals: number): boolean {
  const scaled = value * 10 ** decimals
  return Math.abs(scaled - Math.round(scaled)) < 1e-6
}
