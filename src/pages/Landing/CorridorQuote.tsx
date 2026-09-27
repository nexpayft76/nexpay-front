import { useState } from 'react'
import { formatDateTime } from './format'
import {
  BANK_FEE_PER_CONVERSION,
  NEXPAY_FEE,
  useCorridorQuote,
  type CorridorQuote as Quote,
} from './useCorridorQuote'

const MIN = 100_000
const MAX = 5_000_000
const STEP = 50_000

const ars = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
const cop = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 0 })
const pct = (n: number) => (n * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })

function CorridorQuote() {
  const [amount, setAmount] = useState(1_000_000)
  const quote = useCorridorQuote(amount)
  const shown: Quote | null = quote.status === 'ok' ? quote.quote : quote.status === 'loading' ? quote.previous : null

  function handleInput(value: string) {
    const n = Number(value.replace(/\D/g, ''))
    if (Number.isFinite(n)) setAmount(Math.min(Math.max(n, 0), 50_000_000))
  }

  return (
    <div className="quote" aria-busy={quote.status === 'loading'}>
      <div className="quote__head">
        <div>
          <p className="eyebrow">Cotizador transparente</p>
          <p className="quote__intro">
            Mové el monto y mirá exactamente cuánto llega en pesos argentinos, y cuánto te ahorrás
            frente al camino bancario.
          </p>
        </div>
        <span className="chip">Tasas en vivo · Demo</span>
      </div>

      <div className="quote__body">
        <div className="quote__input">
          <label className="mono-label" htmlFor="quote-amount">
            Enviás desde Colombia (COP)
          </label>
          <div className="quote__amount">
            <span aria-hidden="true">$</span>
            <input
              id="quote-amount"
              inputMode="numeric"
              value={cop(amount)}
              onChange={(e) => handleInput(e.target.value)}
            />
          </div>
          <input
            type="range"
            className="quote__range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={Math.min(Math.max(amount, MIN), MAX)}
            onChange={(e) => setAmount(Number(e.target.value))}
            aria-label="Monto a enviar en COP"
          />
          <p className="mono-note">Recibe tu familia en Buenos Aires · pesos argentinos (ARS)</p>

          {shown && (
            <div className="quote__types">
              <p className="mono-label">Mismo envío, tres dólares distintos</p>
              <ul>
                {(['oficial', 'mep', 'blue'] as const).map((t) => (
                  <li key={t}>
                    <span>{shown.byType[t].ars_rate?.label ?? t}</span>
                    <span>${ars(shown.byType[t].result)} ARS</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="quote__results">
          {quote.status === 'idle' ? (
            <div className="quote__loading">Ingresá un monto en pesos colombianos.</div>
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
                <div>
                  <p className="mono-label mono-label--gold">Con NexPay · P2P directo</p>
                  <p className="quote-card__value">${ars(shown.nexpay)} ARS</p>
                </div>
                <span className="mono-note">fee {pct(NEXPAY_FEE)}%</span>
              </div>
              <div className="quote-card">
                <p className="mono-label">Banco tradicional · dólar oficial + comisiones</p>
                <p className="quote-card__value quote-card__value--muted">${ars(shown.bank)} ARS</p>
              </div>
              <div className="quote__savings">
                <span>Tu ahorro frente al banco</span>
                <strong>
                  +${ars(shown.savings)} ARS (+{pct(shown.savingsPct)}%)
                </strong>
              </div>
              <p className="quote__fine">
                NexPay cruza al dólar MEP con un fee de {pct(NEXPAY_FEE)}%. El banco convierte COP → USD
                → ARS al dólar oficial y cobra {pct(BANK_FEE_PER_CONVERSION)}% en cada conversión.
                Tasas publicadas el {formatDateTime(shown.byType.mep.ars_rate?.published_at ?? shown.byType.mep.date)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CorridorQuote
