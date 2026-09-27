// Respuesta de GET /api/wallets/me (ver /docs del back).

export type RatesSource = 'live' | 'cache' | 'fallback'

export interface WalletBalance {
  currency: string
  name: string
  decimals: number
  /** Saldo exacto como texto (NUMERIC). */
  amount: string
  /** Equivalente en la moneda de valorización; null si su tasa no está disponible. */
  value_in_target: number | null
  updated_at: string
}

export interface WalletValuation {
  currency: string
  total: number
  rates_date: string
  rates_source: RatesSource
  missing_currencies: string[]
  warnings: string[]
}

export interface MyWallet {
  wallet_id: string
  created_at: string
  balances: WalletBalance[]
  valuation: WalletValuation | null
}
