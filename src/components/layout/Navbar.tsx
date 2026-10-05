import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../common/Icon'
import NexpayLogo from '../common/NexpayLogo'
import ThemeToggle from '../common/ThemeToggle'
import NotificationBell from '../notifications/NotificationBell'

interface NavbarProps {
  isMenuOpen: boolean
  onToggleMenu: () => void
  onLogout: () => void
}

/** Barra superior: hamburguesa a la izquierda, logo centrado, cerrar sesión a la derecha. */
const Navbar = forwardRef<HTMLButtonElement, NavbarProps>(function Navbar(
  { isMenuOpen, onToggleMenu, onLogout },
  menuButtonRef,
) {
  return (
    <header className="navbar">
      <div className="navbar__start">
        <button
          ref={menuButtonRef}
          type="button"
          className="icon-btn"
          onClick={onToggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="app-sidebar"
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          <span className="navbar__menu-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <Link to="/" className="navbar__brand">
        <NexpayLogo size={28} />
        <span className="navbar__brand-text">NEXPAY</span>
      </Link>

      <div className="navbar__end">
        <ThemeToggle />
        <NotificationBell />
        <button type="button" className="icon-btn navbar__logout" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
          <Icon name="logout" size={22} />
        </button>
      </div>
    </header>
  )
})

export default Navbar
