import { useState } from 'react'
import Pagination from '../../components/common/Pagination'
import { usePagedList } from '../../hooks/usePagedList'
import { getMyP2PTrades } from '../../services/history.service'
import type { P2PTrade } from '../../types/history'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDateTime } from '../../utils/time'
import '../History/History.css'
import { formatRate, percentText } from './p2pFormat'

const PAGE_SIZE = 20

/** P2P → Historial: intercambios aceptados, como vendedor o como comprador, con todos sus datos. */
function P2PTrades() {
  const [page, setPage] = useState(1)
  const { state } = usePagedList('p2p-trades', page, (p) => getMyP2PTrades({ page: p, limit: PAGE_SIZE }))

  if (state.status === 'loading') {
    return (
      <p className="op-summary op-summary--empty" aria-busy="true">
        Cargando tus intercambios…
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
  if (state.data.items.length === 0) {
    return <p className="op-summary op-summary--empty">Todavía no tienes intercambios P2P aceptados.</p>
  }

  return (
    <>
      <ul className="history-list">
        {state.data.items.map((trade) => (
          <TradeItem key={trade.offer_id} trade={trade} />
        ))}
      </ul>
      <Pagination page={page} limit={state.data.limit} total={state.data.total} onChange={setPage} />
    </>
  )
}

function TradeItem({ trade }: { trade: P2PTrade }) {
  const isSeller = trade.role === 'seller'
  return (
    <li className="history-item">
      <div className="history-item__head">
        <span className="history-type">{isSeller ? 'Vendiste' : 'Compraste'}</span>
        <time className="op-hint" dateTime={trade.completed_at}>
          {formatDateTime(trade.completed_at)}
        </time>
      </div>
      <p className="history-item__main">
        Pagaste <strong>{formatCurrency(Number(trade.paid_amount), trade.paid_currency)}</strong> y recibiste{' '}
        <strong>{formatCurrency(Number(trade.received_amount), trade.received_currency)}</strong>
      </p>
      <p className="op-hint">
        {isSeller ? 'Aceptó tu oferta' : 'Oferta de'}: <strong>{trade.counterpart_name}</strong>
      </p>
      <p className="op-hint">
        Tasa: 1 {trade.sell_currency} = {formatRate(trade.rate)} {trade.buy_currency} · comisión{' '}
        {formatCurrency(Number(trade.fee_amount), trade.fee_currency)} ({percentText(trade.fee_percent)})
      </p>
    </li>
  )
}

export default P2PTrades
