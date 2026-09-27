import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import RatesPanel from '../../components/rates/RatesPanel'

function Dashboard() {
	const { user, logout } = useAuth()
	const navigate = useNavigate()

	async function handleLogout() {
		await logout()
		navigate('/', { replace: true })
	}

	return (
		<main className="dashboard-page">
			<header className="dashboard-header">
				<Link to="/" className="brand">NexPay</Link>
				<button type="button" className="btn btn--ghost" onClick={handleLogout}>Cerrar sesión</button>
			</header>
			<section className="dashboard-content" aria-labelledby="dashboard-title">
				<p className="dashboard-eyebrow">Cuenta activa</p>
				<h1 id="dashboard-title">Hola, {user?.full_name}</h1>
				<p>Tu sesión está iniciada con {user?.email}.</p>
				<div className="dashboard-placeholder">
					<h2>Tu wallet está lista</h2>
					<p>Próximamente vas a poder consultar tus balances y movimientos desde acá.</p>
				</div>
				<RatesPanel />
			</section>
		</main>
	)
}

export default Dashboard
