import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import BackendStatus from '../../components/common/BackendStatus'
import ThemeToggle from '../../components/common/ThemeToggle'
import NexpayLogo from '../../components/common/NexpayLogo'
import { useAuth } from '../../hooks/useAuth'
import CurrencyQuote from './CurrencyQuote'
import RateChart from './RateChart'
import WalletPreview from './WalletPreview'
import './Landing.css'

// El chat se descarga aparte, después de la landing: no suma peso a la primera carga.
const AssistantWidget = lazy(() => import('../../components/assistant/AssistantWidget'))

const SECTION_LINKS = [
  { href: '#billetera', label: 'Billetera' },
  { href: '#cotizador', label: 'Cotizador' },
  { href: '#mercado-p2p', label: 'Nuestro diferencial' },
  { href: '#seguridad', label: 'Seguridad' },
]

const PROBLEMS = [
  {
    title: 'Tasas que no se ven',
    text: 'Casi nunca te muestran la tasa real antes de confirmar: el costo va escondido en el tipo de cambio.',
  },
  {
    title: 'Conversiones de más',
    text: 'Entre monedas sin ruta directa, como COP y ARS, el dinero pasa por dólares: dos conversiones en lugar de una.',
  },
  {
    title: 'Tres dólares en Argentina',
    text: 'Conviven el dólar oficial, el MEP y el blue. Lo que recibes cambia mucho según cuál se use.',
  },
]

const SOLUTION = [
  {
    tag: 'A / Billetera multimoneda',
    title: 'Un saldo por moneda',
    text: 'USD, EUR, COP y ARS en una sola billetera, con el total valorizado en la moneda que elijas.',
  },
  {
    tag: 'B / Compra, venta e intercambio',
    title: 'Cualquier par, un solo paso',
    text: 'Compra, vende o intercambia entre las 4 monedas: 12 combinaciones, con la tasa visible antes de confirmar.',
  },
  {
    tag: 'C / Cotizador transparente',
    title: 'Sabes cuánto recibes antes de operar',
    text: '«Tienes 1.000.000 COP y recibes X ARS; con el dólar oficial serían Y». Un solo vistazo, sin letra pequeña.',
  },
  {
    tag: 'D / Nuestro diferencial',
    title: 'Puente directo COP ↔ ARS',
    text: 'El colombiano que necesita ARS se cruza con el argentino que necesita COP, sin pasar por dólares ni bancos.',
  },
]

const SECURITY = [
  { title: 'Operaciones simuladas', text: 'Saldos de prueba: NexPay no procesa dinero real.' },
  { title: 'Tasas con fuente', text: 'Frankfurter y DolarAPI, con la hora de cada actualización a la vista.' },
  { title: 'Confirmación por email', text: 'Cada operación te llega con montos, tasa aplicada y fecha.' },
  { title: 'Asistente IA de solo lectura', text: 'Responde sobre tus saldos y tasas, pero nunca mueve dinero.' },
]

const FOOTER_CHIPS = [
  '4 monedas · 12 pares',
  'Tasas en tiempo real',
  'Confirmación por email',
  'Historial 100% trazable',
  'Operaciones simuladas',
  'Asistente IA de solo lectura',
]

function Landing() {
  const { user, isLoading, logout } = useAuth()

  function goToLandingTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  async function handleLogout() {
    await logout()
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="container landing-header__inner">
          <div className="landing-header__brand">
            <Link to="/" className="brand" onClick={goToLandingTop}>
              <NexpayLogo />
              <span className="landing-header__wordmark">NexPay</span>
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
            <ThemeToggle />
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
      </header>

      <main>
        <section className="hero container">
          <p className="chip">Billetera multimoneda · USD · EUR · COP · ARS</p>
          <h1>
            Cada cambio de moneda esconde un costo.
            <br />
            <em className="gold-text">Nosotros lo mostramos.</em>
          </h1>
          <p className="hero__lead">
            NexPay es tu billetera en dólares, euros, pesos colombianos y pesos argentinos: compras,
            vendes e intercambias entre las 4 monedas viendo la tasa real antes de confirmar. Y si vives
            entre Colombia y Argentina, tienes algo más: <strong>un puente directo COP ↔ ARS que te cruza
            con alguien que necesita hacer el camino contrario</strong>, sin pasar por dólares. Operaciones
            simuladas, sin dinero real.
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

        <section id="billetera" className="band band--line" aria-labelledby="wallet-title">
          <div className="container split">
            <div>
              <p className="eyebrow">Tu billetera</p>
              <h2 id="wallet-title" className="display">
                Cuatro monedas, <em className="gold-text">un solo lugar.</em>
              </h2>
              <p className="band__text">
                Un saldo independiente para cada moneda y el total de tu billetera en la que prefieras,
                valorizado con las tasas del momento. Cambia la moneda del total y mira cómo se recalcula.
              </p>
              <ul className="bullets">
                <li>Saldos en USD, EUR, COP y ARS</li>
                <li>Total valorizado con tasas en vivo</li>
                <li>Compra, venta e intercambio entre cualquier par</li>
              </ul>
            </div>
            <WalletPreview />
          </div>
        </section>

        <section id="cotizador" className="band band--line" aria-label="Cotizador">
          <div className="container container--narrow">
            <CurrencyQuote />
          </div>
        </section>

        <section id="problema" className="band band--line" aria-labelledby="problem-title">
          <div className="container">
            <p className="eyebrow">01 / El problema</p>
            <h2 id="problem-title" className="display">
              Cambiar de moneda no debería ser <em className="gold-text">un misterio.</em>
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
              Una billetera para <span className="gold-text">4 monedas</span>, con un puente que nadie más tiene.
            </h2>
            <div className="columns columns--4">
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
            <p className="eyebrow eyebrow--center">03 / Nuestro diferencial · Mercado P2P</p>
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
                <span className="chip chip--sm">sin pasar por USD</span>
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
            <RateChart />
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
              Tu primer envío simulado está a un clic. <em className="gold-text">Pruébalo hoy.</em>
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

      {/* Nexa también en la landing: tasas del día, qué es NexPay, cómo crear cuenta o iniciar sesión. */}
      <Suspense fallback={null}>
        <AssistantWidget />
      </Suspense>
    </div>
  )
}

export default Landing
