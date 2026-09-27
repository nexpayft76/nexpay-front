// Respuestas de /api/rates/* (ver /docs del back).
import type { RatesSource } from './wallet'

export type ArsRateType = 'oficial' | 'mep' | 'blue'

export interface ArsRateUsed {
  type: ArsRateType
  label: string
  /** "compra" si recibís ARS; "venta" si pagás con ARS. */
  price_used: 'compra' | 'venta'
  compra: number
  venta: number
  published_at: string
}

/** Estado de cada proveedor de tasas (Frankfurter o DolarApi). */
export interface RateProvider {
  provider: 'frankfurter' | 'dolarapi'
  label: string
  currencies: string[]
  source: RatesSource
  /** true = el proveedor falló y se usa su última tasa válida. */
  stale: boolean
  /** Cuándo la consultó NexPay. */
  fetched_at: string
  /** Cuándo la publicó el proveedor: fecha ("2026-09-26") en Frankfurter, fecha y hora en DolarApi. */
  published_at: string
}

export interface RatesTable {
  base: string
  date: string
  source: RatesSource
  fetched_at: string
  rates: Record<string, number>
  unavailable: string[]
  providers: RateProvider[]
  warnings: string[]
}

export interface Conversion {
  from: string
  to: string
  amount: number
  rate: number
  result: number
  ars_rate: ArsRateUsed | null
  date: string
  source: RatesSource
  warnings: string[]
}
