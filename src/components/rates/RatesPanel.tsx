import { useState } from 'react'
import { useRates } from '../../hooks/useRates'
import { CURRENCIES, CURRENCY_NAMES, type CurrencyCode } from '../../types/currency'
import type { RatesSnapshot } from '../../types/rates'
import { formatDateTime, formatRate } from '../../utils/formatRate'
import './RatesPanel.css'

function RatesPanel() {
  const [base, setBase] = useState<CurrencyCode>('USD')
  const rates = useRates(base)

  return (
    <section className="rates-panel" aria-labelledby="rates-title">
      <header className="rates-panel__header">
        <div>
          <h2 id="rates-title">Tasas de cambio</h2>
          <p className="rates-panel__subtitle">Cuánto equivale 1 {base} en cada moneda.</p>
        </div>
        <div className="rates-panel__controls">
          <div className="segmented" role="group" aria-label="Moneda base">
            {CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                className="segmented__option"
                aria-pressed={code === base}
                onClick={() => setBase(code)}
              >
                {code}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={rates.reload}
            disabled={rates.status === 'loading'}
          >
            Actualizar
          </button>
        </div>
      </header>

      {rates.status === 'loading' && <RatesSkeleton />}

      {rates.status === 'error' && (
        <div className="rates-alert rates-alert--error" role="alert">
          <p>
            <strong>No pudimos cargar las tasas.</strong> {rates.message}
          </p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={rates.reload}>
            Reintentar
          </button>
        </div>
      )}

      {rates.status === 'ok' && <RatesContent snapshot={rates.data} />}
    </section>
  )
}

function RatesContent({ snapshot }: { snapshot: RatesSnapshot }) {
  const staleProviders = snapshot.providers.filter((p) => p.stale)
  const quotes = CURRENCIES.filter((code) => code !== snapshot.base)

  return (
    <>
      <p className="rates-panel__status">
        <span className={`rates-badge rates-badge--${snapshot.source === 'live' ? 'live' : 'cache'}`}>
          {snapshot.source === 'live' ? 'En vivo' : 'Guardadas hoy'}
        </span>
        Actualizado el {formatDateTime(snapshot.fetched_at)}
      </p>

      {staleProviders.map((p) => (
        <p key={p.provider} className="rates-alert rates-alert--warning" role="status">
          No pudimos consultar {p.label} en este momento. Mostramos la última tasa disponible (
          {formatDateTime(p.fetched_at)}).
        </p>
      ))}

      {snapshot.warnings.map((w, i) => (
        <p key={i} className="rates-alert rates-alert--warning" role="status">
          {typeof w === 'string' ? w : w.message}
        </p>
      ))}

      <ul className="rates-grid">
        {quotes.map((code) => {
          const value = snapshot.rates[code]
          const unavailable = value === undefined || snapshot.unavailable.includes(code)
          return (
            <li key={code} className={`rate-card${unavailable ? ' rate-card--unavailable' : ''}`}>
              <span className="rate-card__code">{code}</span>
              <span className="rate-card__name">{CURRENCY_NAMES[code]}</span>
              <span className="rate-card__value">
                {unavailable ? 'No disponible' : formatRate(value)}
              </span>
            </li>
          )
        })}
      </ul>

      <p className="rates-panel__sources">
        Fuentes: {snapshot.providers.map((p) => p.label).join(' | ')}
      </p>
    </>
  )
}

function RatesSkeleton() {
  return (
    <ul className="rates-grid" aria-busy="true" aria-label="Cargando tasas">
      {[0, 1, 2].map((i) => (
        <li key={i} className="rate-card rate-card--skeleton" />
      ))}
    </ul>
  )
}

export default RatesPanel
