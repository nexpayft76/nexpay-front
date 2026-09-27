import type { CurrencyCode } from './currency'

// 'live': recién consultada a la API externa. 'cache': guardada hoy en PostgreSQL.
export type RateSource = 'live' | 'cache' | (string & {})

export interface RateProvider {
  provider: string
  label: string
  currencies: CurrencyCode[]
  source: RateSource
  // true cuando la API externa falló y se muestra la última tasa guardada.
  stale: boolean
  fetched_at: string
  published_at: string
}

export interface RatesSnapshot {
  base: CurrencyCode
  date: string
  source: RateSource
  fetched_at: string
  rates: Partial<Record<CurrencyCode, number>>
  // Monedas sin tasa disponible (ninguna API respondió y no hay caché).
  unavailable: CurrencyCode[]
  providers: RateProvider[]
  warnings: Array<string | { message: string }>
}

export interface RatesResponse {
  data: RatesSnapshot
}
