import { useState } from 'react'
import { Link } from 'react-router-dom'
import BackendStatus from '../../components/common/BackendStatus'
import { useAuth } from '../../hooks/useAuth'
import CorridorChart from './CorridorChart'
import CorridorQuote from './CorridorQuote'
import NexpayLogo from './NexpayLogo'
import './Landing.css'

const SECTION_LINKS = [
  { href: '#cotizador', label: 'Cotizador' },
  { href: '#problema', label: 'El problema' },
  { href: '#mercado-p2p', label: 'Mercado P2P' },
  { href: '#seguridad', label: 'Seguridad' },
]

const PROBLEMS = [
  {
    title: 'Dos conversiones, dos comisiones',
    text: 'No hay ruta directa de COP a ARS: el dinero pasa por dólares y cada banco cobra su parte.',
  },
  {
    title: 'Tres dólares, tres resultados',
    text: 'En Argentina conviven el dólar oficial, el MEP y el blue. Lo que llega cambia mucho según cuál se use.',
  },
  {
    title: 'El costo va escondido en la tasa',
    text: 'Nadie te dice cuánto perdiste: la comisión real está en el tipo de cambio que te aplican.',
  },
]

const SOLUTION = [
  {
    tag: 'A / Cotizador transparente',
    title: 'Sabés cuánto llega antes de enviar',
    text: '«Enviás 1.000.000 COP, reciben X ARS; frente al dólar oficial te ahorrás Y». Un solo vistazo, sin letra chica.',
  },
  {
    tag: 'B / Mercado P2P con propósito',
    title: 'Dos flujos opuestos, un cruce',
    text: 'El colombiano que necesita ARS se cruza con el argentino que tiene ARS y necesita COP. Fee pequeño, sin bancos de por medio.',
  },
  {
    tag: 'C / Vista de presupuesto',
    title: 'La familia envía, el estudiante ve el rendimiento',
    text: 'Quien envía en Colombia ve su monto en COP; quien recibe en Argentina ve cuánto le rinde hoy en ARS.',
  },
]

const SECURITY = [
  { title: 'Operaciones simuladas', text: 'Saldos de prueba: NexPay no procesa dinero real.' },
  { title: 'Tasas con fuente', text: 'Frankfurter y DolarAPI, con la hora de cada actualización a la vista.' },
  { title: 'Confirmación por email', text: 'Cada operación te llega con montos, tasa aplicada y fecha.' },
  { title: 'Asistente IA de solo lectura', text: 'Responde sobre tus saldos y tasas, pero nunca mueve dinero.' },
]

