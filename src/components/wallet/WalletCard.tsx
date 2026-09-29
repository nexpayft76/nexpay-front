import { useMyWallet } from '../../hooks/useMyWallet'
import type { RatesSource, WalletBalance } from '../../types/wallet'
import { CURRENCIES, CURRENCY_CODES } from '../../utils/currencies'
import { formatCurrency } from '../../utils/formatCurrency'
import './WalletCard.css'

/** Orden (el del corredor: COP, ARS, USD, EUR) y país de cada moneda, compartidos con el selector de arriba. */
const CURRENCY_META: Record<string, { order: number; country: string }> = Object.fromEntries(
  CURRENCIES.map((c, order) => [c.code, { order, country: c.country }]),
)

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

interface WalletCardProps {
  /**
   * Moneda en la que se muestra el total estimado de arriba (y los "≈" de cada saldo).
   * La controla el Dashboard porque también es el destino del gráfico.
   */
  valuedIn: string
  onValuedInChange: (currency: string) => void
}

function WalletCard({ valuedIn, onValuedInChange }: WalletCardProps) {
  const wallet = useMyWallet(valuedIn)

  return (
    <section className="wallet-card" aria-labelledby="wallet-title">
      <header className="wallet-card__header">
        <h2 id="wallet-title">Mi billetera</h2>
        <label className="wallet-card__select">
          Ver total en
          <select value={valuedIn} onChange={(event) => onValuedInChange(event.target.value)}>
            {CURRENCY_CODES.map((code) => (
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
          {/* Arriba: la suma de TODOS los saldos convertida a la moneda elegida en "Ver total en". */}
          <div className="wallet-card__total">
            <span className="wallet-card__total-label">Total estimado de todos tus balances</span>
            {wallet.data.valuation ? (
              <>
                <strong className="wallet-card__total-amount">
                  {formatCurrency(wallet.data.valuation.total, wallet.data.valuation.currency)}
                </strong>
                <span className="wallet-card__total-meta">
                  {SOURCE_LABEL[wallet.data.valuation.rates_source]} · {wallet.data.valuation.rates_date}
                  {' · ARS al dólar MEP, igual que el cotizador'}
                  {wallet.data.valuation.missing_currencies.length > 0 &&
                    ` · sin incluir ${wallet.data.valuation.missing_currencies.join(', ')} (tasa no disponible)`}
                </span>
              </>
            ) : (
              <span className="wallet-card__total-meta">Las tasas no están disponibles en este momento.</span>
            )}
          </div>

          {/* Abajo: lo que REALMENTE hay en cada moneda, y cuánto vale en la moneda elegida. */}
          <h3 className="wallet-card__subtitle">Tus saldos por moneda</h3>

          <ul className="wallet-card__balances">
            {sortBalances(wallet.data.balances).map((balance) => (
              <li key={balance.currency} className="balance-tile-wrap">
                <div className="balance-tile">
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
                </div>
              </li>
            ))}
          </ul>

          {wallet.data.balances.every((b) => Number(b.amount) === 0) && (
            <p className="wallet-card__empty">
              Todavía no tenés saldo. Cuando hagas tu primera recarga, lo vas a ver acá en las 4 monedas.
            </p>
          )}

          {wallet.data.valuation && wallet.data.valuation.warnings.length > 0 && (
            <ul className="wallet-card__warnings" role="status">
              {wallet.data.valuation.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
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
