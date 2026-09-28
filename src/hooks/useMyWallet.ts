import { useEffect, useState } from 'react'
import { ApiError } from '../services/api'
import { getMyWallet } from '../services/wallet.service'
import type { MyWallet } from '../types/wallet'

type State =
  | { status: 'loading' }
  | { status: 'ok'; data: MyWallet }
  | { status: 'error'; message: string }

/** Carga la wallet del usuario valorizada en `valuedIn`. Se vuelve a pedir al cambiar la moneda o con reload(). */
export function useMyWallet(valuedIn: string) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getMyWallet(valuedIn)
      .then((data) => {
        if (!cancelled) setState({ status: 'ok', data })
      })
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : 'No se pudo cargar tu billetera.'
        if (!cancelled) setState({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [valuedIn, attempt])

  const reload = () => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  return { ...state, reload }
}
