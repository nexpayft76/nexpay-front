import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AmountInput from '../../components/common/AmountInput'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import WalletCard from '../../components/wallet/WalletCard'
import { useExchangeQuote } from '../../hooks/useExchangeQuote'
import { useMyWallet } from '../../hooks/useMyWallet'
import { ApiError } from '../../services/api'
import { exchangeInMyWallet } from '../../services/wallet.service'
import type { ExchangeArsRate, ExchangeQuote, ExchangeResult, ExchangeType } from '../../types/wallet'
import { parseAmount, validateAmountText, visibleAmountError } from '../../utils/amount'
import { formatCurrency } from '../../utils/formatCurrency'
import CurrencyPicker from './CurrencyPicker'
import './Operations.css'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useOptionalAlerts } from '../../contexts/AlertsContext'

// Compra, venta e intercambio son la misma operación para el usuario: un intercambio de balance.
const TYPE_LABEL: Record<ExchangeType, string> = { BUY: 'Intercambio', SELL: 'Intercambio', EXCHANGE: 'Intercambio' }

const ARS_OPTIONS: { value: ExchangeArsRate; label: string }[] = [
  { value: 'mep', label: 'MEP' },
  { value: 'oficial', label: 'Oficial' },
]

function formatRate(rate: number): string {
  return new Intl.NumberFormat('es-AR', { maximumSignificantDigits: 6 }).format(rate)
}

/** "14:32" (hora local). */
function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

/** De dónde sale la tasa: ARS con el dólar en vivo de DolarApi; el resto, tasa oficial del día (Frankfurter). */
function rateSource(quote: Pick<ExchangeQuote, 'ars_rate' | 'rates_date'>): string {
  if (quote.ars_rate) {
    const time = formatTime(quote.ars_rate.published_at)
    return `Dólar ${quote.ars_rate.label} en vivo${time ? ` (actualizado ${time})` : ''} · precio de ${quote.ars_rate.price_used}`
  }
  return `Tasa oficial del día (${quote.rates_date})`
}

/** Para escribir un saldo en el campo de monto con el formato local ("1.000.000,5"). */
function toInputText(value: number): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

