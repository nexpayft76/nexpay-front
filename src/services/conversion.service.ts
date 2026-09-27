import { api } from './api'
import type { CurrencyCode } from '../types/currency'

// Endpoints públicos de tasas del back (no requieren sesión).

export type ArsRateType = 'oficial' | 'mep' | 'blue'

export interface Conversion {
  from: CurrencyCode
  to: CurrencyCode
  amount: number
  rate: number
  result: number
  // Solo viene cuando participa ARS: qué dólar se usó para convertir.
  ars_rate: {
    type: ArsRateType
    label: string
    price_used: string
    compra: number
    venta: number
    published_at: string
  } | null
  date: string
  source: string
  warnings: string[]
}

export interface RateHistory {
  from: CurrencyCode
  to: CurrencyCode
  range: string
  start: string
  end: string
  source: string
  stale: boolean
  // Con ARS vienen tres series (oficial, MEP y blue); sin ARS, una sola.
  series: Array<{
    key: string
    label: string
    points: Array<{ date: string; value: number }>
  }>
}

export interface RatesTable {
  base: CurrencyCode
  date: string
  source: string
  fetched_at: string
  // Cuántas unidades de cada moneda equivalen a 1 `base`.
  rates: Partial<Record<CurrencyCode, number>>
  unavailable: CurrencyCode[]
}

/** Cotiza una conversión sin mover saldos. Con ARS, `arsRate` elige oficial, MEP o blue. */
export async function convert(
  from: CurrencyCode,
  to: CurrencyCode,
  amount: number,
  arsRate?: ArsRateType,
): Promise<Conversion> {
  const { data } = await api.get<{ data: Conversion }>('/api/rates/convert', {
    params: { from, to, amount, ars_rate: arsRate },
  })
  return data.data
}

export async function getRateHistory(from: CurrencyCode, to: CurrencyCode, range = '1m'): Promise<RateHistory> {
  const { data } = await api.get<{ data: RateHistory }>('/api/rates/history', { params: { from, to, range } })
  return data.data
}

export async function getRates(base: CurrencyCode): Promise<RatesTable> {
  const { data } = await api.get<{ data: RatesTable }>('/api/rates', { params: { base } })
  return data.data
}
