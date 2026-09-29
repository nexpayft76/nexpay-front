import { useState } from 'react'
import { useMyWallet } from '../../hooks/useMyWallet'
import { CURRENCY_CODES } from '../../utils/currencies'
import { formatCurrency } from '../../utils/formatCurrency'
import './BalanceSummary.css'

/**
 * Saldo REAL de la moneda elegida, junto al saludo: lo que hay en ese "bolsillo" de la billetera,
 * sin conversiones (si solo recargaste COP, en USD y ARS muestra 0).
 */
function BalanceSummary() {
  const [currency, setCurrency] = useState('COP')
  // La moneda de valorización no importa aquí: se leen los saldos tal cual, sin convertir.
  const wallet = useMyWallet('USD')

  let content: string
  if (wallet.status === 'loading') content = '…'
  else if (wallet.status === 'error') content = '—'
  else {
    const balance = wallet.data.balances.find((b) => b.currency === currency)
    content = formatCurrency(Number(balance?.amount ?? 0), currency)
  }

  return (
    <div className="balance-summary" aria-live="polite">
      <span className="balance-summary__label">Saldo en {currency}</span>
      <div className="balance-summary__row">
        <strong className="balance-summary__amount" aria-busy={wallet.status === 'loading'}>
          {content}
        </strong>
        <select value={currency} onChange={(event) => setCurrency(event.target.value)} aria-label="Moneda del saldo">
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default BalanceSummary
