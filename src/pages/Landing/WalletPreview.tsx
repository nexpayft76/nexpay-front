import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getRates, type RatesTable } from '../../services/conversion.service'
import { CURRENCIES, CURRENCY_NAMES, type CurrencyCode } from '../../types/currency'
import { formatAmount, formatDateTime } from './format'

// Saldos de ejemplo (no son de ningún usuario): se valorizan con las tasas reales del día.
const SAMPLE_BALANCES: Record<CurrencyCode, number> = {
  USD: 1250,
  EUR: 830,
  ARS: 452_300,
  COP: 2_180_000,
}

type Result = { key: string } & ({ status: 'ok'; table: RatesTable } | { status: 'error'; message: string })

/** Vista de ejemplo de la billetera: los 4 saldos y el total en la moneda que elija el usuario. */
function WalletPreview() {
  const [base, setBase] = useState<CurrencyCode>('USD')
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const key = `${base}:${attempt}`

  useEffect(() => {
    let cancelled = false
    getRates(base)
      .then((table) => !cancelled && setResult({ key, status: 'ok', table }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : 'No se pudieron obtener las tasas.'
        if (!cancelled) setResult({ key, status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [base, key])

  const current = result?.key === key ? result : null
  const table = current?.status === 'ok' ? current.table : null

  // Cuánto vale cada saldo en la moneda base (rates[c] = unidades de c por 1 base).
  const valueInBase = (c: CurrencyCode): number | null => {
    if (c === base) return SAMPLE_BALANCES[c]
    const rate = table?.rates[c]
    return rate ? SAMPLE_BALANCES[c] / rate : null
  }
  const values = CURRENCIES.map(valueInBase)
  const total = table && values.every((v) => v !== null) ? values.reduce<number>((a, v) => a + (v ?? 0), 0) : null

  return (
    <div className="wallet" aria-busy={!current}>
      <div className="wallet__head">
        <p className="mono-label">Ejemplo de billetera · total en</p>
        <div className="wallet__bases" role="group" aria-label="Moneda del total">
          {CURRENCIES.map((c) => (
            <button key={c} type="button" aria-pressed={c === base} onClick={() => setBase(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="wallet__total">
        {current?.status === 'error' ? '—' : total !== null ? formatAmount(total, base) : '…'}
      </p>

      {current?.status === 'error' && (
        <div className="wallet__error" role="alert">
          <span>{current.message}</span>
          <button type="button" className="btn-outline btn-outline--sm" onClick={() => setAttempt((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      )}

      <ul className="wallet__list">
        {CURRENCIES.map((c, i) => {
          const value = values[i]
          return (
            <li key={c}>
              <span className="wallet__code">{c}</span>
              <span className="wallet__name">{CURRENCY_NAMES[c]}</span>
              <span className="wallet__balance">{formatAmount(SAMPLE_BALANCES[c], c)}</span>
              <span className="wallet__equiv">
                {c !== base && value !== null ? `≈ ${formatAmount(value, base)}` : ''}
              </span>
            </li>
          )
        })}
      </ul>

      {table && (
        <p className="mono-note">
          Tasas del {formatDateTime(table.fetched_at)} · {table.source === 'live' ? 'en vivo' : 'guardadas hoy'}
        </p>
      )}
    </div>
  )
}

export default WalletPreview
