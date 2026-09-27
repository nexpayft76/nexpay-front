import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import WalletCard from '../../components/wallet/WalletCard'
import { useMyWallet } from '../../hooks/useMyWallet'
import { ApiError } from '../../services/api'
import { depositToMyWallet } from '../../services/wallet.service'
import type { DepositResult } from '../../types/wallet'
import { hasAtMostDecimals, parseAmount } from '../../utils/amount'
import { CURRENCIES, currencyInfo } from '../../utils/currencies'
import { formatCurrency } from '../../utils/formatCurrency'
import './Operations.css'

/** Mismas reglas que el back: mayor que 0, hasta 2 decimales y hasta el límite de la moneda. */
function validate(amount: number, currency: string): string | null {
  const info = currencyInfo(currency)
  if (!Number.isFinite(amount) || amount <= 0) return 'Ingresá un monto mayor que 0.'
  if (!hasAtMostDecimals(amount, 2)) return 'El monto admite como máximo 2 decimales.'
  if (info && amount > info.depositLimit) {
    return `El máximo por recarga es ${formatCurrency(info.depositLimit, currency)}.`
  }
  return null
}

/** Operaciones → Recarga: agregar dinero ficticio a la billetera (modo demo). */
function DepositPage() {
  const [currency, setCurrency] = useState('COP')
  const [amountText, setAmountText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DepositResult | null>(null)
  const wallet = useMyWallet('USD')
  // Billetera al lado del formulario: sigue a la moneda que se recarga (se puede cambiar desde su selector).
  const [walletCurrency, setWalletCurrency] = useState('COP')
  // Cambiar la key vuelve a montar la billetera para que pida los saldos nuevos después de recargar.
  const [walletVersion, setWalletVersion] = useState(0)

  const info = currencyInfo(currency)
  const amount = parseAmount(amountText)
  const currentBalance = wallet.status === 'ok' ? wallet.data.balances.find((b) => b.currency === currency)?.amount : undefined

  function chooseCurrency(code: string) {
    setCurrency(code)
    setWalletCurrency(code)
    setAmountText('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = validate(amount, currency)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      setResult(await depositToMyWallet(currency, amount))
      setAmountText('')
      wallet.reload()
      setWalletVersion((n) => n + 1)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo hacer la recarga.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="dashboard-content" aria-labelledby="deposit-title">
      <p className="dashboard-eyebrow">Operaciones</p>
      <h1 id="deposit-title">Recargar mi billetera</h1>
      <p>Agregá saldo para comprar, vender o intercambiar monedas.</p>

      <div className="op-layout">
        {result ? (
          <DepositSuccess result={result} onAnother={() => setResult(null)} />
        ) : (
          <form className="op-card" onSubmit={handleSubmit} noValidate>
            <div className="op-card__header">
              <h2>Nueva recarga</h2>
              <span className="op-badge">Dinero ficticio · modo demo</span>
            </div>

            <fieldset className="op-field">
              <legend className="op-field__label">Moneda</legend>
              <div className="currency-picker" role="radiogroup" aria-label="Moneda a recargar">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    role="radio"
                    aria-checked={currency === c.code}
                    className={`currency-picker__option${currency === c.code ? ' currency-picker__option--active' : ''}`}
                    style={{ '--currency-color': c.color } as CSSProperties}
                    onClick={() => chooseCurrency(c.code)}
                  >
                    <span className="currency-picker__dot" aria-hidden="true" />
                    <span className="currency-picker__code">{c.code}</span>
                  </button>
                ))}
              </div>
              {currentBalance !== undefined && (
                <p className="op-hint">
                  Saldo actual en {currency}: <strong>{formatCurrency(Number(currentBalance), currency)}</strong>
                </p>
              )}
            </fieldset>

            <label className="op-field">
              <span className="op-field__label">Monto</span>
              <input
                className="op-input"
                inputMode="decimal"
                placeholder={info ? `Ej. ${info.quickAmounts[1].toLocaleString('es-AR')}` : 'Monto'}
                value={amountText}
                onChange={(event) => setAmountText(event.target.value)}
                aria-invalid={error !== null}
                aria-describedby="deposit-limit"
              />
              <span id="deposit-limit" className="op-hint">
                Máximo por recarga: {info ? formatCurrency(info.depositLimit, currency) : '—'}
              </span>
            </label>

            {info && (
              <div className="op-quick" aria-label="Montos rápidos">
                {info.quickAmounts.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setAmountText(quick.toLocaleString('es-AR'))}
                  >
                    {formatCurrency(quick, currency)}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="op-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn--primary btn--lg op-submit" disabled={submitting}>
              {submitting
                ? 'Recargando…'
                : amount > 0
                  ? `Recargar ${formatCurrency(amount, currency)}`
                  : 'Recargar'}
            </button>
          </form>
        )}

        <aside className="op-layout__wallet" aria-label="Tu billetera">
          <WalletCard key={walletVersion} valuedIn={walletCurrency} onValuedInChange={setWalletCurrency} />
        </aside>
      </div>
    </section>
  )
}

function DepositSuccess({ result, onAnother }: { result: DepositResult; onAnother: () => void }) {
  return (
    <div className="op-card op-success" role="status">
      <span className="op-success__icon" aria-hidden="true">
        ✓
      </span>
      <h2>Recarga exitosa</h2>
      <p>
        Recargaste <strong>{formatCurrency(Number(result.amount), result.currency)}</strong>.
      </p>
      <p>
        Tu saldo en {result.currency} ahora es <strong>{formatCurrency(Number(result.new_balance), result.currency)}</strong>.
      </p>
      <div className="op-success__actions">
        <Link to="/dashboard" className="btn btn--primary">
          Ver mi billetera
        </Link>
        <button type="button" className="btn btn--ghost" onClick={onAnother}>
          Hacer otra recarga
        </button>
      </div>
    </div>
  )
}

export default DepositPage
