import { api } from './api'
import type { CurrencyCode } from '../types/currency'
import type { RatesResponse, RatesSnapshot } from '../types/rates'

// Tasas del día desde el backend (Frankfurter + DolarAPI, con caché en PostgreSQL).
export async function getRates(base: CurrencyCode = 'USD'): Promise<RatesSnapshot> {
  const { data } = await api.get<RatesResponse>('/api/rates', { params: { base } })
  return data.data
}
