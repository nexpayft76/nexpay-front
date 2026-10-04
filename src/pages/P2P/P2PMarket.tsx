import { useCallback, useEffect, useState } from 'react'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { ApiError } from '../../services/api'
import { acceptP2POffer, getP2PMarket } from '../../services/p2p.service'
import type { P2PMarketOffer } from '../../types/p2p'
import { CURRENCIES } from '../../utils/currencies'
import { formatCurrency } from '../../utils/formatCurrency'
import { deviationText, expiresIn, formatRate, percentText } from './p2pFormat'

/** "1 intercambio" / "12 intercambios" / "Sin intercambios aún". */
function tradesText(count: number): string {
  if (count === 0) return 'Sin intercambios aún'
  return `${count.toLocaleString('es-AR')} ${count === 1 ? 'intercambio' : 'intercambios'}`
}

type ListState = { status: 'loading' } | { status: 'ok'; offers: P2PMarketOffer[] } | { status: 'error'; message: string }

/** Mercado: ofertas abiertas de otros usuarios. Aceptar hace el cambio al instante. */
function P2PMarket({ onAccepted }: { onAccepted: () => void }) {
  const [sellFilter, setSellFilter] = useState('')
  const [buyFilter, setBuyFilter] = useState('')
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [selected, setSelected] = useState<P2PMarketOffer | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const load = useCallback(() => {
    let cancelled = false
    getP2PMarket({ ...(sellFilter && { sell_currency: sellFilter }), ...(buyFilter && { buy_currency: buyFilter }) })
      .then((offers) => {
        if (!cancelled) setState({ status: 'ok', offers })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: error instanceof ApiError ? error.message : 'No se pudo cargar el mercado.' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [sellFilter, buyFilter])

  useEffect(() => load(), [load])

  /** Al cambiar un filtro o actualizar, se muestra "Cargando…" mientras llega la lista nueva. */
  function reload(change?: () => void) {
    setState({ status: 'loading' })
    if (change) change()
    else load()
  }

  async function accept() {
    if (!selected) return
    setAccepting(true)
    try {
      const result = await acceptP2POffer(selected.id)
      setNotice({
        kind: 'ok',
        text: `¡Listo! Pagaste ${formatCurrency(Number(result.offer.buy_amount), result.offer.buy_currency)} y recibiste ${formatCurrency(Number(result.offer.buyer_receives), result.offer.sell_currency)}.`,
      })
      onAccepted()
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof ApiError ? error.message : 'No se pudo aceptar la oferta.' })
    } finally {
      setAccepting(false)
      setSelected(null)
      load()
    }
  }

  return (
    <div className="p2p-market">
      <div className="p2p-market__filters">
        <label>
          <span>Se vende</span>
          <select className="op-input" value={sellFilter} onChange={(event) => reload(() => setSellFilter(event.target.value))}>
            <option value="">Todas</option>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Pagas con</span>
          <select className="op-input" value={buyFilter} onChange={(event) => reload(() => setBuyFilter(event.target.value))}>
            <option value="">Todas</option>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => reload()}>
          Actualizar
        </button>
      </div>

      {notice && (
        <p className={notice.kind === 'ok' ? 'p2p-market__notice' : 'op-error'} role={notice.kind === 'ok' ? 'status' : 'alert'}>
          {notice.text}
        </p>
      )}

      {state.status === 'loading' && (
        <p className="op-summary op-summary--empty" aria-busy="true">
          Cargando ofertas…
        </p>
      )}
      {state.status === 'error' && (
        <p className="op-error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'ok' && state.offers.length === 0 && (
        <p className="op-summary op-summary--empty">No hay ofertas abiertas con estos filtros. ¡Publica la tuya!</p>
      )}
      {state.status === 'ok' && state.offers.length > 0 && (
        <ul className="p2p-market__list">
          {state.offers.map((offer) => (
            <li key={offer.id} className="p2p-offer">
              <div className="p2p-offer__head">
                <span className="p2p-offer__seller">
                  <strong>{offer.seller_name}</strong>
                  <span className="p2p-reputation" title="Intercambios P2P completados">
                    {tradesText(offer.completed_trades)}
                  </span>
                </span>
                <span className="op-hint">{expiresIn(offer.expires_at)}</span>
              </div>
              <p className="p2p-offer__main">
                Vende <strong>{formatCurrency(Number(offer.sell_amount), offer.sell_currency)}</strong> por{' '}
                <strong>{formatCurrency(Number(offer.buy_amount), offer.buy_currency)}</strong>
              </p>
              <p className="op-hint">
                1 {offer.sell_currency} = {formatRate(offer.rate)} {offer.buy_currency} · {deviationText((offer.rate / offer.market_rate - 1) * 100)}{' '}
                (al publicar)
              </p>
              <p className="op-hint">
                Recibes <strong>{formatCurrency(Number(offer.buyer_receives), offer.sell_currency)}</strong> · comisión{' '}
                {formatCurrency(Number(offer.buyer_fee), offer.sell_currency)} ({percentText(offer.fee_percent)})
              </p>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setSelected(offer)}>
                Aceptar oferta
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <ConfirmDialog
          open
          title="¿Aceptas la oferta?"
          confirmLabel="Sí, aceptar"
          busy={accepting}
          onConfirm={accept}
          onCancel={() => setSelected(null)}
        >
          <p>
            Pagas <strong>{formatCurrency(Number(selected.buy_amount), selected.buy_currency)}</strong> y recibes{' '}
            <strong>{formatCurrency(Number(selected.buyer_receives), selected.sell_currency)}</strong> (comisión{' '}
            {formatCurrency(Number(selected.buyer_fee), selected.sell_currency)}).
          </p>
          <p>
            Tasa de la oferta: 1 {selected.sell_currency} = {formatRate(selected.rate)} {selected.buy_currency}.
          </p>
          <p className="confirm-dialog__note">
            El cambio es instantáneo: las dos cuentas quedan bloqueadas mientras se hace y, si algo falla, no se mueve nada.
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}

export default P2PMarket
