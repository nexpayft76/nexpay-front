import type { AccountTransaction, HistoryFilter, P2PTrade, PageResult } from '../types/history'
import { api } from './api'

/** Historial de mi cuenta: recargas e intercambios de balance (del más nuevo al más viejo). */
export async function getMyTransactions(params: { type?: HistoryFilter; page?: number; limit?: number } = {}): Promise<PageResult<AccountTransaction>> {
  const { data } = await api.get<{ data: PageResult<AccountTransaction> }>('/api/transactions/me', { params })
  return data.data
}

/** Mis intercambios P2P aceptados (como vendedor o comprador). */
export async function getMyP2PTrades(params: { page?: number; limit?: number } = {}): Promise<PageResult<P2PTrade>> {
  const { data } = await api.get<{ data: PageResult<P2PTrade> }>('/api/p2p/trades/me', { params })
  return data.data
}
