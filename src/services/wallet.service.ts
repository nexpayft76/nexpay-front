import { api } from './api'
import type { DepositResult, ExchangeArsRate, ExchangeQuote, ExchangeResult, MyWallet } from '../types/wallet'

/** Recarga de dinero ficticio en la wallet del usuario logueado (modo demo). */
export async function depositToMyWallet(currency: string, amount: number): Promise<DepositResult> {
  const { data } = await api.post<{ data: DepositResult }>('/api/wallets/me/deposits', { currency, amount })
  return data.data
}

/** La wallet del usuario logueado (el back lo identifica por el token). */
export async function getMyWallet(valuedIn: string): Promise<MyWallet> {
  const { data } = await api.get<{ data: MyWallet }>('/api/wallets/me', { params: { valued_in: valuedIn } })
  return data.data
}

export interface ExchangeParams {
  from_currency: string
  to_currency: string
  /** Total a debitar del origen, comisión incluida. */
  amount: number
  ars_rate: ExchangeArsRate
}

/** Cotización exacta (tasa del servidor + comisión) antes de confirmar. No mueve saldos. */
export async function quoteExchange(params: ExchangeParams): Promise<ExchangeQuote> {
  const { data } = await api.get<{ data: ExchangeQuote }>('/api/transactions/me/exchange/quote', { params })
  return data.data
}

/** Compra, venta o intercambio en la wallet del usuario logueado. La tasa la pone el back al ejecutar. */
export async function exchangeInMyWallet(params: ExchangeParams): Promise<ExchangeResult> {
  const { data } = await api.post<{ data: ExchangeResult }>('/api/transactions/me/exchange', params)
  return data.data
}
