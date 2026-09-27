import { forwardRef } from 'react'
import { NavLink } from 'react-router-dom'
import Icon, { type IconName } from '../common/Icon'

interface MenuItem {
  to: string
  label: string
  icon: IconName
  /** Todavía no construida: abre la pantalla "Próximamente". */
  soon?: boolean
}

const MENU: MenuItem[] = [
  { to: '/dashboard', label: 'Mi wallet', icon: 'wallet' },
  { to: '/dashboard/cotizador', label: 'Cotizador', icon: 'calculator' },
  { to: '/dashboard/transacciones', label: 'Mis transacciones', icon: 'transactions', soon: true },
  { to: '/dashboard/p2p', label: 'P2P', icon: 'p2p', soon: true },
  { to: '/dashboard/configuracion', label: 'Configuración', icon: 'settings', soon: true },
  { to: '/dashboard/usuario', label: 'Usuario', icon: 'user', soon: true },
]

interface SidebarProps {
  isOpen: boolean
  isDesktop: boolean
  onClose: () => void
  onNavigate: () => void
  onLogout: () => void
}

/**
 * Menú lateral.
 * - Móvil: panel que se superpone al contenido (cerrado por defecto).
 * - Desktop: columna fija; cerrado = solo íconos, abierto = íconos + texto.
 */
const Sidebar = forwardRef<HTMLButtonElement, SidebarProps>(function Sidebar(
  { isOpen, isDesktop, onClose, onNavigate, onLogout },
  closeButtonRef,
) {
  const collapsed = isDesktop && !isOpen

  return (
    <>
      {!isDesktop && isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}

      <aside
        id="app-sidebar"
        className={`sidebar${isOpen ? ' sidebar--open' : ''}${collapsed ? ' sidebar--collapsed' : ''}`}
        // En móvil, cerrado = fuera de pantalla: `inert` evita que el teclado o el lector de pantalla entren.
        inert={!isDesktop && !isOpen}
      >
        {!isDesktop && (
          <div className="sidebar__header">
            <span className="sidebar__title">Menú</span>
            <button ref={closeButtonRef} type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar menú">
              <Icon name="close" size={22} />
            </button>
          </div>
        )}

        <nav aria-label="Menú principal" className="sidebar__nav">
          <ul>
            {MENU.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                >
                  <Icon name={item.icon} />
                  <span className="sidebar__label">{item.label}</span>
                  {item.soon && <span className="sidebar__soon">Pronto</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="sidebar__link sidebar__logout"
          onClick={onLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          aria-label={collapsed ? 'Cerrar sesión' : undefined}
        >
          <Icon name="logout" />
          <span className="sidebar__label">Cerrar sesión</span>
        </button>
      </aside>
    </>
  )
})

export default Sidebar
