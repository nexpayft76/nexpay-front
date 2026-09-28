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

export type HistoryRange = '1w' | '1m' | '3m' | '6m' | '1y'

export interface HistoryPoint {
  date: string
  value: number
}

export interface HistorySeries {
  /** "COP-USD" para un par simple, o el tipo de dólar si participa ARS ("oficial", "mep", "blue"). */
  key: string
  label: string
  points: HistoryPoint[]
  stats: { first: number; last: number; change_pct: number; min: number; max: number } | null
}

/** Respuesta de GET /api/rates/history?from=&to=&range=: la serie es "1 {from} = X {to}". */
export interface RateHistory {
  from: string
  to: string
  range: HistoryRange
  /** Primer y último día del rango (el último es la última tasa válida). */
  start: string
  end: string
  providers: Array<'frankfurter' | 'argentinadatos'>
  source: RatesSource
  stale: boolean
  fetched_at: string
  series: HistorySeries[]
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