const FOOTER_CHIPS = [
  'Tasas en tiempo real',
  'Confirmación por email',
  'Historial 100% trazable',
  'Operaciones simuladas',
  'Asistente IA de solo lectura',
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
                aria-label={isMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
              />
              <label htmlFor="menu-launcher" aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}>
                <span className="menu-activator-line" />
                <span className="menu-activator-line" />
                <span className="menu-activator-line" />
              </label>
            </div>
            <Link to="/" className="brand" onClick={() => setIsMenuOpen(false)}>
              <NexpayLogo />
              NexPay
            </Link>
          </div>
          <nav className="landing-sections" aria-label="Secciones">
            {SECTION_LINKS.map((s) => (
              <a key={s.href} href={s.href}>
                {s.label}
              </a>
            ))}
          </nav>
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
          <p className="chip">Corredor Colombia ↔ Argentina · COP ↔ ARS</p>
          <h1>
            Cada envío esconde un costo.
            <br />
            <em className="gold-text">Nosotros lo mostramos.</em>
          </h1>
          <p className="hero__lead">
            Si estudiás o vivís en Argentina y tu familia te envía desde Colombia, tu dinero pasa por
            dólares, dos conversiones y dos comisiones, y en Argentina conviven el dólar oficial, el MEP
            y el blue. <strong>NexPay cruza tu envío directo con alguien que necesita hacer el camino
            contrario</strong>, con una sola tasa clara y un fee mínimo. Operaciones simuladas, sin dinero
            real.
          </p>
          <div className="hero__cta">
            <a href="#cotizador" className="btn-gold">
              Probar el cotizador
            </a>
            {!isLoading && !user && (
              <>
                <Link to="/register" className="btn-outline">
                  Crear cuenta gratis
                </Link>
                <Link to="/login" className="hero__login">
                  Ya tengo cuenta
                </Link>
              </>
            )}
          </div>
        </section>

        <section id="cotizador" className="band" aria-label="Cotizador">
          <div className="container container--narrow">
            <CorridorQuote />
          </div>
        </section>

        <section id="problema" className="band band--line" aria-labelledby="problem-title">
          <div className="container">
            <p className="eyebrow">01 / El problema</p>
            <h2 id="problem-title" className="display">
              Mandar pesos de Colombia a Argentina <em className="gold-text">no debería costar tanto.</em>
            </h2>
            <div className="columns">
              {PROBLEMS.map((p, i) => (
                <article key={p.title} className="column">
                  <p className="eyebrow">{String.fromCharCode(65 + i)} / Barrera</p>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="band band--line" aria-labelledby="features-title">
          <div className="container">
            <p className="eyebrow">02 / La solución</p>
            <h2 id="features-title" className="display">
              Puente <span className="gold-text">COP ↔ ARS</span>: un cruce, una tasa, cero rodeos.
            </h2>
            <div className="columns">
              {SOLUTION.map((s) => (
                <article key={s.title} className="column">
                  <p className="eyebrow">{s.tag}</p>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="mercado-p2p" className="band band--line" aria-labelledby="steps-title">
          <div className="container container--narrow">
            <p className="eyebrow eyebrow--center">03 / Mercado P2P</p>
            <h2 id="steps-title" className="display display--center">
              El puente funciona porque los dos lados se necesitan.
            </h2>
            <div className="p2p">
              <article className="p2p__side">
                <header className="p2p__person">
                  <span className="p2p__avatar">CO</span>
                  <div>
                    <p className="p2p__name">Camila · Bogotá</p>
                    <p className="mono-note">Mamá de un estudiante en Buenos Aires</p>
                  </div>
                </header>
                <h3>
                  Tiene <span className="gold-text">COP</span>
                </h3>
                <p>Quiere que su hijo reciba la mayor cantidad posible de pesos argentinos este mes, sin sorpresas.</p>
              </article>
              <div className="p2p__cross" aria-hidden="true">
                <span className="p2p__icon">⇄</span>
                <span className="mono-label">Cruce directo</span>
                <span className="chip chip--sm">fee 0,5%</span>
              </div>
              <article className="p2p__side">
                <header className="p2p__person">
                  <span className="p2p__avatar">AR</span>
                  <div>
                    <p className="p2p__name">Mateo · Buenos Aires</p>
                    <p className="mono-note">Freelancer que envía apoyo a Cali</p>
                  </div>
                </header>
                <h3>
                  Tiene <span className="gold-text">ARS</span>
                </h3>
                <p>Necesita pesos colombianos para su familia en Colombia, al mejor precio posible y sin bancos.</p>
              </article>
            </div>
            <p className="band__note">
              NexPay iguala las dos órdenes opuestas y liquida el cruce al instante. Si por momentos no hay
              contraparte, el asistente de IA simula una oferta dentro de un rango justo, así que en la demo
              nunca faltan cruces.
            </p>
          </div>
        </section>

        <section className="band band--line" aria-labelledby="budget-title">
          <div className="container split">
            <div>
              <p className="eyebrow">04 / Vista de presupuesto</p>
              <h2 id="budget-title" className="display">
                «¿Cuánto me rinde hoy lo que mamá envía?»
              </h2>
              <p className="band__text">
                El estudiante ve su presupuesto mensual en pesos argentinos con la tasa de este momento. Si
                el peso argentino se mueve durante el día (y se mueve mucho), NexPay lo muestra en vivo y
                puede avisarle por email cuando conviene recibir.
              </p>
              <ul className="bullets">
                <li>Presupuesto mensual en ARS con la tasa actual</li>
                <li>Alertas de tasas: «hoy el peso te favorece»</li>
                <li>Historial 100% trazable de cada envío recibido</li>
              </ul>
            </div>
            <CorridorChart />
          </div>
        </section>

        <section id="seguridad" className="band band--line" aria-labelledby="security-title">
          <div className="container">
            <p className="eyebrow">05 / Seguridad</p>
            <h2 id="security-title" className="display">
              Transparente por diseño, <em className="gold-text">simulado por elección.</em>
            </h2>
            <div className="columns columns--4">
              {SECURITY.map((s) => (
                <article key={s.title} className="column">
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="band band--line final-cta" aria-labelledby="cta-title">
          <div className="container container--narrow">
            <h2 id="cta-title" className="display display--center">
              Tu primer envío simulado está a un clic. <em className="gold-text">Probalo hoy.</em>
            </h2>
            <p className="band__note">
              NexPay es un entorno 100% simulado: saldos de prueba, sin dinero real. Ideal para conocer el
              flujo completo antes de operar de verdad.
            </p>
            {!isLoading &&
              (user ? (
                <Link to="/dashboard" className="btn-outline">
                  Ir a mi dashboard
                </Link>
              ) : (
                <Link to="/register" className="btn-outline">
                  Crear mi cuenta
                </Link>
              ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container">
          <ul className="footer-chips">
            {FOOTER_CHIPS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="landing-footer__inner">
            <div>
              <p className="brand">
                <NexpayLogo size={24} />
                NexPay
              </p>
              <p className="landing-footer__muted">
                Nelson Arzuza · William Coral · Tamara Castronuovo · Raul Carmona
              </p>
              <p className="landing-footer__muted">nexpay.team@gmail.com</p>
            </div>
            <BackendStatus />
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
