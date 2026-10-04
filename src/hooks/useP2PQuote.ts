import { useEffect, useState } from 'react'
import { ApiError } from '../services/api'
import { quoteP2POffer } from '../services/p2p.service'
import type { P2PQuote, P2PQuoteParams } from '../types/p2p'

/** Espera a que el usuario deje de escribir antes de simular (evita una petición por tecla). */
const DEBOUNCE_MS = 400

export type P2PQuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; quote: P2PQuote }
  | { status: 'error'; message: string }

type FetchState = P2PQuoteState & { key?: string }

const keyOf = (p: P2PQuoteParams) => `${p.sell_currency}|${p.buy_currency}|${p.sell_amount}|${p.rate ?? ''}`

/** Simulación del back (tasa del mercado, rango, comisión y neto de cada parte) para la oferta que se está armando. */
export function useP2PQuote(params: P2PQuoteParams): P2PQuoteState {
  const [state, setState] = useState<FetchState>({ status: 'idle' })
  const { sell_currency, buy_currency, sell_amount, rate } = params
  const valid =
    Number.isFinite(sell_amount) && sell_amount > 0 && sell_currency !== buy_currency && (rate === undefined || rate > 0)
  const key = keyOf(params)

  useEffect(() => {
    if (!valid) return
    let cancelled = false
    const request: P2PQuoteParams = { sell_currency, buy_currency, sell_amount, ...(rate !== undefined && { rate }) }
    const timer = setTimeout(() => {
      setState({ status: 'loading' })
      quoteP2POffer(request)
        .then((quote) => {
          if (!cancelled) setState({ status: 'ok', quote, key: keyOf(request) })
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setState({
            status: 'error',
            message: error instanceof ApiError ? error.message : 'No se pudo calcular la oferta.',
            key: keyOf(request),
          })
        })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [sell_currency, buy_currency, sell_amount, rate, valid])

  if (!valid) return { status: 'idle' }
  // Mientras llega la nueva simulación, no mostrar la de otros datos como si fuera actual.
  if ((state.status === 'ok' || state.status === 'error') && state.key !== key) return { status: 'loading' }
  if (state.status === 'ok') return { status: 'ok', quote: state.quote }
  if (state.status === 'error') return { status: 'error', message: state.message }
  return state
}
