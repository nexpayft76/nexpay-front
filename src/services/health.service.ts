import { api } from './api'

export interface HealthStatus {
  status: string
  database: string
  currencies: number
  timestamp: string
}

export async function getHealth(): Promise<HealthStatus> {
  const { data } = await api.get<HealthStatus>('/health')
  return data
}
