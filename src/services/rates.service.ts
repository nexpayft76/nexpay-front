import { api } from './api'
import type { ArsRateType, Conversion, RatesTable } from '../types/rates'

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
