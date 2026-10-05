import { useEffect, useState } from 'react'
import Pagination from '../../components/common/Pagination'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { usePagedList } from '../../hooks/usePagedList'
import { ApiError } from '../../services/api'
import { getFees, getFeesSummary } from '../../services/superuser.service'
import type { FeesSummary } from '../../types/superuser'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDateTime } from '../../utils/time'
import '../Operations/Operations.css'
import '../History/History.css'
import FeeSettingsForm from './FeeSettingsForm'

type SummaryState = { status: 'loading' } | { status: 'ok'; data: FeesSummary } | { status: 'error'; message: string }

const SOURCE_LABEL = { exchange: 'Intercambio de balance', p2p: 'P2P' } as const

/** Superusuario → Comisiones: lo cobrado por moneda, el saldo de la billetera propietaria y el detalle. */
function SuperuserFeesPage() {
  useDocumentTitle('Comisiones')
  const [summary, setSummary] = useState<SummaryState>({ status: 'loading' })
  const [page, setPage] = useState(1)
  const fees = usePagedList('fees', page, (p) => getFees({ page: p, limit: 20 }))

  useEffect(() => {
    let cancelled = false
    getFeesSummary()
      .then((data) => {
        if (!cancelled) setSummary({ status: 'ok', data })
      })
      .catch((error: unknown) => {
        if (!cancelled) setSummary({ status: 'error', message: error instanceof ApiError ? error.message : 'No se pudo cargar el resumen.' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="dashboard-content" aria-labelledby="fees-title">
      <p className="dashboard-eyebrow">Superusuario</p>
      <h1 id="fees-title">Comisiones</h1>
      <p>Todo lo que NexPay cobra llega a la billetera propietaria, en la moneda exacta en que se cobró.</p>

      <FeeSettingsForm />

      {summary.status === 'loading' && (
        <p className="op-summary op-summary--empty" aria-busy="true">
          Cargando…
        </p>
      )}
      {summary.status === 'error' && (
        <p className="op-error" role="alert">
          {summary.message}
        </p>
      )}
      {summary.status === 'ok' && (
        <>
          {!summary.data.owner_exists && (
            <p className="op-error" role="alert">
              Todavía no existe la cuenta propietaria: las comisiones se registran, pero no se acreditan a ninguna billetera.
            </p>
          )}
          <h2 className="superuser-subtitle">Cobrado por moneda</h2>
          {summary.data.totals.length === 0 ? (
            <p className="op-summary op-summary--empty">Todavía no se cobraron comisiones.</p>
          ) : (
            <div className="stat-grid">
              {summary.data.totals.map((t) => (
                <div key={t.currency} className="stat-card">
                  <span className="stat-card__label">{t.currency}</span>
                  <span className="stat-card__value">{formatCurrency(Number(t.total), t.currency)}</span>
                  <p className="stat-card__detail">
                    Intercambio de balance {formatCurrency(Number(t.exchange), t.currency)} · P2P {formatCurrency(Number(t.p2p), t.currency)}
                  </p>
                  <p className="stat-card__detail">
                    {t.count} {t.count === 1 ? 'comisión' : 'comisiones'}
                  </p>
                </div>
              ))}
            </div>
          )}

          <h2 className="superuser-subtitle">Saldo de la billetera propietaria</h2>
          <div className="stat-grid">
            {summary.data.owner_balances.map((b) => (
              <div key={b.currency} className="stat-card">
                <span className="stat-card__label">{b.currency}</span>
                <span className="stat-card__value">{formatCurrency(Number(b.amount), b.currency)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="superuser-subtitle">Detalle</h2>
      {fees.state.status === 'loading' && (
        <p className="op-summary op-summary--empty" aria-busy="true">
          Cargando…
        </p>
      )}
      {fees.state.status === 'error' && (
        <p className="op-error" role="alert">
          {fees.state.message}
        </p>
      )}
      {fees.state.status === 'ok' && fees.state.data.items.length > 0 && (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Origen</th>
                  <th scope="col">Pagó</th>
                  <th scope="col" className="num">
                    Comisión
                  </th>
                </tr>
              </thead>
              <tbody>
                {fees.state.data.items.map((fee) => (
                  <tr key={fee.id}>
                    <td>{formatDateTime(fee.created_at)}</td>
                    <td>{SOURCE_LABEL[fee.source]}</td>
                    <td>{fee.payer_email}</td>
                    <td className="num">{formatCurrency(Number(fee.amount), fee.currency_code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={fees.state.data.limit} total={fees.state.data.total} onChange={setPage} />
        </>
      )}
    </section>
  )
}

export default SuperuserFeesPage
