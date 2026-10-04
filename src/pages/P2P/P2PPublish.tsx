import { useState, type FormEvent } from 'react'
import AmountInput from '../../components/common/AmountInput'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useMyWallet } from '../../hooks/useMyWallet'
import { useP2PQuote, type P2PQuoteState } from '../../hooks/useP2PQuote'
import { ApiError } from '../../services/api'
import { createP2POffer } from '../../services/p2p.service'
import type { P2PQuote } from '../../types/p2p'
import { parseAmount, validateAmountText, visibleAmountError } from '../../utils/amount'
import { formatCurrency } from '../../utils/formatCurrency'
import CurrencyPicker from '../Operations/CurrencyPicker'
import { deviationText, formatRate, rateToInput, percentText } from './p2pFormat'

/** Para escribir un saldo en el campo de monto con el formato local ("1.000.000,5"). */
function toInputText(value: number): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

/** Publicar una oferta: qué vendo, cuánto, qué quiero recibir y a qué tasa. */
function P2PPublish({ onPublished }: { onPublished: () => void }) {
  const [sell, setSell] = useState('USD')
  const [buy, setBuy] = useState('COP')
  const [amountText, setAmountText] = useState('')
  const [rateText, setRateText] = useState('')
  const [touched, setTouched] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wallet = useMyWallet('USD')

  const amount = parseAmount(amountText)
  const rate = rateText.trim() ? parseAmount(rateText) : undefined
  const rateInvalid = rate !== undefined && !(rate > 0)
  const available =
    wallet.status === 'ok' ? Number(wallet.data.balances.find((b) => b.currency === sell)?.amount ?? 0) : undefined
  const liveError = validateAmountText(amountText, {
    available:
      available === undefined
        ? undefined
        : { value: available, message: `Saldo insuficiente: tienes ${formatCurrency(available, sell)}.` },
  })
  const settled = useDebouncedValue(amountText, 400) === amountText
  const amountError =
    visibleAmountError(liveError, settled || touched) ?? (touched && !amountText.trim() ? 'Ingresa un monto.' : undefined)

  // Sin tasa escrita se simula con la del mercado: así se ve la tasa actual desde el primer momento.
  const quote = useP2PQuote({
    sell_currency: sell,
    buy_currency: buy,
    sell_amount: liveError === undefined ? amount : Number.NaN,
    rate: rateInvalid ? Number.NaN : rate,
  })

  function reset() {
    setAmountText('')
    setRateText('')
    setTouched(false)
    setError(null)
  }

  function chooseSell(code: string) {
    if (code === buy) setBuy(sell)
    setSell(code)
    reset()
  }

  function chooseBuy(code: string) {
    setBuy(code)
    setRateText('')
    setError(null)
  }

  const canSubmit = wallet.status === 'ok' && !submitting && quote.status === 'ok' && liveError === undefined && !rateInvalid

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    setError(null)
    setConfirming(true)
  }

  async function publish() {
    if (quote.status !== 'ok') return
    setSubmitting(true)
    try {
      await createP2POffer({ sell_currency: sell, buy_currency: buy, sell_amount: amount, rate: quote.quote.rate })
      reset()
      wallet.reload()
      onPublished()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo publicar la oferta.')
    } finally {
      setSubmitting(false)
      setConfirming(false)
    }
  }

  return (
    <>
      <form className="op-card" onSubmit={handleSubmit} noValidate>
        <div className="op-card__header">
          <h2>Publicar oferta</h2>
          <span className="op-badge">Dinero ficticio · modo demo</span>
        </div>

        <fieldset className="op-field">
          <legend className="op-field__label">Vendo</legend>
          <CurrencyPicker value={sell} onChange={chooseSell} label="Moneda que vendes" />
        </fieldset>

        <div className="op-field">
          <label className="op-field__label" htmlFor="p2p-amount">
            Monto a vender
          </label>
          <AmountInput
            id="p2p-amount"
            className="op-input"
            placeholder="Ej. 100"
            value={amountText}
            onValueChange={(text) => {
              setAmountText(text)
              setError(null)
            }}
            onBlur={() => setTouched(true)}
            aria-invalid={amountError !== undefined}
            aria-describedby="p2p-amount-hint p2p-available"
          />
          <span id="p2p-amount-hint" className="op-field-error" aria-live="polite">
            {amountError}
          </span>
          <span id="p2p-available" className="op-hint op-hint--row">
            <span>
              Disponible: <strong>{available === undefined ? '…' : formatCurrency(available, sell)}</strong>
            </span>
            {available !== undefined && available > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAmountText(toInputText(available))}>
                Usar todo
              </button>
            )}
          </span>
        </div>

        <fieldset className="op-field">
          <legend className="op-field__label">Quiero recibir</legend>
          <CurrencyPicker value={buy} onChange={chooseBuy} label="Moneda que quieres recibir" disabledCode={sell} />
        </fieldset>

        <div className="op-field">
          <label className="op-field__label" htmlFor="p2p-rate">
            Tu tasa: {buy} por 1 {sell}
          </label>
          <input
            id="p2p-rate"
            className="op-input"
            inputMode="decimal"
            autoComplete="off"
            placeholder={quote.status === 'ok' ? rateToInput(quote.quote.market_rate) : 'Ej. 4100'}
            value={rateText}
            onChange={(event) => {
              setRateText(event.target.value.replace(/[^\d.,]/g, ''))
              setError(null)
            }}
            aria-invalid={rateInvalid}
            aria-describedby="p2p-rate-hint"
          />
          <span id="p2p-rate-hint" className="op-hint op-hint--row">
            {rateInvalid ? (
              <span className="op-field-error">Escribe la tasa con coma para los decimales, ej. 4100,5.</span>
            ) : quote.status === 'ok' ? (
              <span>
                Tasa actual: <strong>{formatRate(quote.quote.market_rate)}</strong> · permitida entre{' '}
                {formatRate(quote.quote.min_rate)} y {formatRate(quote.quote.max_rate)}
              </span>
            ) : (
              <span>Vacío = la tasa actual del mercado. Puedes pedir hasta ±10%.</span>
            )}
            {quote.status === 'ok' && rateText && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRateText('')}>
                Usar tasa actual
              </button>
            )}
          </span>
        </div>

        <PublishSummary state={quote} />

        {error && (
          <p className="op-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--lg op-submit" disabled={!canSubmit}>
          {submitting ? 'Publicando…' : 'Publicar oferta'}
        </button>
        <p className="op-hint">
          Al publicar, el monto <strong>queda retenido en garantía</strong> (sale de tu saldo disponible) hasta que alguien
          acepte, la canceles o venza. Si alguien acepta, el cambio es instantáneo para los dos.
        </p>
      </form>

      {quote.status === 'ok' && (
        <ConfirmDialog
          open={confirming}
          title="¿Publicas la oferta?"
          confirmLabel="Sí, publicar"
          busy={submitting}
          onConfirm={publish}
          onCancel={() => setConfirming(false)}
        >
          <p>
            Vendes <strong>{formatCurrency(Number(quote.quote.sell_amount), sell)}</strong> a{' '}
            <strong>
              {formatRate(quote.quote.rate)} {buy}
            </strong>{' '}
            por {sell} ({deviationText(quote.quote.deviation_percent)}).
          </p>
          <p>
            Si alguien acepta recibes <strong>{formatCurrency(Number(quote.quote.seller_receives), buy)}</strong> (comisión{' '}
            {formatCurrency(Number(quote.quote.seller_fee), buy)}, {percentText(quote.quote.fee_percent)}).
          </p>
          <p className="confirm-dialog__note">
            Los {formatCurrency(Number(quote.quote.sell_amount), sell)} quedan retenidos desde ahora. Puedes cancelar la oferta
            mientras nadie la acepte y se te devuelven.
          </p>
        </ConfirmDialog>
      )}
    </>
  )
}

