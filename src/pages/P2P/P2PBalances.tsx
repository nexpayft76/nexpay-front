import type { CSSProperties } from 'react'
import { useMyWallet } from '../../hooks/useMyWallet'
import { CURRENCIES } from '../../utils/currencies'
import { formatCurrency } from '../../utils/formatCurrency'

/** Saldos en una franja compacta: en el P2P el protagonismo es de las ofertas. */
function P2PBalances() {
  const wallet = useMyWallet('USD')

  return (
    <section className="p2p-balances" aria-label="Tu saldo disponible">
      <span className="p2p-balances__title">Tu saldo</span>
      {wallet.status === 'error' ? (
        <span className="op-hint">{wallet.message}</span>
      ) : (
        <ul className="p2p-balances__list">
          {CURRENCIES.map((c) => {
            const amount =
              wallet.status === 'ok' ? Number(wallet.data.balances.find((b) => b.currency === c.code)?.amount ?? 0) : null
            return (
              <li key={c.code} className="p2p-balances__item" style={{ '--currency-color': c.color } as CSSProperties}>
                <span className="p2p-balances__dot" aria-hidden="true" />
                <span className="p2p-balances__code">{c.code}</span>
                <strong>{amount === null ? '…' : formatCurrency(amount, c.code)}</strong>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default P2PBalances
