import type { UserRole } from '../types/auth'
import type { PageResult } from '../types/history'
import type {
  FeeEntry,
  FeeSettings,
  FeesSummary,
  ManagedUser,
  SystemOffer,
  SystemOfferStatus,
  SystemTransaction,
  SystemTransactionFilter,
} from '../types/superuser'
import { api } from './api'

type PageParams = { page?: number; limit?: number }

/** Usuarios registrados; `email` busca por coincidencia parcial. */
export async function getUsers(params: PageParams & { email?: string } = {}): Promise<PageResult<ManagedUser>> {
  const { data } = await api.get<{ data: PageResult<ManagedUser> }>('/api/superuser/users', { params })
  return data.data
}

export async function setUserRole(id: string, role: UserRole): Promise<ManagedUser> {
  const { data } = await api.patch<{ data: ManagedUser }>(`/api/superuser/users/${encodeURIComponent(id)}/role`, { role })
  return data.data
}

export async function setUserStatus(id: string, status: 'active' | 'suspended'): Promise<ManagedUser> {
  const { data } = await api.patch<{ data: ManagedUser }>(`/api/superuser/users/${encodeURIComponent(id)}/status`, { status })
  return data.data
}

export async function getFeesSummary(): Promise<FeesSummary> {
  const { data } = await api.get<{ data: FeesSummary }>('/api/superuser/fees/summary')
  return data.data
}

export async function getFeeSettings(): Promise<FeeSettings> {
  const { data } = await api.get<{ data: FeeSettings }>('/api/superuser/settings/fees')
  return data.data
}

/** Cambia las comisiones: rigen desde la próxima operación. */
export async function updateFeeSettings(changes: Partial<Pick<FeeSettings, 'exchange_fee_percent' | 'p2p_fee_percent'>>): Promise<FeeSettings> {
  const { data } = await api.patch<{ data: FeeSettings }>('/api/superuser/settings/fees', changes)
  return data.data
}

export async function getFees(params: PageParams = {}): Promise<PageResult<FeeEntry>> {
  const { data } = await api.get<{ data: PageResult<FeeEntry> }>('/api/superuser/fees', { params })
  return data.data
}

export async function getSystemTransactions(
  params: PageParams & { type?: SystemTransactionFilter; email?: string } = {},
): Promise<PageResult<SystemTransaction>> {
  const { data } = await api.get<{ data: PageResult<SystemTransaction> }>('/api/superuser/transactions', { params })
  return data.data
}

export async function getSystemOffers(params: PageParams & { status?: SystemOfferStatus } = {}): Promise<PageResult<SystemOffer>> {
  const { data } = await api.get<{ data: PageResult<SystemOffer> }>('/api/superuser/p2p/offers', { params })
  return data.data
}
