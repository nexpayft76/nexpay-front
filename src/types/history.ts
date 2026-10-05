// Historiales: GET /api/transactions/me y GET /api/p2p/trades/me (ver /docs del back).

/** Una página de resultados. */
export interface PageResult<T> {
  items: T[]
  page: number
  limit: number
  total: number
}

export type AccountTransactionType = 'DEPOSIT' | 'BUY' | 'SELL' | 'EXCHANGE'

/** Filtro del historial: recargas o intercambios de balance (EXCHANGE agrupa compra, venta e intercambio). */
export type HistoryFilter = 'DEPOSIT' | 'EXCHANGE'

/** Movimiento dentro de la propia cuenta: recarga, compra, venta o intercambio. Montos como texto exacto. */
export interface AccountTransaction {
  id: string
  type: AccountTransactionType
  /** null en las recargas. */
  from_currency: string | null
  to_currency: string
  from_amount: string
  to_amount: string
  exchange_rate: number
  fee_amount: string
  fee_currency: string | null
  fee_percent: number
  ars_rate_type: string | null
  created_at: string
}

/** Intercambio P2P aceptado, visto por una de las partes. */
export interface P2PTrade {
  offer_id: string
  /** "seller" si publicaste la oferta; "buyer" si la aceptaste. */
  role: 'seller' | 'buyer'
  /** La otra parte, solo con nombre e inicial. */
  counterpart_name: string
  paid_amount: string
  paid_currency: string
  received_amount: string
  received_currency: string
  fee_amount: string
  fee_currency: string
  fee_percent: number
  rate: number
  sell_currency: string
  buy_currency: string
  transaction_id: string | null
  completed_at: string
}
