import { useState } from 'react'
import Pagination from '../../components/common/Pagination'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { usePagedList } from '../../hooks/usePagedList'
import { getMyTransactions } from '../../services/history.service'
import type { AccountTransaction, AccountTransactionType, HistoryFilter } from '../../types/history'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDateTime } from '../../utils/time'
import '../Operations/Operations.css'
import './History.css'

const PAGE_SIZE = 20

// Compra, venta e intercambio son la misma operación para el usuario: un intercambio de balance.
const TYPE_LABEL: Record<AccountTransactionType, string> = {
  DEPOSIT: 'Recarga',
  BUY: 'Intercambio de balance',
  SELL: 'Intercambio de balance',
  EXCHANGE: 'Intercambio de balance',
}

const FILTERS: { value: HistoryFilter | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'DEPOSIT', label: 'Recargas' },
  { value: 'EXCHANGE', label: 'Intercambios de balance' },
]

function formatRate(rate: number): string {
  return new Intl.NumberFormat('es-AR', { maximumSignificantDigits: 6 }).format(rate)
}

/** Operaciones → Historial: recargas e intercambios de balance dentro de tu cuenta. Los P2P están en P2P → Historial. */
function HistoryPage() {
  useDocumentTitle('Historial')
  const [type, setType] = useState<HistoryFilter | ''>('')
  const [page, setPage] = useState(1)
  const { state } = usePagedList(type, page, (p) => getMyTransactions({ ...(type && { type }), page: p, limit: PAGE_SIZE }))

  return (
    <section className="dashboard-content" aria-labelledby="history-title">
      <p className="dashboard-eyebrow">Operaciones</p>
      <h1 id="history-title">Historial</h1>
      <p>Tus recargas e intercambios de balance. Los intercambios P2P están en P2P → Historial.</p>

      <div className="op-segmented history-filters" role="radiogroup" aria-label="Tipo de movimiento">
        {FILTERS.map((filter) => (
          <button
            key={filter.value || 'all'}
            type="button"
            role="radio"
            aria-checked={type === filter.value}
            className={`op-segmented__option${type === filter.value ? ' op-segmented__option--active' : ''}`}
            onClick={() => {
              setType(filter.value)
              setPage(1)
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {state.status === 'loading' && (
        <p className="op-summary op-summary--empty" aria-busy="true">
          Cargando tu historial…
        </p>
      )}
      {state.status === 'error' && (
        <p className="op-error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'ok' && state.data.items.length === 0 && (
        <p className="op-summary op-summary--empty">Todavía no tienes movimientos {type ? 'de este tipo' : ''}.</p>
      )}
      {state.status === 'ok' && state.data.items.length > 0 && (
        <>
          <ul className="history-list">
            {state.data.items.map((tx) => (
              <HistoryItem key={tx.id} tx={tx} />
            ))}
          </ul>
          <Pagination page={page} limit={state.data.limit} total={state.data.total} onChange={setPage} />
        </>
      )}
    </section>
  )
}

function HistoryItem({ tx }: { tx: AccountTransaction }) {
  const fee = Number(tx.fee_amount)
  const isDeposit = tx.type === 'DEPOSIT' || tx.from_currency === null
  return (
    <li className="history-item">
      <div className="history-item__head">
        <span className={`history-type${tx.type === 'DEPOSIT' ? ' history-type--deposit' : ''}`}>{TYPE_LABEL[tx.type]}</span>
        <time className="op-hint" dateTime={tx.created_at}>
          {formatDateTime(tx.created_at)}
        </time>
      </div>
      {isDeposit ? (
        <p className="history-item__main">
          Recargaste <strong>+{formatCurrency(Number(tx.to_amount), tx.to_currency)}</strong>
        </p>
      ) : (
        <>
          <p className="history-item__main">
            Pagaste <strong>{formatCurrency(Number(tx.from_amount), tx.from_currency ?? '')}</strong> y recibiste{' '}
            <strong>{formatCurrency(Number(tx.to_amount), tx.to_currency)}</strong>
          </p>
          <p className="op-hint">
            Tasa: 1 {tx.from_currency} = {formatRate(tx.exchange_rate)} {tx.to_currency}
            {tx.ars_rate_type && ` (dólar ${tx.ars_rate_type})`}
            {fee > 0 && ` · comisión ${formatCurrency(fee, tx.fee_currency ?? tx.from_currency ?? '')}`}
          </p>
        </>
      )}
    </li>
  )
}

export default HistoryPage
