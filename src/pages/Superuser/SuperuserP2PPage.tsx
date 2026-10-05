import { useState } from 'react'
import Pagination from '../../components/common/Pagination'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { usePagedList } from '../../hooks/usePagedList'
import { getSystemOffers } from '../../services/superuser.service'
import type { SystemOfferStatus } from '../../types/superuser'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDateTime } from '../../utils/time'
import { formatRate, STATUS_LABEL } from '../P2P/p2pFormat'
import '../Operations/Operations.css'
import '../History/History.css'

const FILTERS: { value: SystemOfferStatus | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'open', label: 'Abiertas' },
  { value: 'completed', label: 'Aceptadas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'expired', label: 'Vencidas' },
]

/** Superusuario → P2P: todas las ofertas del sistema, abiertas y aceptadas, con vendedor y comprador. */
function SuperuserP2PPage() {
  useDocumentTitle('P2P del sistema')
  const [status, setStatus] = useState<SystemOfferStatus | ''>('')
  const [page, setPage] = useState(1)
  const { state } = usePagedList(`offers|${status}`, page, (p) =>
    getSystemOffers({ ...(status && { status }), page: p, limit: 20 }),
  )

  return (
    <section className="dashboard-content" aria-labelledby="system-p2p-title">
      <p className="dashboard-eyebrow">Superusuario</p>
      <h1 id="system-p2p-title">P2P del sistema</h1>
      <p>Todas las ofertas P2P: abiertas, aceptadas, canceladas y vencidas.</p>

      <div className="op-segmented history-filters" role="radiogroup" aria-label="Estado de la oferta">
        {FILTERS.map((filter) => (
          <button
            key={filter.value || 'all'}
            type="button"
            role="radio"
            aria-checked={status === filter.value}
            className={`op-segmented__option${status === filter.value ? ' op-segmented__option--active' : ''}`}
            onClick={() => {
              setStatus(filter.value)
              setPage(1)
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {state.status === 'loading' && (
        <p className="op-summary op-summary--empty" aria-busy="true">
          Cargando…
        </p>
      )}
      {state.status === 'error' && (
        <p className="op-error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'ok' && state.data.items.length === 0 && (
        <p className="op-summary op-summary--empty">No hay ofertas con este estado.</p>
      )}
      {state.status === 'ok' && state.data.items.length > 0 && (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Publicada</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Vendedor</th>
                  <th scope="col">Comprador</th>
                  <th scope="col" className="num">
                    Vende
                  </th>
                  <th scope="col" className="num">
                    Por
                  </th>
                  <th scope="col" className="num">
                    Tasa
                  </th>
                  <th scope="col" className="num">
                    Comisiones
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.items.map((offer) => (
                  <tr key={offer.id}>
                    <td>{formatDateTime(offer.created_at)}</td>
                    <td>
                      <span className={`history-type history-type--${offer.status}`}>{STATUS_LABEL[offer.status]}</span>
                    </td>
                    <td>{offer.seller_email}</td>
                    <td>{offer.buyer_email ?? '—'}</td>
                    <td className="num">{formatCurrency(Number(offer.sell_amount), offer.sell_currency)}</td>
                    <td className="num">{formatCurrency(Number(offer.buy_amount), offer.buy_currency)}</td>
                    <td className="num">{formatRate(offer.rate)}</td>
                    <td className="num">
                      {offer.status === 'completed'
                        ? `${formatCurrency(Number(offer.seller_fee), offer.buy_currency)} + ${formatCurrency(Number(offer.buyer_fee), offer.sell_currency)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={state.data.limit} total={state.data.total} onChange={setPage} />
        </>
      )}
    </section>
  )
}

export default SuperuserP2PPage
