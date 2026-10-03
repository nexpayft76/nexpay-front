import { forwardRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Icon, { type IconName } from '../common/Icon'

interface MenuLink {
  to: string
  label: string
  icon: IconName
  /** Todavía no construida: abre la pantalla "Próximamente". */
  soon?: boolean
}

/** Ítem con submenú (ej. Operaciones → Compra). Se abre solo si estás en una de sus pantallas. */
interface MenuGroup {
  label: string
  icon: IconName
  basePath: string
  children: MenuLink[]
}

type MenuItem = MenuLink | MenuGroup

const MENU: MenuItem[] = [
  { to: '/dashboard', label: 'Mi wallet', icon: 'wallet' },
  { to: '/dashboard/cotizador', label: 'Cotizador', icon: 'calculator' },
  {
    label: 'Operaciones',
    icon: 'transactions',
    basePath: '/dashboard/operaciones',
    // Más adelante: Venta, Intercambio e Historial.
    children: [
      { to: '/dashboard/operaciones/recarga', label: 'Recarga', icon: 'plus' },
      { to: '/dashboard/operaciones/compra', label: 'Compra', icon: 'cart' },
    ],
  },
  { to: '/dashboard/p2p', label: 'P2P', icon: 'p2p', soon: true },
  {
    label: 'Configuración',
    icon: 'settings',
    basePath: '/dashboard/configuracion',
    children: [
      { to: '/dashboard/configuracion/alertas', label: 'Alertas', icon: 'bell' },
      { to: '/dashboard/configuracion/preferencias', label: 'Preferencias', icon: 'settings' },
      { to: '/dashboard/configuracion/usuario', label: 'Usuario', icon: 'user' },
    ],
  },
]

function isGroup(item: MenuItem): item is MenuGroup {
  return 'children' in item
}

interface SidebarProps {
  isOpen: boolean
  isDesktop: boolean
  onClose: () => void
  onNavigate: () => void
  onLogout: () => void
  onExpandSidebar: () => void
}

/**
 * Menú lateral.
 * - Móvil: panel que se superpone al contenido (cerrado por defecto).
 * - Desktop: columna fija; cerrado = solo íconos, abierto = íconos + texto.
 */
const Sidebar = forwardRef<HTMLButtonElement, SidebarProps>(function Sidebar(
  { isOpen, isDesktop, onClose, onNavigate, onLogout, onExpandSidebar },
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
            {MENU.map((item) =>
              isGroup(item) ? (
                <SidebarGroup
                  key={item.basePath}
                  group={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  onExpandSidebar={onExpandSidebar}
                />
              ) : (
                <li key={item.to}>
                  <SidebarLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
                </li>
              ),
            )}
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

interface SidebarLinkProps {
  item: MenuLink
  collapsed: boolean
  onNavigate: () => void
  nested?: boolean
}

function SidebarLink({ item, collapsed, onNavigate, nested = false }: SidebarLinkProps) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      className={({ isActive }) =>
        `sidebar__link${nested ? ' sidebar__link--nested' : ''}${isActive ? ' sidebar__link--active' : ''}`
      }
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
    >
      <Icon name={item.icon} />
      <span className="sidebar__label">{item.label}</span>
      {item.soon && <span className="sidebar__soon">Pronto</span>}
    </NavLink>
  )
}

interface SidebarGroupProps {
  group: MenuGroup
  collapsed: boolean
  onNavigate: () => void
  onExpandSidebar: () => void
}

function SidebarGroup({ group, collapsed, onNavigate, onExpandSidebar }: SidebarGroupProps) {
  const { pathname } = useLocation()
  const inside = pathname.startsWith(group.basePath)
  // null = automático (abierto si estás en una de sus pantallas); true/false = lo eligió el usuario.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const expanded = collapsed ? manualOpen === true : (manualOpen ?? inside)
  const listId = `submenu-${group.basePath.replaceAll('/', '-')}`

  // Menú plegado: el grupo expande la barra y deja abiertas sus opciones.
  if (collapsed) {
    return (
      <li className="sidebar__group-item">
        <button
          type="button"
          className="sidebar__link sidebar__group"
          aria-expanded={false}
          aria-controls={listId}
          aria-label={group.label}
          title={group.label}
          onClick={() => {
            setManualOpen(true)
            onExpandSidebar()
          }}
        >
          <Icon name={group.icon} />
        </button>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        className={`sidebar__link sidebar__group${inside ? ' sidebar__link--active' : ''}`}
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setManualOpen(!expanded)}
      >
        <Icon name={group.icon} />
        <span className="sidebar__label">{group.label}</span>
        <span className={`sidebar__chevron${expanded ? ' sidebar__chevron--open' : ''}`}>
          <Icon name="chevron" size={16} />
        </span>
      </button>
      {expanded && (
        <ul id={listId} className="sidebar__submenu">
          {group.children.map((child) => (
            <li key={child.to}>
              <SidebarLink item={child} collapsed={false} onNavigate={onNavigate} nested />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export default Sidebar
