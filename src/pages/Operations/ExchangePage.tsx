import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import WalletCard from '../../components/wallet/WalletCard'
import { useExchangeQuote } from '../../hooks/useExchangeQuote'
import { useMyWallet } from '../../hooks/useMyWallet'
import { ApiError } from '../../services/api'
import { exchangeInMyWallet } from '../../services/wallet.service'
import type { ExchangeArsRate, ExchangeQuote, ExchangeResult, ExchangeType } from '../../types/wallet'
import { hasAtMostDecimals, parseAmount } from '../../utils/amount'
import { formatCurrency } from '../../utils/formatCurrency'
import CurrencyPicker from './CurrencyPicker'
import './Operations.css'

const TYPE_LABEL: Record<ExchangeType, string> = { BUY: 'Compra', SELL: 'Venta', EXCHANGE: 'Intercambio' }

const ARS_OPTIONS: { value: ExchangeArsRate; label: string }[] = [
  { value: 'mep', label: 'MEP' },
  { value: 'oficial', label: 'Oficial' },
]

function formatRate(rate: number): string {
  return new Intl.NumberFormat('es-AR', { maximumSignificantDigits: 6 }).format(rate)
}

/** Para escribir un saldo en el campo de monto con el formato local ("1.000.000,5"). */
function toInputText(value: number): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

