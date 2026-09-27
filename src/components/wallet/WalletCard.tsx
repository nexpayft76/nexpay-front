import { useState } from 'react'
import { useMyWallet } from '../../hooks/useMyWallet'
import type { RatesSource, WalletBalance } from '../../types/wallet'
import { formatCurrency } from '../../utils/formatCurrency'
import './WalletCard.css'

/** Orden y color de cada moneda: primero el corredor COP ↔ ARS, después USD y EUR. */
const CURRENCY_META: Record<string, { order: number; country: string }> = {
  COP: { order: 0, country: 'Colombia' },
  ARS: { order: 1, country: 'Argentina' },
  USD: { order: 2, country: 'Estados Unidos' },
  EUR: { order: 3, country: 'Zona euro' },
}

const VALUATION_CURRENCIES = ['USD', 'COP', 'ARS', 'EUR']

const SOURCE_LABEL: Record<RatesSource, string> = {
  live: 'Tasas en vivo',
  cache: 'Tasas actualizadas',
  fallback: 'Última tasa válida',
}

function sortBalances(balances: WalletBalance[]): WalletBalance[] {
  return [...balances].sort(
    (a, b) => (CURRENCY_META[a.currency]?.order ?? 99) - (CURRENCY_META[b.currency]?.order ?? 99),
  )
}

function WalletCard() {
  const [valuedIn, setValuedIn] = useState('USD')
  const wallet = useMyWallet(valuedIn)

  return (
    <section className="wallet-card" aria-labelledby="wallet-title">
      <header className="wallet-card__header">
        <h2 id="wallet-title">Mi billetera</h2>
        <label className="wallet-card__select">
          Ver total en
          <select value={valuedIn} onChange={(event) => setValuedIn(event.target.value)}>
            {VALUATION_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </header>

      {wallet.status === 'loading' && <WalletSkeleton />}

      {wallet.status === 'error' && (
        <div className="wallet-card__error" role="alert">
          <p>{wallet.message}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={wallet.reload}>
            Reintentar
          </button>
        </div>
      )}

      {wallet.status === 'ok' && (
        <>
          <div className="wallet-card__total">
            {wallet.data.valuation ? (
              <>
                <span className="wallet-card__total-label">Saldo total estimado</span>
                <strong className="wallet-card__total-amount">
                  {formatCurrency(wallet.data.valuation.total, wallet.data.valuation.currency)}
                </strong>
                <span className="wallet-card__total-meta">
                  {SOURCE_LABEL[wallet.data.valuation.rates_source]} · {wallet.data.valuation.rates_date}
                </span>
              </>
            ) : (
              <span className="wallet-card__total-meta">
                Las tasas no están disponibles: se muestran solo tus saldos.
              </span>
            )}
          </div>

          {wallet.data.valuation && wallet.data.valuation.warnings.length > 0 && (
            <ul className="wallet-card__warnings" role="status">
              {wallet.data.valuation.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          <ul className="wallet-card__balances">
            {sortBalances(wallet.data.balances).map((balance) => (
              <li key={balance.currency} className="balance-tile">
                <span className={`balance-tile__badge balance-tile__badge--${balance.currency.toLowerCase()}`}>
                  {balance.currency}
                </span>
                <div className="balance-tile__info">
                  <span className="balance-tile__name">{balance.name}</span>
                  <span className="balance-tile__country">{CURRENCY_META[balance.currency]?.country}</span>
                </div>
                <div className="balance-tile__amounts">
                  <strong>{formatCurrency(Number(balance.amount), balance.currency)}</strong>
                  {balance.currency !== valuedIn && balance.value_in_target !== null && (
                    <span>≈ {formatCurrency(balance.value_in_target, valuedIn)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {wallet.data.balances.every((b) => Number(b.amount) === 0) && (
            <p className="wallet-card__empty">
              Todavía no tenés saldo. Cuando hagas tu primera recarga, lo vas a ver acá en las 4 monedas.
            </p>
          )}
        </>
      )}
    </section>
  )
}

function WalletSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando billetera">
      <div className="wallet-skeleton wallet-skeleton--total" />
      <div className="wallet-card__balances">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="wallet-skeleton wallet-skeleton--tile" />
        ))}
      </div>
    </div>
  )
}

export default WalletCard
