import { useEffect, useState } from 'react'
import { ApiError } from '../services/api'
import { quoteExchange, type ExchangeParams } from '../services/wallet.service'
import type { ExchangeQuote } from '../types/wallet'

/** Espera a que el usuario deje de escribir antes de cotizar (evita una petición por tecla). */
const DEBOUNCE_MS = 400

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; quote: ExchangeQuote; params: ExchangeParams }
  | { status: 'error'; message: string }

export type ExchangeQuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; quote: ExchangeQuote }
  | { status: 'error'; message: string }

function sameParams(a: ExchangeParams, b: ExchangeParams): boolean {
  return a.from_currency === b.from_currency && a.to_currency === b.to_currency && a.amount === b.amount && a.ars_rate === b.ars_rate
}

/** Cotización exacta del back (tasa + comisión) para mostrar el detalle antes de confirmar. */
export function useExchangeQuote(params: ExchangeParams): ExchangeQuoteState {
  const [state, setState] = useState<FetchState>({ status: 'idle' })
  const { from_currency, to_currency, amount, ars_rate } = params
  const valid = Number.isFinite(amount) && amount > 0 && from_currency !== to_currency

  useEffect(() => {
    if (!valid) return
    let cancelled = false
    const request: ExchangeParams = { from_currency, to_currency, amount, ars_rate }

    const timer = setTimeout(() => {
      setState({ status: 'loading' })
      quoteExchange(request)
        .then((quote) => {
          if (!cancelled) setState({ status: 'ok', quote, params: request })
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
  }, [from_currency, to_currency, amount, ars_rate, valid])

  if (!valid) return { status: 'idle' }
  // Mientras llega la nueva cotización, no mostrar la de otro monto u otras monedas como si fuera actual.
  if (state.status === 'ok') {
    return sameParams(state.params, params) ? { status: 'ok', quote: state.quote } : { status: 'loading' }
  }
  return state
}
