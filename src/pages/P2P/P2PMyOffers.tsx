import { useCallback, useEffect, useState } from 'react'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { ApiError } from '../../services/api'
import { cancelP2POffer, getMyP2POffers } from '../../services/p2p.service'
import type { P2POffer } from '../../types/p2p'
import { formatCurrency } from '../../utils/formatCurrency'
import { expiresIn, formatRate, STATUS_LABEL } from './p2pFormat'

type ListState = { status: 'loading' } | { status: 'ok'; offers: P2POffer[] } | { status: 'error'; message: string }

/** Mis ofertas: abiertas (con su monto retenido) y el historial. Una abierta se puede cancelar. */
function P2PMyOffers({ onChanged }: { onChanged: () => void }) {
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [cancelling, setCancelling] = useState<P2POffer | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    let cancelled = false
    getMyP2POffers()
      .then((offers) => {
        if (!cancelled) setState({ status: 'ok', offers })
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: err instanceof ApiError ? err.message : 'No se pudieron cargar tus ofertas.' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => load(), [load])

  async function cancel() {
    if (!cancelling) return
    setBusy(true)
    setError(null)
    try {
      await cancelP2POffer(cancelling.id)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cancelar la oferta.')
    } finally {
      setBusy(false)
      setCancelling(null)
      load()
    }
  }

  if (state.status === 'loading') {
    return (
      <p className="op-summary op-summary--empty" aria-busy="true">
        Cargando tus ofertas…
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

  return (
    <div className="p2p-market">
      {error && (
        <p className="op-error" role="alert">
          {error}
        </p>
      )}
      {state.offers.length === 0 ? (
        <p className="op-summary op-summary--empty">Todavía no publicaste ofertas.</p>
      ) : (
        <ul className="p2p-market__list">
          {state.offers.map((offer) => (
            <li key={offer.id} className="p2p-offer">
              <div className="p2p-offer__head">
                <span className={`p2p-status p2p-status--${offer.status}`}>{STATUS_LABEL[offer.status]}</span>
                {offer.status === 'open' && <span className="op-hint">{expiresIn(offer.expires_at)}</span>}
              </div>
              <p className="p2p-offer__main">
                Vendes <strong>{formatCurrency(Number(offer.sell_amount), offer.sell_currency)}</strong> a{' '}
                {formatRate(offer.rate)} {offer.buy_currency} por {offer.sell_currency}
              </p>
              <p className="op-hint">
                {offer.status === 'completed' ? 'Recibiste' : 'Recibes si aceptan'}{' '}
                <strong>{formatCurrency(Number(offer.seller_receives), offer.buy_currency)}</strong> · comisión{' '}
                {formatCurrency(Number(offer.seller_fee), offer.buy_currency)}
              </p>
              {offer.status === 'open' && (
                <>
                  <p className="op-hint">Retenido en garantía hasta que alguien acepte, la canceles o venza.</p>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCancelling(offer)}>
                    Cancelar oferta
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {cancelling && (
        <ConfirmDialog
          open
          title="¿Cancelas la oferta?"
          confirmLabel="Sí, cancelar"
          busy={busy}
          onConfirm={cancel}
          onCancel={() => setCancelling(null)}
        >
          <p>
            Se te devuelven <strong>{formatCurrency(Number(cancelling.sell_amount), cancelling.sell_currency)}</strong> a tu
            saldo y la oferta sale del mercado.
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}

export default P2PMyOffers
