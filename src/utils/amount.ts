/**
 * Acepta "1.000.000", "1000000", "1000,50" o "1.000," (formato local, mientras se escribe)
 * y devuelve el número (NaN si no es válido).
 */
export function parseAmount(text: string): number {
  const trimmed = text.trim()
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d*)?$/.test(trimmed)) return NaN
  return Number(trimmed.replace(/\./g, '').replace(',', '.'))
}

/** true si `value` tiene como máximo `decimals` decimales (evita errores de redondeo tipo 0.1 + 0.2). */
export function hasAtMostDecimals(value: number, decimals: number): boolean {
  const scaled = value * 10 ** decimals
  return Math.abs(scaled - Math.round(scaled)) < 1e-6
}

/** Máximo de dígitos enteros que se pueden escribir (billones): evita números absurdos. */
const MAX_INTEGER_DIGITS = 15

/**
 * Da formato al monto MIENTRAS se escribe: puntos de miles automáticos ("1000" → "1.000",
 * "1000000" → "1.000.000") y coma para los decimales.
 * - Los puntos que escriba el usuario se ignoran y se vuelven a poner donde corresponde,
 *   así nunca quedan dos puntos seguidos ni mal agrupados.
 * - Los decimales NO se recortan: si escribe más de 2, la validación en tiempo real lo avisa.
 */
export function formatAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, '')
  const commaIndex = cleaned.indexOf(',')
  const hasComma = commaIndex !== -1
  let integer = hasComma ? cleaned.slice(0, commaIndex) : cleaned
  const decimals = hasComma ? cleaned.slice(commaIndex + 1).replace(/,/g, '') : ''

  integer = integer.replace(/^0+(?=\d)/, '').slice(0, MAX_INTEGER_DIGITS)
  if (integer === '' && hasComma) integer = '0'

  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return hasComma ? `${grouped},${decimals}` : grouped
}

export type AmountIssueCode = 'format' | 'zero' | 'decimals' | 'max' | 'available'

export interface AmountIssue {
  code: AmountIssueCode
  message: string
}

export interface AmountRules {
  /** Decimales permitidos (2 por defecto, igual que el back). */
  decimals?: number
  /** Máximo permitido (ej. límite por recarga) y el mensaje si se pasa. */
  max?: { value: number; message: string }
  /** Saldo disponible (ej. al comprar) y el mensaje si no alcanza. */
  available?: { value: number; message: string }
}

/**
 * Valida el monto tal como lo escribe el usuario, para avisar en tiempo real (recarga, compra y cotizador).
 * Devuelve el problema, o undefined si es válido o si el campo todavía está vacío.
 */
export function validateAmountText(text: string, rules: AmountRules = {}): AmountIssue | undefined {
  if (!text.trim()) return undefined
  const amount = parseAmount(text)
  if (Number.isNaN(amount)) {
    return { code: 'format', message: 'Usá solo números: punto para miles y coma para decimales (ej. 1.500,50).' }
  }
  const decimals = rules.decimals ?? 2
  const typedDecimals = text.includes(',') ? text.split(',')[1]!.length : 0
  if (typedDecimals > decimals || !hasAtMostDecimals(amount, decimals)) {
    return { code: 'decimals', message: `El monto admite como máximo ${decimals} decimales.` }
  }
  if (amount <= 0) return { code: 'zero', message: 'El monto debe ser mayor que 0.' }
  if (rules.max && amount > rules.max.value) return { code: 'max', message: rules.max.message }
  if (rules.available && amount > rules.available.value) return { code: 'available', message: rules.available.message }
  return undefined
}

/**
 * Qué mostrar debajo del campo: los errores claros (decimales de más, máximo, saldo) se avisan al instante;
 * "mayor que 0" y el formato esperan a que el usuario haga una pausa, para no marcar error al escribir "0,5".
 */
export function visibleAmountError(issue: AmountIssue | undefined, settled: boolean): string | undefined {
  if (!issue) return undefined
  if (!settled && (issue.code === 'zero' || issue.code === 'format')) return undefined
  return issue.message
}
