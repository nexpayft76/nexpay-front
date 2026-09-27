// Monedas que maneja NexPay.
export const CURRENCIES = ['USD', 'EUR', 'ARS', 'COP'] as const

export type CurrencyCode = (typeof CURRENCIES)[number]

export const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: 'Dólar estadounidense',
  EUR: 'Euro',
  ARS: 'Peso argentino',
  COP: 'Peso colombiano',
}
