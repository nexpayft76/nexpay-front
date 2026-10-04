import type { P2PMarketOffer, P2POffer, P2PQuote, P2PQuoteParams } from '../types/p2p'
import { api } from './api'

/** Simula una oferta (no mueve saldos). Sin tasa, usa la del mercado. */
export async function quoteP2POffer(params: P2PQuoteParams): Promise<P2PQuote> {
  const { data } = await api.get<{ data: P2PQuote }>('/api/p2p/quote', { params })
  return data.data
}

/** Publica una oferta: el monto sale del saldo y queda retenido en garantía. */
export async function createP2POffer(params: Required<P2PQuoteParams>): Promise<{ offer: P2POffer; balance: string }> {
  const { data } = await api.post<{ data: { offer: P2POffer; balance: string } }>('/api/p2p/offers', params)
  return data.data
}

/** Mercado: ofertas abiertas de otros usuarios, opcionalmente de un par. */
export async function getP2PMarket(filters: { sell_currency?: string; buy_currency?: string } = {}): Promise<P2PMarketOffer[]> {
  const { data } = await api.get<{ data: P2PMarketOffer[] }>('/api/p2p/offers', { params: filters })
  return data.data
}

/** Ofertas propias (abiertas y cerradas). */
export async function getMyP2POffers(): Promise<P2POffer[]> {
  const { data } = await api.get<{ data: P2POffer[] }>('/api/p2p/offers/me')
  return data.data
}

/** Acepta una oferta: el intercambio se hace al instante. */
export async function acceptP2POffer(id: string): Promise<{ offer: P2POffer; balances: { paid: string; received: string } }> {
  const { data } = await api.post<{ data: { offer: P2POffer; balances: { paid: string; received: string } } }>(
    `/api/p2p/offers/${encodeURIComponent(id)}/accept`,
  )
  return data.data
}

/** Cancela una oferta propia y devuelve lo retenido. */
export async function cancelP2POffer(id: string): Promise<{ offer: P2POffer; balance: string }> {
  const { data } = await api.post<{ data: { offer: P2POffer; balance: string } }>(
    `/api/p2p/offers/${encodeURIComponent(id)}/cancel`,
  )
  return data.data
}
