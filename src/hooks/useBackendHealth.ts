import { useEffect, useState } from 'react'
import { ApiError } from '../services/api'
import { getHealth, type HealthStatus } from '../services/health.service'
import { logLoad } from '../utils/logger'

type State =
  | { status: 'loading' }
  | { status: 'ok'; data: HealthStatus }
  | { status: 'error'; message: string }

export function useBackendHealth() {
  const [state, setState] = useState<State>({ status: 'loading' })
  // Cambiar este número vuelve a ejecutar el chequeo (botón "Reintentar").
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    logLoad('servidor', 'estado del servidor', getHealth)
      .then((data) => {
        if (!cancelled) setState({ status: 'ok', data })
      })
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : 'Error inesperado.'
        if (!cancelled) setState({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  return { ...state, retry }
}
