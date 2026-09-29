import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthProvider'

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
