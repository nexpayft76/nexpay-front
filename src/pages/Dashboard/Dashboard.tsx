import { lazy, Suspense, useEffect, useState } from 'react'
import ErrorBoundary from '../../components/common/ErrorBoundary'
import QuoteCard from '../../components/quote/QuoteCard'
import TotalEstimate from '../../components/wallet/TotalEstimate'
import WalletCard from '../../components/wallet/WalletCard'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { usePreferences } from '../../contexts/PreferencesContext'
import type { CurrencyCode } from '../../types/currency'

// Recharts pesa bastante: se descarga solo al entrar al dashboard, no en la landing ni en el login.
const RateChart = lazy(() => import('../../components/chart/RateChart'))

/**
 * "Mi wallet": gráfico, billetera y cotizador. El encabezado y el menú los pone Layout.
 *
 * - `currency` es la moneda elegida. La comparten tres lugares y cambiarla en uno cambia los otros dos:
 *   el total estimado de arriba, el "Ver en" de la billetera y el "a" (DESTINO) del gráfico.
 * - `chartFrom` es la moneda de ORIGEN del gráfico (por defecto COP → USD).
 * Si origen y destino coinciden, se intercambian para no graficar "COP → COP".
 */
function Dashboard() {
	useDocumentTitle('Mi billetera')
	const { user } = useAuth()
	const { defaultCurrency, setDefaultCurrency } = usePreferences()
	const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency)
	const [chartFrom, setChartFrom] = useState<CurrencyCode>(() => (defaultCurrency === 'COP' ? 'USD' : 'COP'))

	useEffect(() => {
		setCurrency(defaultCurrency)
	}, [defaultCurrency])

	function changeCurrency(next: string) {
		const nextCurrency = next as CurrencyCode
		if (nextCurrency === chartFrom) setChartFrom(currency)
		setCurrency(nextCurrency)
		setDefaultCurrency(nextCurrency)
	}

	function changeChartFrom(next: string) {
		const nextCurrency = next as CurrencyCode
		if (nextCurrency === currency) setCurrency(chartFrom)
		setChartFrom(nextCurrency)
	}

	function swapChart() {
		setChartFrom(currency)
		setCurrency(chartFrom)
	}

	return (
		<section className="dashboard-content" aria-labelledby="dashboard-title">
			{/* Saludo a la izquierda y total estimado a la derecha (en celular, el total va debajo). */}
			<header className="dashboard-hero">
				<div>
					<p className="dashboard-eyebrow">Cuenta activa</p>
					<h1 id="dashboard-title">Hola, {user?.full_name}</h1>
					<p className="dashboard-hero__subtitle">Tu sesión está iniciada con {user?.email}.</p>
				</div>
				<TotalEstimate currency={currency} onCurrencyChange={changeCurrency} />
			</header>
			{/* Móvil y tablet: todo apilado. Desktop: gráfico a lo ancho; billetera y cotizador lado a lado. */}
			<div className="dashboard-grid dashboard-grid--split">
				<div className="dashboard-grid__full">
					{/* Si no se pudo descargar el gráfico, se avisa ahí mismo y el resto del dashboard sigue andando. */}
					<ErrorBoundary
						scope="gráfico"
						fallback={
							<div className="chart-loading chart-loading--error" role="alert">
								<p>No se pudo cargar el gráfico.</p>
								<button type="button" className="btn btn--ghost btn--sm" onClick={() => window.location.reload()}>
									Recargar
								</button>
							</div>
						}
					>
						<Suspense fallback={<div className="chart-loading" aria-busy="true" aria-label="Cargando gráfico" />}>
							<RateChart
								from={chartFrom}
								to={currency}
								onFromChange={changeChartFrom}
								onToChange={changeCurrency}
								onSwap={swapChart}
							/>
						</Suspense>
					</ErrorBoundary>
				</div>
				<WalletCard valuedIn={currency} onValuedInChange={changeCurrency} />
				{/* También está solo en el menú: /dashboard/cotizador. */}
				<QuoteCard />
			</div>
		</section>
	)
}

export default Dashboard
