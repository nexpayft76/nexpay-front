import { useEffect, useState } from 'react'
import { ApiError } from '../services/api'
import { getRateHistory } from '../services/rates.service'
import type { HistoryRange, RateHistory } from '../types/rates'
import { logLoad } from '../utils/logger'

type State =
  | { status: 'loading' }
  /** `updating`: `data` es del par o rango anterior y ya se está pidiendo el nuevo. */
  | { status: 'ok'; data: RateHistory; updating?: boolean }
  | { status: 'error'; message: string }

type Stored =
  | { status: 'loading' }
  | { status: 'ok'; data: RateHistory }
  /** `key`: de qué par y rango es el error, para no mostrarlo cuando ya se pidió otro. */
  | { status: 'error'; message: string; key: string }

/** Historial del par para el gráfico. Se vuelve a pedir al cambiar alguna moneda o el rango. */
export function useRateHistory(from: string, to: string, range: HistoryRange): State {
  const [state, setState] = useState<Stored>({ status: 'loading' })
  const key = `${from}-${to}-${range}`

  useEffect(() => {
    let cancelled = false
    logLoad('gráfico', `historial ${from}→${to} (${range})`, () => getRateHistory(from, to, range))
      .then((data) => {
        if (!cancelled) setState({ status: 'ok', data })
      })
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : 'No se pudo cargar el historial.'
        if (!cancelled) setState({ status: 'error', message, key: `${from}-${to}-${range}` })
      })
    return () => {
      cancelled = true
    }
  }, [from, to, range])

  if (state.status === 'error') {
    // El error era de otro par o rango: mientras llega el nuevo, "cargando" (no el error viejo).
    return state.key === key ? { status: 'error', message: state.message } : { status: 'loading' }
  }
  // Mientras llega la respuesta nueva se sigue mostrando el gráfico anterior, marcado como "actualizando":
  // así no se borra y se vuelve a dibujar desde cero (el salto que parecía un reinicio de la página).
  if (state.status === 'ok' && (state.data.from !== from || state.data.to !== to || state.data.range !== range)) {
    return { ...state, updating: true }
  }
  return state
}
