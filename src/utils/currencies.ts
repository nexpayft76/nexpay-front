/** Monedas de NexPay en el orden del corredor: primero COP ↔ ARS, después USD y EUR. */
export const CURRENCIES = [
  { code: 'COP', name: 'Peso colombiano', country: 'Colombia', color: '#d4a017', depositLimit: 50_000_000, quickAmounts: [100_000, 500_000, 1_000_000] },
  { code: 'ARS', name: 'Peso argentino', country: 'Argentina', color: '#4a9ad9', depositLimit: 20_000_000, quickAmounts: [50_000, 200_000, 500_000] },
  { code: 'USD', name: 'Dólar', country: 'Estados Unidos', color: '#2e8b57', depositLimit: 10_000, quickAmounts: [50, 200, 500] },
  { code: 'EUR', name: 'Euro', country: 'Zona euro', color: '#3b4fd8', depositLimit: 10_000, quickAmounts: [50, 200, 500] },
] as const

export type CurrencyInfo = (typeof CURRENCIES)[number]

export const CURRENCY_CODES: string[] = CURRENCIES.map((c) => c.code)

export function currencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCIES.find((c) => c.code === code)
}
