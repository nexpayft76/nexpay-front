import { lazy, Suspense, useState } from 'react'
import QuoteCard from '../../components/quote/QuoteCard'
import BalanceSummary from '../../components/wallet/BalanceSummary'
import WalletCard from '../../components/wallet/WalletCard'
import { useAuth } from '../../hooks/useAuth'

// Recharts pesa bastante: se descarga solo al entrar al dashboard, no en la landing ni en el login.
const RateChart = lazy(() => import('../../components/chart/RateChart'))

/**
 * "Mi wallet": gráfico, billetera y cotizador. El encabezado y el menú los pone Layout.
 *
 * - `currency` es la moneda elegida: la cambian el "a" del gráfico o el "Ver total en" de la billetera,
 *   y los dos quedan sincronizados. En el gráfico es la moneda de DESTINO.
 * - `chartFrom` es la moneda de ORIGEN del gráfico (por defecto COP → USD).
 * Si origen y destino coinciden, se intercambian para no graficar "COP → COP".
 */
function Dashboard() {
	const { user } = useAuth()
	const [currency, setCurrency] = useState('USD')
	const [chartFrom, setChartFrom] = useState('COP')

	function changeCurrency(next: string) {
		if (next === chartFrom) setChartFrom(currency)
		setCurrency(next)
	}

	function changeChartFrom(next: string) {
		if (next === currency) setCurrency(chartFrom)
		setChartFrom(next)
	}

	function swapChart() {
		setChartFrom(currency)
		setCurrency(chartFrom)
	}

	return (
		<section className="dashboard-content" aria-labelledby="dashboard-title">
			{/* Saludo a la izquierda y saldo total a la derecha (en celular, el saldo va debajo). */}
			<header className="dashboard-hero">
				<div>
					<p className="dashboard-eyebrow">Cuenta activa</p>
					<h1 id="dashboard-title">Hola, {user?.full_name}</h1>
					<p className="dashboard-hero__subtitle">Tu sesión está iniciada con {user?.email}.</p>
				</div>
				<BalanceSummary />
			</header>
			{/* Móvil y tablet: todo apilado. Desktop: gráfico a lo ancho; billetera y cotizador lado a lado. */}
			<div className="dashboard-grid dashboard-grid--split">
				<div className="dashboard-grid__full">
					<Suspense fallback={<div className="chart-loading" aria-busy="true" aria-label="Cargando gráfico" />}>
						<RateChart
							from={chartFrom}
							to={currency}
							onFromChange={changeChartFrom}
							onToChange={changeCurrency}
							onSwap={swapChart}
						/>
					</Suspense>
				</div>
				<WalletCard valuedIn={currency} onValuedInChange={changeCurrency} />
				{/* También está solo en el menú: /dashboard/cotizador. */}
				<QuoteCard />
			</div>
		</section>
	)
}

export default Dashboard
