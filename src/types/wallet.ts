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

/** Respuesta de POST /api/wallets/me/deposits. */
export interface DepositResult {
  transaction_id: string
  type: 'DEPOSIT'
  currency: string
  /** Monto recargado (texto exacto). */
  amount: string
  /** Saldo de esa moneda después de la recarga (texto exacto). */
  new_balance: string
  created_at: string
}

export interface MyWallet {
  wallet_id: string
  created_at: string
  balances: WalletBalance[]
  valuation: WalletValuation | null
}

// Compra, venta e intercambio (GET /api/transactions/me/exchange/quote y POST /api/transactions/me/exchange).

export type ExchangeType = 'BUY' | 'SELL' | 'EXCHANGE'

/** Tipo de dólar para operar con ARS: solo mercados legales (el blue es solo referencia). */
export type ExchangeArsRate = 'oficial' | 'mep'

export interface ExchangeQuote {
  type: ExchangeType
  from_currency: string
  to_currency: string
  /** Total que se debita (texto exacto), comisión incluida. */
  from_amount: string
  fee_percent: number
  /** Comisión en la moneda de origen (texto exacto). */
  fee_amount: string
  converted_amount: string
  /** Unidades de destino por 1 de origen: la misma tasa del cotizador. */
  rate: number
  /** Lo que se acredita (texto exacto). */
  to_amount: string
  ars_rate: {
    type: ExchangeArsRate
    label: string
    price_used: 'compra' | 'venta'
    compra: number
    venta: number
    published_at: string
  } | null
  rates_date: string
  rates_source: RatesSource
  warnings: string[]
}

export interface ExchangeResult extends ExchangeQuote {
  transaction_id: string
  created_at: string
  /** Saldos después de la operación (texto exacto). */
  balances: { from: string; to: string }
}
