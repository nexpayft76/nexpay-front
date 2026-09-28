import { useRateSources } from '../../hooks/useRateSources'
import type { RateProvider } from '../../types/rates'
import { formatPublishedDay, formatRelative, formatTime } from '../../utils/time'

const PROVIDER_INFO: Record<RateProvider['provider'], { name: string; what: string }> = {
  frankfurter: { name: 'Frankfurter', what: 'tasa oficial de bancos centrales' },
  dolarapi: { name: 'DolarApi', what: 'mercado cambiario argentino' },
}

/** De dónde sale cada tasa y qué tan reciente es: la base de la confianza en el cotizador. */
function RateSources() {
  const { providers, failed, now } = useRateSources()

  if (failed && !providers) {
    return <p className="rate-sources__error">No se pudo consultar el estado de las fuentes de tasas.</p>
  }
  if (!providers) return null

  const allFresh = !failed && providers.every((p) => !p.stale)
  return (
    <div className="rate-sources">
      <div className="rate-sources__header">
        <h3>Fuentes de las tasas</h3>
        <span className={`rate-sources__badge${allFresh ? '' : ' rate-sources__badge--stale'}`}>
          {allFresh ? '✓ Actualizadas' : '⚠ Sin conexión parcial'}
        </span>
      </div>

      <ul>
        {providers.map((provider) => {
          const info = PROVIDER_INFO[provider.provider]
          // Frankfurter publica solo la fecha (días hábiles); DolarApi, fecha y hora.
          const isDaily = /^\d{4}-\d{2}-\d{2}$/.test(provider.published_at)
          const published = isDaily
            ? `Tasa ${formatPublishedDay(provider.published_at, now)}`
            : `Actualizada ${formatTime(provider.published_at)} (${formatRelative(provider.published_at, now)})`

          return (
            <li key={provider.provider} className={provider.stale ? 'is-stale' : undefined}>
              <span className="rate-sources__dot" aria-hidden="true" />
              <div>
                <p className="rate-sources__name">
                  <strong>{info.name}</strong> · {info.what} · {provider.currencies.join(', ')}
                </p>
                <p className="rate-sources__detail">
                  {provider.stale
                    ? `Sin conexión: se usa la última tasa válida, consultada ${formatRelative(provider.fetched_at, now)}.`
                    : `${published} · consultada ${formatRelative(provider.fetched_at, now)}`}
                </p>
                {isDaily && !provider.stale && (
                  <p className="rate-sources__note">Publica una vez por día hábil (los fines de semana se mantiene la del viernes).</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default RateSources
