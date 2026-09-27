import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { convertCopToArs, type ArsRateType, type CorridorConversion } from '../../services/corridor.service'

// Supuestos de la demo, visibles en la landing para que el cálculo sea transparente.
export const NEXPAY_FEE = 0.005 // fee del cruce P2P
export const BANK_FEE_PER_CONVERSION = 0.025 // comisión en cada una de las dos conversiones bancarias
// NexPay cruza al valor de mercado (MEP); el banco liquida al dólar oficial.
export const NEXPAY_REFERENCE: ArsRateType = 'mep'
export const BANK_REFERENCE: ArsRateType = 'oficial'

const ARS_TYPES: ArsRateType[] = ['oficial', 'mep', 'blue']
const DEBOUNCE_MS = 350

export interface CorridorQuote {
  byType: Record<ArsRateType, CorridorConversion>
  nexpay: number
  bank: number
  savings: number
  savingsPct: number
}

export function computeQuote(byType: Record<ArsRateType, CorridorConversion>): CorridorQuote {
  const nexpay = byType[NEXPAY_REFERENCE].result * (1 - NEXPAY_FEE)
  const bank = byType[BANK_REFERENCE].result * (1 - BANK_FEE_PER_CONVERSION) ** 2
  const savings = nexpay - bank
  return { byType, nexpay, bank, savings, savingsPct: bank > 0 ? savings / bank : 0 }
}

type Result = { key: string } & (
  | { status: 'ok'; quote: CorridorQuote }
  | { status: 'error'; message: string }
)

/** Cotiza `amount` COP → ARS con los tres tipos de dólar a la vez (espera a que el usuario deje de mover el monto). */
export function useCorridorQuote(amount: number) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const key = `${amount}:${attempt}`

  useEffect(() => {
    if (amount <= 0) return
    let cancelled = false
    const timer = setTimeout(() => {
      Promise.all(ARS_TYPES.map((type) => convertCopToArs(amount, type)))
        .then(([oficial, mep, blue]) => {
          if (!cancelled) setResult({ key, status: 'ok', quote: computeQuote({ oficial, mep, blue }) })
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
  }, [amount, key])

  const retry = () => setAttempt((n) => n + 1)

  if (amount <= 0) return { status: 'idle' as const, retry }
  if (!result || result.key !== key) {
    // Mientras llega la nueva cotización, la anterior sigue visible (atenuada) para que no parpadee.
    const previous = result?.status === 'ok' ? result.quote : null
    return { status: 'loading' as const, previous, retry }
  }
  return { ...result, retry }
}
