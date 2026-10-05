import { useState } from 'react'
import Pagination from '../../components/common/Pagination'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { usePagedList } from '../../hooks/usePagedList'
import { getSystemTransactions } from '../../services/superuser.service'
import type { SystemTransactionFilter, SystemTransactionType } from '../../types/superuser'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDateTime } from '../../utils/time'
import '../Operations/Operations.css'
import '../History/History.css'

const TYPE_LABEL: Record<SystemTransactionType, string> = {
  DEPOSIT: 'Recarga',
  BUY: 'Intercambio de balance',
  SELL: 'Intercambio de balance',
  EXCHANGE: 'Intercambio de balance',
  P2P: 'P2P',
}

const FILTERS: { value: SystemTransactionFilter; label: string }[] = [
  { value: 'DEPOSIT', label: 'Recargas' },
  { value: 'EXCHANGE', label: 'Intercambios de balance' },
  { value: 'P2P', label: 'P2P' },
]

/** Superusuario → Transacciones: todas las del sistema, por tipo y por correo del usuario. */
function SuperuserTransactionsPage() {
  useDocumentTitle('Transacciones del sistema')
  const [type, setType] = useState<SystemTransactionFilter | ''>('')
  const [search, setSearch] = useState('')
  const email = useDebouncedValue(search.trim(), 400)
  const [page, setPage] = useState(1)
  const { state } = usePagedList(`tx|${type}|${email}`, page, (p) =>
    getSystemTransactions({ ...(type && { type }), ...(email && { email }), page: p, limit: 20 }),
  )

  return (
    <section className="dashboard-content" aria-labelledby="system-tx-title">
      <p className="dashboard-eyebrow">Superusuario</p>
      <h1 id="system-tx-title">Transacciones</h1>
      <p>Todas las transacciones de todos los usuarios, de la más nueva a la más vieja.</p>

      <div className="superuser-toolbar">
        <label>
          <span>Tipo</span>
          <select
            className="op-input"
            value={type}
            onChange={(event) => {
              setType(event.target.value as SystemTransactionFilter | '')
              setPage(1)
            }}
          >
            <option value="">Todas</option>
            {FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Correo del usuario</span>
          <input
            className="op-input"
            type="search"
            placeholder="ej. ana@"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </label>
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
        <p className="op-summary op-summary--empty">No hay transacciones con estos filtros.</p>
      )}
      {state.status === 'ok' && state.data.items.length > 0 && (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Usuario</th>
                  <th scope="col">Tipo</th>
                  <th scope="col" className="num">
                    Pagó
                  </th>
                  <th scope="col" className="num">
                    Recibió
                  </th>
                  <th scope="col" className="num">
                    Comisión
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.items.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDateTime(tx.created_at)}</td>
                    <td>{tx.user_email}</td>
                    <td>
                      <span className="history-type">{TYPE_LABEL[tx.type]}</span>
                    </td>
                    <td className="num">{tx.from_currency ? formatCurrency(Number(tx.from_amount), tx.from_currency) : '—'}</td>
                    <td className="num">{formatCurrency(Number(tx.to_amount), tx.to_currency)}</td>
                    <td className="num">
                      {Number(tx.fee_amount) > 0
                        ? formatCurrency(Number(tx.fee_amount), tx.fee_currency ?? tx.from_currency ?? '')
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

export default SuperuserTransactionsPage
