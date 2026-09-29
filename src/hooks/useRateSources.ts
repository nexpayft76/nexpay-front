import { useEffect, useState } from 'react'
import { getRates } from '../services/rates.service'
import type { RateProvider } from '../types/rates'
import { logLoad } from '../utils/logger'

/** Cada cuánto se vuelve a pedir el estado de las fuentes al back. */
const REFRESH_MS = 60_000
/** Cada cuánto se recalculan los "hace X min" en pantalla. */
const TICK_MS = 30_000

/**
 * Estado de los proveedores de tasas (Frankfurter, DolarApi) para mostrar de dónde sale cada tasa
 * y qué tan reciente es. `now` avanza solo, así los "hace X min" se actualizan sin recargar.
 */
export function useRateSources() {
  const [providers, setProviders] = useState<RateProvider[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    const load = () => {
      logLoad('tasas', 'fuentes de las tasas', () => getRates())
        .then((table) => {
          if (cancelled) return
          setProviders(table.providers)
          setFailed(false)
        })
        .catch(() => {
          if (!cancelled) setFailed(true)
        })
    }
    load()
    const refresh = setInterval(load, REFRESH_MS)
    const tick = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => {
      cancelled = true
      clearInterval(refresh)
      clearInterval(tick)
    }
  }, [])

  return { providers, failed, now }
}
