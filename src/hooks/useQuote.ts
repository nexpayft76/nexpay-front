import { useEffect, useState } from 'react'
import { ApiError } from '../services/api'
import { convert } from '../services/rates.service'
import type { ArsRateType, Conversion } from '../types/rates'

export const ARS_RATE_TYPES: ArsRateType[] = ['oficial', 'mep', 'blue']

/** Espera a que el usuario deje de escribir antes de cotizar (evita una petición por tecla). */
const DEBOUNCE_MS = 400

interface QuoteInput {
  from: string
  to: string
  amount: number
  arsRate: ArsRateType
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; results: Conversion[] }
  | { status: 'error'; message: string }

export type QuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; quote: Conversion; comparison: Conversion[] }
  | { status: 'error'; message: string }

/**
 * Cotiza `amount` de `from` a `to`. Si participa ARS, cotiza de una vez con los 3 tipos de dólar:
 * así la comparación está lista y cambiar entre oficial, MEP y blue no vuelve a llamar al back.
 */
export function useQuote({ from, to, amount, arsRate }: QuoteInput): QuoteState {
  const [state, setState] = useState<FetchState>({ status: 'idle' })
  const valid = Number.isFinite(amount) && amount > 0 && from !== to
  const involvesArs = from === 'ARS' || to === 'ARS'

  useEffect(() => {
    if (!valid) return
    let cancelled = false

    const timer = setTimeout(() => {
      setState({ status: 'loading' })
      const types = involvesArs ? ARS_RATE_TYPES : [undefined]
      Promise.all(types.map((type) => convert(from, to, amount, type)))
        .then((results) => {
          if (!cancelled) setState({ status: 'ok', results })
        })
        .catch((error: unknown) => {
          const message = error instanceof ApiError ? error.message : 'No se pudo cotizar.'
          if (!cancelled) setState({ status: 'error', message })
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [from, to, amount, valid, involvesArs])

  if (!valid) return { status: 'idle' }
  if (state.status !== 'ok') return state

  // Mientras llega la nueva cotización, no mostrar la de otro monto u otras monedas como si fuera actual.
  const first = state.results[0]
  if (!first || first.from !== from || first.to !== to || first.amount !== amount) return { status: 'loading' }

  const quote = involvesArs ? state.results.find((r) => r.ars_rate?.type === arsRate) : state.results[0]
  if (!quote) return { status: 'loading' }
  return { status: 'ok', quote, comparison: involvesArs ? state.results : [] }
}
