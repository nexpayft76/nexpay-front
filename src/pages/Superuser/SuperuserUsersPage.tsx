import { useState } from 'react'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Pagination from '../../components/common/Pagination'
import { useAuth } from '../../hooks/useAuth'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { usePagedList } from '../../hooks/usePagedList'
import { ApiError } from '../../services/api'
import { getUsers, setUserRole, setUserStatus } from '../../services/superuser.service'
import type { UserRole } from '../../types/auth'
import type { ManagedUser } from '../../types/superuser'
import { formatDateTime } from '../../utils/time'
import '../Operations/Operations.css'
import '../History/History.css'

const ROLE_LABEL: Record<UserRole, string> = { user: 'Usuario', superuser: 'Superusuario' }
const STATUS_LABEL: Record<ManagedUser['status'], string> = { active: 'Activa', suspended: 'Suspendida', closed: 'Cerrada' }

/** Lo que el superusuario está por cambiar (se confirma antes). */
type PendingChange = { user: ManagedUser; kind: 'role'; role: UserRole } | { user: ManagedUser; kind: 'status'; status: 'active' | 'suspended' }

/** Superusuario → Usuarios: todos los registrados, búsqueda por correo, rol y suspensión. */
function SuperuserUsersPage() {
  useDocumentTitle('Usuarios')
  const { user: me } = useAuth()
  const [search, setSearch] = useState('')
  const email = useDebouncedValue(search.trim(), 400)
  const [page, setPage] = useState(1)
  const { state, reload } = usePagedList(`users|${email}`, page, (p) => getUsers({ ...(email && { email }), page: p, limit: 20 }))
  const [pending, setPending] = useState<PendingChange | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function apply() {
    if (!pending) return
    setBusy(true)
    try {
      const updated =
        pending.kind === 'role'
          ? await setUserRole(pending.user.id, pending.role)
          : await setUserStatus(pending.user.id, pending.status)
      setNotice({
        kind: 'ok',
        text:
          pending.kind === 'role'
            ? `${updated.email} ahora es ${ROLE_LABEL[updated.role].toLowerCase()}.`
            : `La cuenta de ${updated.email} quedó ${STATUS_LABEL[updated.status].toLowerCase()}.`,
      })
      reload()
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof ApiError ? error.message : 'No se pudo guardar el cambio.' })
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  return (
    <section className="dashboard-content" aria-labelledby="users-title">
      <p className="dashboard-eyebrow">Superusuario</p>
      <h1 id="users-title">Usuarios</h1>
      <p>Todos los registrados. Asigna el rol de superusuario o suspende cuentas. La cuenta propietaria no se puede cambiar.</p>

      <div className="superuser-toolbar">
        <label>
          <span>Buscar por correo</span>
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

      {notice && (
        <p className={notice.kind === 'ok' ? 'history-notice' : 'op-error'} role={notice.kind === 'ok' ? 'status' : 'alert'}>
          {notice.text}
        </p>
      )}

      {state.status === 'loading' && (
        <p className="op-summary op-summary--empty" aria-busy="true">
          Cargando usuarios…
        </p>
      )}
      {state.status === 'error' && (
        <p className="op-error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'ok' && state.data.items.length === 0 && (
        <p className="op-summary op-summary--empty">No hay usuarios con ese correo.</p>
      )}
      {state.status === 'ok' && state.data.items.length > 0 && (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Registro</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {state.data.items.map((u) => {
                  const locked = u.is_owner || u.id === me?.id
                  return (
                    <tr key={u.id}>
                      <td>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td>
                        {locked ? (
                          <span className="history-type">{u.is_owner ? 'Propietario' : ROLE_LABEL[u.role]}</span>
                        ) : (
                          <select
                            className="op-input"
                            aria-label={`Rol de ${u.email}`}
                            value={u.role}
                            onChange={(event) => setPending({ user: u, kind: 'role', role: event.target.value as UserRole })}
                          >
                            <option value="user">Usuario</option>
                            <option value="superuser">Superusuario</option>
                          </select>
                        )}
                      </td>
                      <td>
                        <span className={`history-type history-type--${u.status}`}>{STATUS_LABEL[u.status]}</span>
                      </td>
                      <td>{formatDateTime(u.created_at)}</td>
                      <td>
                        {!locked && u.status !== 'closed' && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() =>
                              setPending({ user: u, kind: 'status', status: u.status === 'active' ? 'suspended' : 'active' })
                            }
                          >
                            {u.status === 'active' ? 'Suspender' : 'Reactivar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={state.data.limit} total={state.data.total} onChange={setPage} />
        </>
      )}

      {pending && (
        <ConfirmDialog
          open
          title={pending.kind === 'role' ? '¿Cambias el rol?' : pending.status === 'suspended' ? '¿Suspendes la cuenta?' : '¿Reactivas la cuenta?'}
          confirmLabel="Sí, confirmar"
          busy={busy}
          onConfirm={apply}
          onCancel={() => setPending(null)}
        >
          {pending.kind === 'role' ? (
            <p>
              <strong>{pending.user.email}</strong> pasa a ser <strong>{ROLE_LABEL[pending.role].toLowerCase()}</strong>.
              {pending.role === 'superuser' && ' Podrá ver a todos los usuarios, asignar roles y ver todo el sistema.'}
            </p>
          ) : pending.status === 'suspended' ? (
            <p>
              <strong>{pending.user.email}</strong> no podrá iniciar sesión y se cierran todas sus sesiones abiertas.
            </p>
          ) : (
            <p>
              <strong>{pending.user.email}</strong> podrá volver a iniciar sesión.
            </p>
          )}
        </ConfirmDialog>
      )}
    </section>
  )
}

export default SuperuserUsersPage
