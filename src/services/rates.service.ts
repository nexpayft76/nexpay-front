import { api } from './api'
import type { ArsRateType, Conversion, HistoryRange, RateHistory, RatesTable } from '../types/rates'

/** Historial del par "1 {from} = X {to}" para el gráfico (si participa ARS: 3 series, oficial, MEP y blue). */
export async function getRateHistory(from: string, to: string, range: HistoryRange): Promise<RateHistory> {
  const { data } = await api.get<{ data: RateHistory }>('/api/rates/history', { params: { from, to, range } })
  return data.data
}

/** Tabla de tasas + estado de cada proveedor (de dónde salió cada tasa y cuándo). */
export async function getRates(base = 'USD'): Promise<RatesTable> {
  const { data } = await api.get<{ data: RatesTable }>('/api/rates', { params: { base } })
  return data.data
}

/** Cotiza una conversión (no mueve saldos). Con ARS, `arsRate` elige oficial, MEP o blue. */
export async function convert(from: string, to: string, amount: number, arsRate?: ArsRateType): Promise<Conversion> {
  const { data } = await api.get<{ data: Conversion }>('/api/rates/convert', {
    params: { from, to, amount, ars_rate: arsRate },
  })
  return data.data
}