/** Operaciones → Compra: comprar, vender o intercambiar monedas con el saldo de la billetera. */
function ExchangePage() {
  const [from, setFrom] = useState('COP')
  const [to, setTo] = useState('USD')
  const [arsRate, setArsRate] = useState<ExchangeArsRate>('mep')
  const [amountText, setAmountText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExchangeResult | null>(null)
  const wallet = useMyWallet('USD')
  // Billetera al costado: muestra la moneda con la que se paga. Cambiar la key la recarga después de operar.
  const [walletCurrency, setWalletCurrency] = useState('COP')
  const [walletVersion, setWalletVersion] = useState(0)

  const amount = parseAmount(amountText)
  const involvesArs = from === 'ARS' || to === 'ARS'
  const available =
    wallet.status === 'ok' ? Number(wallet.data.balances.find((b) => b.currency === from)?.amount ?? 0) : undefined
  const quote = useExchangeQuote({ from_currency: from, to_currency: to, amount, ars_rate: arsRate })

  function chooseFrom(code: string) {
    // Si elige como origen la moneda de destino, se invierten para no quedar iguales.
    if (code === to) setTo(from)
    setFrom(code)
    setWalletCurrency(code)
    setAmountText('')
    setError(null)
  }

  function swap() {
    setFrom(to)
    setTo(from)
    setWalletCurrency(to)
    setAmountText('')
    setError(null)
  }

  function validate(): string | null {
    if (wallet.status !== 'ok') return 'Espera a que tu billetera esté disponible para operar.'
    if (!Number.isFinite(amount) || amount <= 0) return 'Ingresa un monto mayor que 0.'
    if (!hasAtMostDecimals(amount, 2)) return 'El monto admite como máximo 2 decimales.'
    if (available !== undefined && amount > available) {
      return `Saldo insuficiente: tienes ${formatCurrency(available, from)}.`
    }
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      setResult(await exchangeInMyWallet({ from_currency: from, to_currency: to, amount, ars_rate: arsRate }))
      setAmountText('')
      wallet.reload()
      setWalletVersion((n) => n + 1)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo hacer la operación.')
    } finally {
      setSubmitting(false)
    }
  }

  const overBalance = available !== undefined && amount > available
  const canSubmit = wallet.status === 'ok' && !submitting && quote.status === 'ok' && !overBalance

  return (
    <section className="dashboard-content" aria-labelledby="exchange-title">
      <p className="dashboard-eyebrow">Operaciones</p>
      <h1 id="exchange-title">Comprar monedas</h1>
      <p>Compra, vende o intercambia monedas con el saldo de tu billetera, a la tasa del momento.</p>

      <div className="op-layout">
        {result ? (
          <ExchangeSuccess
            result={result}
            onAnother={() => {
              setResult(null)
              setAmountText('')
            }}
          />
        ) : (
          <form className="op-card" onSubmit={handleSubmit} noValidate>
            <div className="op-card__header">
              <h2>Nueva operación</h2>
              <span className="op-badge">Dinero ficticio · modo demo</span>
            </div>

            <fieldset className="op-field">
              <legend className="op-field__label">Pago con</legend>
              <CurrencyPicker value={from} onChange={chooseFrom} label="Moneda con la que pagas" />
            </fieldset>

            <label className="op-field">
              <span className="op-field__label">Monto a pagar</span>
              <input
                className="op-input"
                inputMode="decimal"
                placeholder="Ej. 100.000"
                value={amountText}
                onChange={(event) => setAmountText(event.target.value)}
                aria-invalid={error !== null || overBalance}
                aria-describedby="exchange-available"
              />
              <span id="exchange-available" className="op-hint op-hint--row">
                <span>
                  Disponible: <strong>{available === undefined ? '…' : formatCurrency(available, from)}</strong>
                </span>
                {available !== undefined && available > 0 && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAmountText(toInputText(available))}>
                    Usar todo
                  </button>
                )}
              </span>
            </label>

            <button type="button" className="op-swap" onClick={swap} aria-label="Invertir monedas" title="Invertir monedas">
              ⇅
            </button>

            <fieldset className="op-field">
              <legend className="op-field__label">Recibo</legend>
              <CurrencyPicker value={to} onChange={setTo} label="Moneda que recibes" disabledCode={from} />
            </fieldset>

            {involvesArs && (
              <fieldset className="op-field">
                <legend className="op-field__label">Dólar para el peso argentino</legend>
                <div className="op-segmented" role="radiogroup" aria-label="Tipo de dólar">
                  {ARS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={arsRate === option.value}
                      className={`op-segmented__option${arsRate === option.value ? ' op-segmented__option--active' : ''}`}
                      onClick={() => setArsRate(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <ExchangeSummary state={quote} />

            {overBalance && !error && (
              <p className="op-error" role="alert">
                Saldo insuficiente: tienes {formatCurrency(available ?? 0, from)}.
              </p>
            )}
            {error && (
              <p className="op-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn--primary btn--lg op-submit" disabled={!canSubmit}>
              {submitting
                ? 'Procesando…'
                : quote.status === 'ok'
                  ? `Confirmar ${TYPE_LABEL[quote.quote.type].toLowerCase()}: recibir ${formatCurrency(Number(quote.quote.to_amount), to)}`
                  : 'Confirmar'}
            </button>
            <p className="op-hint">La tasa se vuelve a calcular al confirmar; si cambió, vas a ver el valor final en el comprobante.</p>
          </form>
        )}

        <aside className="op-layout__wallet" aria-label="Tu billetera">
          <WalletCard key={walletVersion} valuedIn={walletCurrency} onValuedInChange={setWalletCurrency} />
        </aside>
      </div>
    </section>
  )
}

/** Detalle antes de confirmar: tipo de operación, tasa, comisión y lo que se recibe. */
function ExchangeSummary({ state }: { state: ReturnType<typeof useExchangeQuote> }) {
  if (state.status === 'idle') {
    return <p className="op-summary op-summary--empty">Ingresa un monto para ver cuánto recibes.</p>
  }
  if (state.status === 'loading') {
    return <p className="op-summary op-summary--empty" aria-busy="true">Calculando…</p>
  }
  if (state.status === 'error') {
    return (
      <p className="op-error" role="alert">
        {state.message}
      </p>
    )
  }
  return <SummaryRows quote={state.quote} />
}

function SummaryRows({ quote }: { quote: ExchangeQuote }) {
  const fee = Number(quote.fee_amount)
  return (
    <div className="op-summary" aria-live="polite">
      <dl>
        <div>
          <dt>Operación</dt>
          <dd>
            <span className="op-type">{TYPE_LABEL[quote.type]}</span>
          </dd>
        </div>
        <div>
          <dt>Tasa</dt>
          <dd>
            1 {quote.from_currency} = {formatRate(quote.rate)} {quote.to_currency}
            {quote.ars_rate && (
              <small>
                Dólar {quote.ars_rate.label} · precio de {quote.ars_rate.price_used}
              </small>
            )}
          </dd>
        </div>
        <div>
          <dt>Comisión</dt>
          <dd>{fee > 0 ? `${formatCurrency(fee, quote.from_currency)} (${quote.fee_percent}%)` : 'Sin comisión'}</dd>
        </div>
        <div className="op-summary__total">
          <dt>Recibes</dt>
          <dd>{formatCurrency(Number(quote.to_amount), quote.to_currency)}</dd>
        </div>
      </dl>
      {quote.warnings.length > 0 && (
        <ul className="op-summary__warnings">
          {quote.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ExchangeSuccess({ result, onAnother }: { result: ExchangeResult; onAnother: () => void }) {
  const fee = Number(result.fee_amount)
  return (
    <div className="op-card op-success" role="status">
      <span className="op-success__icon" aria-hidden="true">
        ✓
      </span>
      <h2>{TYPE_LABEL[result.type]} exitosa</h2>
      <p>
        Pagaste <strong>{formatCurrency(Number(result.from_amount), result.from_currency)}</strong> y recibiste{' '}
        <strong>{formatCurrency(Number(result.to_amount), result.to_currency)}</strong>.
      </p>
      <p className="op-hint">
        Tasa: 1 {result.from_currency} = {formatRate(result.rate)} {result.to_currency}
        {result.ars_rate && ` (dólar ${result.ars_rate.label})`}
        {fee > 0 && ` · comisión ${formatCurrency(fee, result.from_currency)}`}
      </p>
      <p>
        Tus saldos ahora: <strong>{formatCurrency(Number(result.balances.from), result.from_currency)}</strong> y{' '}
        <strong>{formatCurrency(Number(result.balances.to), result.to_currency)}</strong>.
      </p>
      <div className="op-success__actions">
        <Link to="/dashboard" className="btn btn--primary">
          Ver mi billetera
        </Link>
        <button type="button" className="btn btn--ghost" onClick={onAnother}>
          Hacer otra operación
        </button>
      </div>
    </div>
  )
}

export default ExchangePage
