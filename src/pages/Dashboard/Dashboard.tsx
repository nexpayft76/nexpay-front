import QuoteCard from '../../components/quote/QuoteCard'
import WalletCard from '../../components/wallet/WalletCard'
import { useAuth } from '../../hooks/useAuth'

/** "Mi wallet": el encabezado y el menú los pone Layout. */
function Dashboard() {
	const { user } = useAuth()

	return (
		<section className="dashboard-content" aria-labelledby="dashboard-title">
			<p className="dashboard-eyebrow">Cuenta activa</p>
			<h1 id="dashboard-title">Hola, {user?.full_name}</h1>
			<p>Tu sesión está iniciada con {user?.email}.</p>
			<div className="dashboard-grid">
				<WalletCard />
				<QuoteCard />
			</div>
		</section>
	)
}

export default Dashboard
