import { useBackendHealth } from '../../hooks/useBackendHealth'

function BackendStatus() {
  const health = useBackendHealth()

  if (health.status === 'loading') {
    return <p className="backend-status">Conectando con el servidor…</p>
  }

  if (health.status === 'error') {
    return (
      <p className="backend-status backend-status--error" role="alert">
        {health.message}{' '}
        <button type="button" onClick={health.retry}>
          Reintentar
        </button>
      </p>
    )
  }

  const dbOk = health.data.database === 'connected'
  return (
    <p className={`backend-status ${dbOk ? 'backend-status--ok' : 'backend-status--error'}`}>
      {dbOk ? 'Servidor conectado' : 'Servidor activo, base de datos no disponible'}
    </p>
  )
}

export default BackendStatus
