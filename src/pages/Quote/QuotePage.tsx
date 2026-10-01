import QuoteCard from '../../components/quote/QuoteCard'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

/** Pantalla "Cotizador" del menú lateral: solo el cotizador. */
function QuotePage() {
  useDocumentTitle('Cotizador')
  return (
    <section className="dashboard-content" aria-labelledby="quote-page-title">
      <p className="dashboard-eyebrow">Cotizador</p>
      <h1 id="quote-page-title">¿Cuánto recibirías?</h1>
      <p>Cotiza entre pesos colombianos, pesos argentinos, dólares y euros. No mueve tu saldo.</p>
      <div className="dashboard-grid">
        <QuoteCard />
      </div>
    </section>
  )
}

export default QuotePage
