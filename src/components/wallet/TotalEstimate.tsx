import { useMyWallet } from '../../hooks/useMyWallet'
import type { RatesSource } from '../../types/wallet'
import { CURRENCY_CODES } from '../../utils/currencies'
import { formatCurrency } from '../../utils/formatCurrency'
import './TotalEstimate.css'

const SOURCE_LABEL: Record<RatesSource, string> = {
  live: 'Tasas en vivo',
  cache: 'Tasas actualizadas',
  fallback: 'Última tasa válida',
}

interface TotalEstimateProps {
  /** Moneda del total. La comparte el Dashboard con la billetera y con el "a" del gráfico. */
  currency: string
  onCurrencyChange: (currency: string) => void
}

/**
 * Junto al saludo, encima del gráfico: la suma de TODOS los saldos convertida a la moneda elegida.
 * Usa las mismas tasas que el cotizador (ARS al dólar MEP).
 */
function TotalEstimate({ currency, onCurrencyChange }: TotalEstimateProps) {
  const wallet = useMyWallet(currency)
  const valuation = wallet.status === 'ok' ? wallet.data.valuation : null

  let amount = '…'
  if (wallet.status === 'error') amount = '—'
  else if (wallet.status === 'ok') amount = valuation ? formatCurrency(valuation.total, valuation.currency) : '—'

  return (
    <div className="total-estimate" aria-live="polite">
      <span className="total-estimate__label">Total estimado de todos tus balances</span>
      <div className="total-estimate__row">
        <strong className="total-estimate__amount" aria-busy={wallet.status === 'loading'}>
          {amount}
        </strong>
        <select value={currency} onChange={(event) => onCurrencyChange(event.target.value)} aria-label="Moneda del total estimado">
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
      <span className="total-estimate__meta">
        {wallet.status === 'error' && wallet.message}
        {wallet.status === 'ok' && !valuation && 'Las tasas no están disponibles en este momento.'}
        {valuation && (
          <>
            {SOURCE_LABEL[valuation.rates_source]} · ARS al dólar MEP, igual que el cotizador
            {valuation.missing_currencies.length > 0 &&
              ` · sin incluir ${valuation.missing_currencies.join(', ')} (tasa no disponible)`}
          </>
        )}
      </span>
    </div>
  )
}

export default TotalEstimate
