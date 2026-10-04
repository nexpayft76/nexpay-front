// Respuestas de /api/p2p (ver /docs del back). Montos como texto exacto (NUMERIC).

export type P2POfferStatus = 'open' | 'completed' | 'cancelled' | 'expired'

/** Simulación de una oferta: tasa del mercado, rango permitido, comisión y lo que recibe cada parte. */
export interface P2PQuote {
  sell_currency: string
  buy_currency: string
  sell_amount: string
  /** Tasa de la oferta: unidades de buy_currency por 1 de sell_currency. */
  rate: number
  market_rate: number
  /** Cuánto se aleja la tasa del mercado, en %. */
  deviation_percent: number
  min_rate: number
  max_rate: number
  fee_percent: number
  /** Lo que paga quien acepta. */
  buy_amount: string
  seller_fee: string
  seller_receives: string
  buyer_fee: string
  buyer_receives: string
  /** "dólar MEP (bolsa)" o "tasa oficial del día". */
  market_reference: string
  rates_date: string
  warnings: string[]
}

export interface P2POffer {
  id: string
  status: P2POfferStatus
  sell_currency: string
  buy_currency: string
  sell_amount: string
  rate: number
  market_rate: number
  buy_amount: string
  fee_percent: number
  seller_fee: string
  seller_receives: string
  buyer_fee: string
  buyer_receives: string
  created_at: string
  expires_at: string
  closed_at: string | null
}

/** En el mercado: con el nombre del vendedor (nombre e inicial del apellido). */
export interface P2PMarketOffer extends P2POffer {
  seller_name: string
  /** Reputación: intercambios P2P completados por el vendedor. */
  completed_trades: number
}

export interface P2PQuoteParams {
  sell_currency: string
  buy_currency: string
  sell_amount: number
  /** Sin tasa, el back simula con la del mercado. */
  rate?: number
}
