import { useState } from 'react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import '../Operations/Operations.css'
import './P2P.css'
import P2PBalances from './P2PBalances'
import P2PMarket from './P2PMarket'
import P2PMyOffers from './P2PMyOffers'
import P2PPublish from './P2PPublish'

type Tab = 'market' | 'publish' | 'mine'

const TABS: { id: Tab; label: string }[] = [
  { id: 'market', label: 'Mercado' },
  { id: 'publish', label: 'Publicar' },
  { id: 'mine', label: 'Mis ofertas' },
]

/** P2P: vende tus monedas a otros usuarios a la tasa que elijas (±10% del mercado). */
function P2PPage() {
  useDocumentTitle('P2P')
  const [tab, setTab] = useState<Tab>('market')
  // Cambiar la key recarga los saldos de arriba después de mover dinero.
  const [walletVersion, setWalletVersion] = useState(0)
  const refreshWallet = () => setWalletVersion((n) => n + 1)

  return (
    <section className="dashboard-content" aria-labelledby="p2p-title">
      <p className="dashboard-eyebrow">Entre usuarios</p>
      <h1 id="p2p-title">Mercado P2P</h1>
      <p>
        Vende tus monedas a otros usuarios a la tasa que elijas, o acepta la oferta de alguien más. El dinero de cada oferta
        queda retenido en garantía y el cambio es instantáneo.
      </p>

      <P2PBalances key={walletVersion} />

      <div className="op-segmented p2p-tabs" role="tablist" aria-label="Secciones del P2P">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`p2p-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="p2p-panel"
            className={`op-segmented__option${tab === t.id ? ' op-segmented__option--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="p2p-panel" role="tabpanel" aria-labelledby={`p2p-tab-${tab}`} className={`p2p-panel p2p-panel--${tab}`}>
        {tab === 'market' && <P2PMarket onAccepted={refreshWallet} />}
        {tab === 'publish' && (
          <P2PPublish
            onPublished={() => {
              refreshWallet()
              setTab('mine')
            }}
          />
        )}
        {tab === 'mine' && <P2PMyOffers onChanged={refreshWallet} />}
      </div>
    </section>
  )
}

export default P2PPage
