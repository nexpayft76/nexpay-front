import { useEffect, useState } from 'react'
import { ApiError } from '../services/api'
import { getRateHistory } from '../services/rates.service'
import type { HistoryRange, RateHistory } from '../types/rates'

type State =
  | { status: 'loading' }
  | { status: 'ok'; data: RateHistory }
  | { status: 'error'; message: string }

/** Historial del par para el gráfico. Se vuelve a pedir al cambiar alguna moneda o el rango. */
export function useRateHistory(from: string, to: string, range: HistoryRange): State {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    getRateHistory(from, to, range)
      .then((data) => {
        if (!cancelled) setState({ status: 'ok', data })
      })
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : 'No se pudo cargar el historial.'
        if (!cancelled) setState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [from, to, range])

  // Mientras llega la respuesta nueva, no mostrar el gráfico de otro par u otro rango como si fuera el actual.
  if (state.status === 'ok' && (state.data.from !== from || state.data.to !== to || state.data.range !== range)) {
    return { status: 'loading' }
  }
  return state
}
