import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../common/Icon'

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
          <Icon name="menu" size={22} />
        </button>
      </div>

      <Link to="/dashboard" className="navbar__brand">
        NEXPAY
      </Link>

      <div className="navbar__end">
        <button type="button" className="icon-btn" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
          <Icon name="logout" size={22} />
        </button>
      </div>
    </header>
  )
})

export default Navbar
