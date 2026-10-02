import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { AlertsProvider } from '../../contexts/AlertsContext'
import { PreferencesProvider } from '../../contexts/PreferencesContext'
import NotificationToast from '../notifications/NotificationToast'
import './Layout.css'

/** Mismo valor que el breakpoint de Layout.css. */
const DESKTOP_QUERY = '(min-width: 1024px)'

/** Estructura de las pantallas con sesión: barra superior + menú lateral + contenido. */
function Layout() {
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  // Estados separados: en desktop el menú arranca contraído; en móvil, cerrado.
  const [desktopExpanded, setDesktopExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isOpen = isDesktop ? desktopExpanded : mobileOpen

  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const closeMobile = () => {
    setMobileOpen(false)
    menuButtonRef.current?.focus()
  }

  const toggleMenu = () => {
    if (isDesktop) setDesktopExpanded((open) => !open)
    else setMobileOpen((open) => !open)
  }

  // Panel móvil abierto: foco en "cerrar", Esc para cerrar y sin scroll de fondo.
  const mobilePanelOpen = !isDesktop && mobileOpen

  // Al cambiar de pantalla, arriba de todo. Se hace en el próximo cuadro (no en medio del render, que
  // obligaría al navegador a calcular el diseño dos veces) y solo si la página no está ya arriba.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (window.scrollY > 0) window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  useEffect(() => {
    if (!mobilePanelOpen) return
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [mobilePanelOpen])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <PreferencesProvider>
      <AlertsProvider>
        <div className={`app-shell${isDesktop && !desktopExpanded ? ' app-shell--collapsed' : ''}`}>
          <NotificationToast />
          <Navbar ref={menuButtonRef} isMenuOpen={isOpen} onToggleMenu={toggleMenu} onLogout={handleLogout} />
          <Sidebar
            ref={closeButtonRef}
            isOpen={isOpen}
            isDesktop={isDesktop}
            onClose={closeMobile}
            onNavigate={() => {
              if (!isDesktop) closeMobile()
            }}
            onLogout={handleLogout}
            onExpandSidebar={() => setDesktopExpanded(true)}
          />
          <main className="app-shell__main">
            <Suspense fallback={<p className="app-shell__loading" aria-busy="true">Cargando…</p>}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </AlertsProvider>
    </PreferencesProvider>
  )
}

export default Layout
