import { useState } from 'react'
import { CURRENCIES, type CurrencyCode } from '../../types/currency'
import { formatAmount, formatDateTime, formatRate } from './format'
import { ARS_TYPES, MAIN_ARS_TYPE, useConversionQuote, type ConversionQuote } from './useConversionQuote'

// Rango del slider y monto inicial según la moneda de origen.
const AMOUNT_RANGES: Record<CurrencyCode, { min: number; max: number; step: number; initial: number }> = {
  USD: { min: 10, max: 5_000, step: 10, initial: 250 },
  EUR: { min: 10, max: 5_000, step: 10, initial: 250 },
  COP: { min: 100_000, max: 5_000_000, step: 50_000, initial: 1_000_000 },
  ARS: { min: 10_000, max: 2_000_000, step: 10_000, initial: 500_000 },
}
const MAX_AMOUNT = 1_000_000_000
// Nombres cortos para que entren en el selector.
const SHORT_NAMES: Record<CurrencyCode, string> = { USD: 'Dólar', EUR: 'Euro', ARS: 'Peso AR', COP: 'Peso CO' }

function CurrencyQuote() {
  const [from, setFrom] = useState<CurrencyCode>('COP')
  const [to, setTo] = useState<CurrencyCode>('ARS')
  const [amount, setAmount] = useState(AMOUNT_RANGES.COP.initial)
  const quote = useConversionQuote(from, to, amount)
  const range = AMOUNT_RANGES[from]
  const shown: ConversionQuote | null =
    quote.status === 'ok' ? quote.quote : quote.status === 'loading' ? quote.previous : null
  const byType = shown?.byType ?? null

  function changeFrom(next: CurrencyCode) {
    if (next === to) setTo(from)
    setFrom(next)
    setAmount(AMOUNT_RANGES[next].initial)
  }

  function changeTo(next: CurrencyCode) {
    if (next === from) {
      setFrom(to)
      setAmount(AMOUNT_RANGES[to].initial)
    }
    setTo(next)
  }

  function swap() {
    setFrom(to)
    setTo(from)
    setAmount(AMOUNT_RANGES[to].initial)
  }

  function handleInput(value: string) {
    const n = Number(value.replace(/\D/g, ''))
    if (Number.isFinite(n)) setAmount(Math.min(n, MAX_AMOUNT))
  }

  return (
    <div className="quote" aria-busy={quote.status === 'loading'}>
      <div className="quote__head">
        <div>
          <p className="eyebrow">Cotizador transparente</p>
          <p className="quote__intro">
            Elegí entre las 4 monedas, mové el monto y mirá exactamente cuánto recibís, con la tasa y su
            fuente a la vista.
          </p>
        </div>
        <span className="chip">Tasas en vivo · Demo</span>
      </div>

      <div className="quote__body">
        <div className="quote__input">
          <div className="quote__pair">
            <label className="quote__select">
              <span className="mono-label">Tenés</span>
              <select value={from} onChange={(e) => changeFrom(e.target.value as CurrencyCode)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c} · {SHORT_NAMES[c]}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="quote__swap" onClick={swap} aria-label="Invertir monedas" title="Invertir monedas">
              ⇄
            </button>
            <label className="quote__select">
              <span className="mono-label">Recibís en</span>
              <select value={to} onChange={(e) => changeTo(e.target.value as CurrencyCode)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c} · {SHORT_NAMES[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mono-label" htmlFor="quote-amount">
            Monto en {from}
          </label>
          <div className="quote__amount">
            <input
              id="quote-amount"
              inputMode="numeric"
              value={amount ? amount.toLocaleString('es-AR') : ''}
              onChange={(e) => handleInput(e.target.value)}
            />
            <span className="quote__amount-code">{from}</span>
          </div>
          <input
            type="range"
            className="quote__range"
            min={range.min}
            max={range.max}
            step={range.step}
            value={Math.min(Math.max(amount, range.min), range.max)}
            onChange={(e) => setAmount(Number(e.target.value))}
            aria-label={`Monto a convertir en ${from}`}
          />

          {shown && byType && (
            <div className="quote__types">
              <p className="mono-label">Mismo monto, tres dólares argentinos</p>
              <ul>
                {ARS_TYPES.map((t) => (
                  <li key={t} className={t === MAIN_ARS_TYPE ? 'is-main' : undefined}>
                    <span>{byType[t].ars_rate?.label ?? t}</span>
                    <span>{formatAmount(byType[t].result, to)}</span>
                  </li>
                ))}
              </ul>
              <p className="mono-note">
                Según el dólar que se use, la diferencia llega a {formatAmount(shown.spread, to)}.
              </p>
            </div>
          )}
        </div>

        <div className="quote__results">
          {quote.status === 'idle' ? (
            <div className="quote__loading">Ingresá un monto en {from}.</div>
          ) : quote.status === 'error' ? (
            <div className="quote__error" role="alert">
              <p>
                <strong>No pudimos traer las tasas en vivo.</strong> {quote.message}
              </p>
              <button type="button" className="btn-outline btn-outline--sm" onClick={quote.retry}>
                Reintentar
              </button>
            </div>
          ) : !shown ? (
            <div className="quote__loading">Consultando tasas en vivo…</div>
          ) : (
            <div className={quote.status === 'loading' ? 'is-updating' : undefined}>
              <div className="quote-card quote-card--nexpay">
                <p className="mono-label mono-label--gold">Recibís</p>
                <p className="quote-card__value">{formatAmount(shown.main.result, to)}</p>
                <p className="quote-card__rate">
                  1 {from} = {formatRate(shown.main.rate)} {to}
                  {shown.main.ars_rate && <> · dólar {shown.main.ars_rate.label}</>}
                </p>
              </div>
              <p className="quote__fine">
                Tasa de mercado, sin comisiones: es una simulación y no mueve saldos.{' '}
                {shown.main.ars_rate
                  ? `Dólar publicado el ${formatDateTime(shown.main.ars_rate.published_at)}`
                  : `Tasa del ${formatDateTime(shown.main.date)}`}
                {shown.main.source === 'live' ? ' · en vivo' : ' · guardada hoy'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CurrencyQuote
