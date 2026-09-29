import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthProvider'
import { ApiError } from './services/api'
import { logger } from './utils/logger'

// Errores que se escapan de todo (un error de JavaScript o una promesa sin catch): se registran.
window.addEventListener('error', (event) => {
  logger.error('app', event.message || 'Error de JavaScript', {
    unexpected: true,
    source: event.filename ? `${event.filename}:${event.lineno}` : undefined,
  })
})
window.addEventListener('unhandledrejection', (event) => {
  const reason: unknown = event.reason
  // Un error de la API ya quedó registrado (api.ts) y la pantalla lo muestra: no se repite en la consola.
  if (reason instanceof ApiError) {
    event.preventDefault()
    return
  }
  logger.error('app', reason instanceof Error ? reason.message : 'Promesa rechazada sin manejar', { unexpected: true })
})

// Después de un deploy, una pestaña abierta puede pedir un archivo JS que ya no existe (ej. el del gráfico).
// En lugar de dejar la pantalla rota con un error de assets, se recarga una vez para bajar la versión nueva.
// Si vuelve a fallar enseguida (ej. sin conexión), no recarga en bucle: deja que se vea el error.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'nexpay_reloaded_after_deploy_at'
  try {
    const last = Number(sessionStorage.getItem(key) ?? 0)
    if (Date.now() - last < 60_000) return
    sessionStorage.setItem(key, String(Date.now()))
  } catch {
    return
  }
  logger.warn('app', 'Archivo de una versión anterior: se recarga la página', { error: String(event.payload) })
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
