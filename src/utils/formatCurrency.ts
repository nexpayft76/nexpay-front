// Formatea un monto con el símbolo y los decimales de su moneda (ej: 1250.5, 'USD' → "US$ 1.250,50").
export function formatCurrency(amount: number, currency: string, locale = 'es-AR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