/** Operaciones → Intercambio de balance: cambiar una moneda por otra con el saldo de la billetera. */
function ExchangePage() {
  useDocumentTitle('Intercambio de balance')
  const [from, setFrom] = useState('COP')
  const [to, setTo] = useState('USD')
  const [arsRate, setArsRate] = useState<ExchangeArsRate>('mep')
  const [amountText, setAmountText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  /** Error que devolvió el back al operar (los del monto se calculan en tiempo real, abajo). */
  const [error, setError] = useState<string | null>(null)
  /** Se intentó enviar o se salió del campo: ahí también se avisa si quedó vacío. */
  const [touched, setTouched] = useState(false)
  /** Ventana "¿Confirmas la operación?" abierta. */
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<ExchangeResult | null>(null)
  const wallet = useMyWallet('USD')
  // Billetera al costado: muestra la moneda con la que se paga. Cambiar la key la recarga después de operar.
  const [walletCurrency, setWalletCurrency] = useState('COP')
  const [walletVersion, setWalletVersion] = useState(0)
  const { recordExchange } = useOptionalAlerts()

  const amount = parseAmount(amountText)
  const involvesArs = from === 'ARS' || to === 'ARS'
  const available =
    wallet.status === 'ok' ? Number(wallet.data.balances.find((b) => b.currency === from)?.amount ?? 0) : undefined
  // En tiempo real, igual que en el registro: formato, mayor que 0, decimales y saldo disponible.
  // El aviso aparece al hacer una pausa al escribir, o enseguida si ya salió del campo o intentó confirmar.
  const amountRules = {
    available:
      available === undefined
        ? undefined
        : { value: available, message: `Saldo insuficiente: tienes ${formatCurrency(available, from)}.` },
  }
  const liveError = validateAmountText(amountText, amountRules)
  // Solo se cotiza un monto válido: así el back no responde 400 (y no aparece un error en la consola).
  const quote = useExchangeQuote({
    from_currency: from,
    to_currency: to,
    amount: liveError === undefined ? amount : Number.NaN,
    ars_rate: arsRate,
  })
  // Decimales de más y saldo insuficiente se avisan al instante; "mayor que 0" y el formato, tras una pausa.
  const settled = useDebouncedValue(amountText, 400) === amountText
  const amountError =
    visibleAmountError(liveError, settled || touched) ?? (touched && !amountText.trim() ? 'Ingresa un monto.' : undefined)

  function chooseFrom(code: string) {
    // Si elige como origen la moneda de destino, se invierten para no quedar iguales.
    if (code === to) setTo(from)
    setFrom(code)
    setWalletCurrency(code)
    setAmountText('')
    setError(null)
    setTouched(false)
  }

  function swap() {
    setFrom(to)
    setTo(from)
    setWalletCurrency(to)
    setAmountText('')
    setError(null)
    setTouched(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (wallet.status !== 'ok') {
      setError('Espera a que tu billetera esté disponible para operar.')
      return
    }
    if (!canSubmit) return
    setError(null)
    // Primero se pide confirmación: es dinero lo que se mueve.
    setConfirming(true)
  }

  async function confirmExchange() {
    setSubmitting(true)
    try {
      const exchange = await exchangeInMyWallet({ from_currency: from, to_currency: to, amount, ars_rate: arsRate })
      setResult(exchange)
      recordExchange({
        transactionId: exchange.transaction_id,
        fromCurrency: from,
        fromBalance: exchange.balances.from,
        toCurrency: to,
        toBalance: exchange.balances.to,
        createdAt: exchange.created_at,
      })
      setAmountText('')
      setTouched(false)
      wallet.reload()
      setWalletVersion((n) => n + 1)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo hacer la operación.')
    } finally {
      setSubmitting(false)
      setConfirming(false)
    }
  }

  const canSubmit =
    wallet.status === 'ok' && !submitting && quote.status === 'ok' && amountText.trim() !== '' && liveError === undefined

  return (
    <section className="dashboard-content" aria-labelledby="exchange-title">
      <p className="dashboard-eyebrow">Operaciones</p>
      <h1 id="exchange-title">Intercambio de balance</h1>
      <p>Cambia una moneda por otra con el saldo de tu billetera, a la tasa del momento.</p>

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

            <div className="op-field">
              <label className="op-field__label" htmlFor="exchange-amount">
                Monto a pagar
              </label>
              <AmountInput
                id="exchange-amount"
                className="op-input"
                placeholder="Ej. 100.000"
                value={amountText}
                onValueChange={(text) => {
                  setAmountText(text)
                  setError(null)
                }}
                onBlur={() => setTouched(true)}
                aria-invalid={amountError !== undefined}
                aria-describedby="exchange-amount-hint exchange-available"
              />
              <span id="exchange-amount-hint" className="op-field-error" aria-live="polite">
                {amountError}
              </span>
              <span id="exchange-available" className="op-hint op-hint--row">
                <span>
                  Disponible: <strong>{available === undefined ? '…' : formatCurrency(available, from)}</strong>
                </span>
                {available !== undefined && available > 0 && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setAmountText(toInputText(available))
                      setError(null)
                    }}
                  >
                    Usar todo
                  </button>
                )}
              </span>
            </div>

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
            <p className="op-hint">
              Operas con la <strong>tasa actual</strong>: USD, EUR y COP con la tasa oficial del día (Frankfurter) y el
              peso argentino con el dólar en vivo (DolarApi, se actualiza cada 5 minutos).
            </p>
          </form>
        )}

        <aside className="op-layout__wallet" aria-label="Tu billetera">
          <WalletCard key={walletVersion} valuedIn={walletCurrency} onValuedInChange={setWalletCurrency} />
        </aside>
      </div>

      {quote.status === 'ok' && (
        <ConfirmDialog
          open={confirming}
          title={`¿Confirmas el ${TYPE_LABEL[quote.quote.type].toLowerCase()}?`}
          confirmLabel="Sí, confirmar"
          busy={submitting}
          onConfirm={confirmExchange}
          onCancel={() => setConfirming(false)}
        >
          <p>
            Vas a pagar <strong>{formatCurrency(Number(quote.quote.from_amount), quote.quote.from_currency)}</strong>
            {' '}y recibir <strong>{formatCurrency(Number(quote.quote.to_amount), quote.quote.to_currency)}</strong>.
          </p>
          <p>
            Tasa actual: 1 {quote.quote.from_currency} = {formatRate(quote.quote.rate)} {quote.quote.to_currency}
            {Number(quote.quote.fee_amount) > 0 &&
              ` · comisión ${formatCurrency(Number(quote.quote.fee_amount), quote.quote.from_currency)}`}
          </p>
          <p className="confirm-dialog__note">{rateSource(quote.quote)}. El dinero se mueve al confirmar.</p>
        </ConfirmDialog>
      )}
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
          <dt>Tasa actual</dt>
          <dd>
            1 {quote.from_currency} = {formatRate(quote.rate)} {quote.to_currency}
            <small>{rateSource(quote)}</small>
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
      <h2>{TYPE_LABEL[result.type]} exitoso</h2>
      <p>
        Pagaste <strong>{formatCurrency(Number(result.from_amount), result.from_currency)}</strong> y recibiste{' '}
        <strong>{formatCurrency(Number(result.to_amount), result.to_currency)}</strong>.
      </p>
      <p className="op-hint">
        Tasa aplicada (la actual a las {formatTime(result.created_at)}): 1 {result.from_currency} ={' '}
        {formatRate(result.rate)} {result.to_currency} · {rateSource(result)}
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
