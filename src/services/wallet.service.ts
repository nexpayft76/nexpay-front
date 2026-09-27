import { api } from './api'
import type { DepositResult, MyWallet } from '../types/wallet'

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
