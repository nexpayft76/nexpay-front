import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { convert, type ArsRateType, type Conversion } from '../../services/conversion.service'
import type { CurrencyCode } from '../../types/currency'

export const ARS_TYPES: ArsRateType[] = ['oficial', 'mep', 'blue']
// Con ARS, la cotización principal usa el dólar MEP (el de mercado).
export const MAIN_ARS_TYPE: ArsRateType = 'mep'
const DEBOUNCE_MS = 350

export interface ConversionQuote {
  main: Conversion
  // Solo cuando participa ARS: el mismo monto con cada tipo de dólar.
  byType: Record<ArsRateType, Conversion> | null
  // Diferencia entre el tipo de dólar que más da y el que menos da.
  spread: number
}

export function buildQuote(results: Conversion[], involvesArs: boolean): ConversionQuote {
  if (!involvesArs) return { main: results[0], byType: null, spread: 0 }
  const [oficial, mep, blue] = results
  const values = results.map((r) => r.result)
  return {
    main: mep,
    byType: { oficial, mep, blue },
    spread: Math.max(...values) - Math.min(...values),
  }
}

type Result = { key: string } & (
  | { status: 'ok'; quote: ConversionQuote }
  | { status: 'error'; message: string }
)

/** Cotiza `amount` de `from` a `to` (espera a que el usuario deje de mover el monto). */
export function useConversionQuote(from: CurrencyCode, to: CurrencyCode, amount: number) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const valid = amount > 0 && from !== to
  const key = `${from}:${to}:${amount}:${attempt}`

  useEffect(() => {
    if (!valid) return
    let cancelled = false
    const involvesArs = from === 'ARS' || to === 'ARS'

    const timer = setTimeout(() => {
      const types = involvesArs ? ARS_TYPES : [undefined]
      Promise.all(types.map((type) => convert(from, to, amount, type)))
        .then((results) => {
          if (!cancelled) setResult({ key, status: 'ok', quote: buildQuote(results, involvesArs) })
        })
        .catch((error: unknown) => {
          const message = error instanceof ApiError ? error.message : 'No se pudieron obtener las tasas.'
          if (!cancelled) setResult({ key, status: 'error', message })
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [from, to, amount, valid, key])

  const retry = () => setAttempt((n) => n + 1)

  if (!valid) return { status: 'idle' as const, retry }
  if (!result || result.key !== key) {
    // Mientras llega la nueva cotización, la anterior sigue visible (atenuada) si es del mismo par.
    const samePair = result?.status === 'ok' && result.quote.main.from === from && result.quote.main.to === to
    const previous = samePair && result.status === 'ok' ? result.quote : null
    return { status: 'loading' as const, previous, retry }
  }
  return { ...result, retry }
}