function PublishSummary({ state }: { state: P2PQuoteState }) {
  if (state.status === 'idle') {
    return <p className="op-summary op-summary--empty">Ingresa un monto para ver la tasa actual y cuánto recibirías.</p>
  }
  if (state.status === 'loading') {
    return (
      <p className="op-summary op-summary--empty" aria-busy="true">
        Calculando…
      </p>
    )
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

function SummaryRows({ quote }: { quote: P2PQuote }) {
  const { sell_currency: sell, buy_currency: buy } = quote
  return (
    <div className="op-summary" aria-live="polite">
      <dl>
        <div>
          <dt>Tasa actual</dt>
          <dd>
            1 {sell} = {formatRate(quote.market_rate)} {buy}
            <small>Referencia: {quote.market_reference}</small>
          </dd>
        </div>
        <div>
          <dt>Tu tasa</dt>
          <dd>
            1 {sell} = {formatRate(quote.rate)} {buy}
            <small>{deviationText(quote.deviation_percent)}</small>
          </dd>
        </div>
        <div>
          <dt>El comprador paga</dt>
          <dd>{formatCurrency(Number(quote.buy_amount), buy)}</dd>
        </div>
        <div>
          <dt>Comisión NexPay</dt>
          <dd>
            {formatCurrency(Number(quote.seller_fee), buy)} ({percentText(quote.fee_percent)} de lo que recibes)
          </dd>
        </div>
        <div className="op-summary__total">
          <dt>Recibes si aceptan</dt>
          <dd>{formatCurrency(Number(quote.seller_receives), buy)}</dd>
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

export default P2PPublish
