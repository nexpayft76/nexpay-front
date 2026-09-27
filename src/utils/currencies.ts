/** Monedas de NexPay en el orden del corredor: primero COP ↔ ARS, después USD y EUR. */
export const CURRENCIES = [
  { code: 'COP', country: 'Colombia', color: '#d4a017' },
  { code: 'ARS', country: 'Argentina', color: '#4a9ad9' },
  { code: 'USD', country: 'Estados Unidos', color: '#2e8b57' },
  { code: 'EUR', country: 'Zona euro', color: '#3b4fd8' },
] as const

export const CURRENCY_CODES: string[] = CURRENCIES.map((c) => c.code)
