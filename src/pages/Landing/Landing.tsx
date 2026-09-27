import { useState } from 'react'
import { Link } from 'react-router-dom'
import BackendStatus from '../../components/common/BackendStatus'
import { formatCurrency } from '../../utils/formatCurrency'
import { useAuth } from '../../hooks/useAuth'
import './Landing.css'

const FEATURES = [
  {
    title: 'Multimoneda',
    text: 'Un balance independiente para USD, EUR, ARS y COP dentro de una sola wallet.',
  },
  {
    title: 'Compra y venta',
    text: 'Comprá o vendé divisas al tipo de cambio vigente, viendo la tasa antes de confirmar.',
  },
  {
    title: 'Intercambio directo',
    text: 'Convertí entre dos de tus balances en un solo paso, por ejemplo de EUR a COP.',
  },
  {
    title: 'Historial completo',
    text: 'Todas tus operaciones con filtros por fecha, tipo y moneda.',
  },
  {
    title: 'Confirmación por email',
    text: 'Cada operación te llega con el detalle: montos, monedas, tasa aplicada y fecha.',
  },
  {
    title: 'Asistente con IA',
    text: 'Preguntá por tus saldos, tus últimos movimientos o cuánto recibirías en otra moneda.',
  },
]

const STEPS = [
  { title: 'Creá tu cuenta', text: 'Registrate con tu nombre, email y contraseña.' },
  { title: 'Consultá las tasas', text: 'Tasas actualizadas de fuentes oficiales, visibles antes de operar.' },
  { title: 'Operá', text: 'Comprá, vendé o intercambiá divisas con saldos de prueba.' },
]

// Montos ilustrativos para la tarjeta del hero (no son datos reales).
const SAMPLE_BALANCES = [
  { currency: 'USD', name: 'Dólar estadounidense', amount: 1250.5 },
  { currency: 'EUR', name: 'Euro', amount: 830 },
  { currency: 'ARS', name: 'Peso argentino', amount: 452300 },
  { currency: 'COP', name: 'Peso colombiano', amount: 2180000 },
]

function Landing() {
  const { user, isLoading, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  async function handleLogout() {
    await logout()
    setIsMenuOpen(false)
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="container landing-header__inner">
          <div className="landing-header__brand">
            <div className="menu-activator">
              <input
                type="checkbox"
                id="menu-launcher"
                checked={isMenuOpen}
                onChange={(event) => setIsMenuOpen(event.target.checked)}
                aria-label="Abrir menú de navegación"
              />
              <label htmlFor="menu-launcher" aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}>
                <span className="menu-activator-line" />
                <span className="menu-activator-line" />
                <span className="menu-activator-line" />
              </label>
            </div>
            <Link to="/" className="brand" onClick={() => setIsMenuOpen(false)}>
              NexPay
            </Link>
          </div>
          <nav className="landing-header__actions" aria-label="Cuenta">
            {isLoading ? null : user ? (
              <>
                <Link to="/dashboard" className="btn btn--ghost">Mi dashboard</Link>
                <button
                  type="button"
                  className="btn btn--primary btn--icon"
                  onClick={handleLogout}
                  aria-label="Cerrar sesión"
                  title="Cerrar sesión"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" />
                    <path d="m15 8 4 4-4 4" />
                    <path d="M9 12h10" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn--ghost">Iniciar sesión</Link>
                <Link to="/register" className="btn btn--primary">Crear cuenta</Link>
              </>
            )}
          </nav>
        </div>
        {isMenuOpen && (
          <nav className="landing-menu container" aria-label="Navegación principal">
            <Link to="/" onClick={() => setIsMenuOpen(false)}>Inicio</Link>
            <a href="#features-title" onClick={() => setIsMenuOpen(false)}>Funcionalidades</a>
            <a href="#steps-title" onClick={() => setIsMenuOpen(false)}>Cómo funciona</a>
            {!isLoading && user && (
              <button type="button" className="landing-menu__logout" onClick={handleLogout}>
                Cerrar sesión
              </button>
            )}
          </nav>
        )}
      </header>

      <main>
        <section className="hero container">
          <div className="hero__copy">
            <h1>Tus divisas, claras y en un solo lugar.</h1>
            <p className="hero__lead">
              NexPay es una billetera digital multimoneda para consultar balances, comprar, vender e
              intercambiar divisas con tasas transparentes y un historial claro de cada movimiento.
            </p>
            {!isLoading && !user && (
              <div className="hero__cta">
                <Link to="/register" className="btn btn--primary btn--lg">
                  Crear cuenta gratis
                </Link>
                <Link to="/login" className="btn btn--ghost btn--lg">
                  Ya tengo cuenta
                </Link>
              </div>
            )}
          </div>

          <aside className="wallet-preview" aria-label="Ejemplo de wallet">
            <p className="wallet-preview__label">Ejemplo de wallet</p>
            <ul className="wallet-preview__list">
              {SAMPLE_BALANCES.map((b) => (
                <li key={b.currency} className="wallet-preview__row">
                  <span className="wallet-preview__code">{b.currency}</span>
                  <span className="wallet-preview__name">{b.name}</span>
                  <span className="wallet-preview__amount">{formatCurrency(b.amount, b.currency)}</span>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="section container" aria-labelledby="features-title">
          <h2 id="features-title">Todo lo que necesitás para manejar divisas</h2>
          <div className="features">
            {FEATURES.map((f) => (
              <article key={f.title} className="feature">
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section container" aria-labelledby="steps-title">
          <h2 id="steps-title">Cómo funciona</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step__number">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="container">
          <p className="notice">
            <strong>Proyecto académico.</strong> Todas las operaciones son simuladas con saldos de
            prueba: NexPay no procesa dinero real.
          </p>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container landing-footer__inner">
          <div>
            <p className="brand">NexPay</p>
            <p className="landing-footer__muted">
              Nelson Arzuza · William Coral · Tamara Castronuovo · Raul Carmona
            </p>
            <p className="landing-footer__muted">nexpay.team@gmail.com</p>
          </div>
          <BackendStatus />
        </div>
      </footer>
    </div>
  )
}

export default Landing
