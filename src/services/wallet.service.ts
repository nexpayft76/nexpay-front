import { api } from './api'
import type { MyWallet } from '../types/wallet'

/** La wallet del usuario logueado (el back lo identifica por el token). */
export async function getMyWallet(valuedIn: string): Promise<MyWallet> {
  const { data } = await api.get<{ data: MyWallet }>('/api/wallets/me', { params: { valued_in: valuedIn } })
  return data.data
}
