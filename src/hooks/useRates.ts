import { useEffect, useState } from 'react'
import { ApiError } from '../services/api'
import { getRates } from '../services/rates.service'
import type { CurrencyCode } from '../types/currency'
import type { RatesSnapshot } from '../types/rates'

type Result =
  | { status: 'ok'; data: RatesSnapshot }
  | { status: 'error'; message: string }

export function useRates(base: CurrencyCode) {
  // Cambiar este número vuelve a pedir las tasas (botones "Actualizar" y "Reintentar").
  const [attempt, setAttempt] = useState(0)
  // Cada resultado queda asociado al pedido que lo generó (base + intento).
  const [result, setResult] = useState<(Result & { key: string }) | null>(null)
  const key = `${base}:${attempt}`

  useEffect(() => {
    let cancelled = false

    getRates(base)
      .then((data) => {
        if (!cancelled) setResult({ key, status: 'ok', data })
      })
      .catch((error: unknown) => {
        const message =
          error instanceof ApiError ? error.message : 'No se pudieron obtener las tasas de cambio.'
        if (!cancelled) setResult({ key, status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [base, key])

  const reload = () => setAttempt((n) => n + 1)

  // Si el resultado es de un pedido anterior (otra base o antes de recargar), seguimos cargando.
  if (!result || result.key !== key) return { status: 'loading' as const, reload }
  return { ...result, reload }
}
