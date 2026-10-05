// Panel del superusuario: /api/superuser (ver /docs del back).
import type { UserRole } from './auth'

export interface ManagedUser {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_owner: boolean
  status: 'active' | 'suspended' | 'closed'
  created_at: string
}

export interface FeeTotal {
  currency: string
  /** Montos como texto exacto. */
  exchange: string
  p2p: string
  total: string
  count: number
}

export interface FeesSummary {
  totals: FeeTotal[]
  owner_balances: { currency: string; amount: string }[]
  /** false si todavía no se creó la cuenta propietaria. */
  owner_exists: boolean
}

/** Comisiones vigentes que decide el superusuario. */
export interface FeeSettings {
  /** Intercambio de balance: % del monto de origen (0.05 = 0,05%). */
  exchange_fee_percent: number
  /** P2P: % de lo que recibe cada parte. */
  p2p_fee_percent: number
  updated_at: string | null
  updated_by_email: string | null
}

export interface FeeEntry {
  id: string
  source: 'exchange' | 'p2p'
  currency_code: string
  amount: string
  transaction_id: string
  offer_id: string | null
  payer_email: string
  payer_name: string
  created_at: string
}

export type SystemTransactionType = 'DEPOSIT' | 'BUY' | 'SELL' | 'EXCHANGE' | 'P2P'

/** Filtro: recargas, intercambios de balance (agrupa compra, venta e intercambio) o P2P. */
export type SystemTransactionFilter = 'DEPOSIT' | 'EXCHANGE' | 'P2P'

export interface SystemTransaction {
  id: string
  type: SystemTransactionType
  from_currency: string | null
  to_currency: string
  from_amount: string
  to_amount: string
  exchange_rate: number
  fee_amount: string
  fee_currency: string | null
  created_at: string
  user_email: string
  user_name: string
}

export type SystemOfferStatus = 'open' | 'completed' | 'cancelled' | 'expired'

export interface SystemOffer {
  id: string
  status: SystemOfferStatus
  sell_currency: string
  buy_currency: string
  sell_amount: string
  buy_amount: string
  rate: number
  seller_fee: string
  buyer_fee: string
  seller_email: string
  seller_name: string
  buyer_email: string | null
  buyer_name: string | null
  created_at: string
  expires_at: string
  closed_at: string | null
}
