import { api } from './api'

// Endpoints públicos del back para el corredor COP → ARS (no requieren sesión).

export type ArsRateType = 'oficial' | 'mep' | 'blue'

export interface CorridorConversion {
  from: string
  to: string
  amount: number
  rate: number
  result: number
  ars_rate: {
    type: ArsRateType
    label: string
    price_used: string
    compra: number
    venta: number
    published_at: string
  } | null
  date: string
  source: string
  warnings: string[]
}

export interface CorridorHistory {
  from: string
  to: string
  range: string
  start: string
  end: string
  source: string
  stale: boolean
  series: Array<{
    key: string
    label: string
    points: Array<{ date: string; value: number }>
  }>
}

export async function convertCopToArs(amount: number, arsRate: ArsRateType): Promise<CorridorConversion> {
  const { data } = await api.get<{ data: CorridorConversion }>('/api/rates/convert', {
    params: { from: 'COP', to: 'ARS', amount, ars_rate: arsRate },
  })
  return data.data
}

export async function getCopArsHistory(range = '1m'): Promise<CorridorHistory> {
  const { data } = await api.get<{ data: CorridorHistory }>('/api/rates/history', {
    params: { from: 'COP', to: 'ARS', range },
  })
  return data.data
}
