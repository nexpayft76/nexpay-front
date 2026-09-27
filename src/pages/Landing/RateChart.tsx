import { useEffect, useId, useState } from 'react'
import { getRateHistory, type RateHistory } from '../../services/conversion.service'
import type { CurrencyCode } from '../../types/currency'
import { formatAmount, formatDateTime } from './format'

const W = 560
const H = 300
const PAD = { top: 24, right: 16, bottom: 32, left: 16 }

// Pares que se pueden ver en el gráfico; el primero es el del corredor.
const PAIRS: Array<[CurrencyCode, CurrencyCode]> = [
  ['COP', 'ARS'],
  ['USD', 'COP'],
  ['USD', 'ARS'],
  ['EUR', 'USD'],
]
// Monto de ejemplo por moneda de origen, para que el valor sea legible.
const SAMPLE: Record<CurrencyCode, number> = { COP: 1_000_000, ARS: 100_000, USD: 100, EUR: 100 }

type Result = { key: string } & ({ status: 'ok'; data: RateHistory } | { status: 'error' })

/** Cuánto rinde un monto de ejemplo en otra moneda durante los últimos 30 días. */
function RateChart() {
  const [pair, setPair] = useState(PAIRS[0])
  const [result, setResult] = useState<Result | null>(null)
  const gradientId = useId()
  const [from, to] = pair
  const key = `${from}-${to}`

  useEffect(() => {
    let cancelled = false
    getRateHistory(from, to, '1m')
      .then((data) => !cancelled && setResult({ key, status: 'ok', data }))
      .catch(() => !cancelled && setResult({ key, status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [from, to, key])

  const current = result?.key === key ? result : null
  const series =
    current?.status === 'ok' ? (current.data.series.find((s) => s.key === 'mep') ?? current.data.series[0]) : undefined
  const sample = SAMPLE[from]
  const points = series?.points.map((p) => ({ date: p.date, value: p.value * sample })) ?? []
  const withArs = from === 'ARS' || to === 'ARS'

  const pairChips = (
    <div className="chart__pairs" role="group" aria-label="Par de monedas">
      {PAIRS.map(([f, t]) => (
        <button key={`${f}-${t}`} type="button" aria-pressed={f === from && t === to} onClick={() => setPair([f, t])}>
          {f} → {t}
        </button>
      ))}
    </div>
  )

  if (current?.status === 'error' || (current?.status === 'ok' && points.length < 2)) {
    return (
      <figure className="chart">
        {pairChips}
        <p className="chart__empty">El historial de este par no está disponible en este momento.</p>
      </figure>
    )
  }

  if (points.length < 2) {
    return (
      <figure className="chart">
        {pairChips}
        <div className="chart__loading" aria-busy="true" aria-label="Cargando historial" />
      </figure>
    )
  }

  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - (v - min) / span) * (H - PAD.top - PAD.bottom)

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PAD.bottom} L${x(0).toFixed(1)},${H - PAD.bottom} Z`

  const first = points[0]
  const last = points[points.length - 1]
  const change = (last.value - first.value) / first.value
  const sampleLabel = formatAmount(sample, from)

  return (
    <figure className="chart">
      {pairChips}
      <figcaption className="chart__caption">
        <span className="mono-label">
          {sampleLabel} en {to}
          {withArs ? ' · dólar MEP' : ''} · 30 días
        </span>
        <span className="chart__now">
          Hoy rinden <strong>{formatAmount(last.value, to)}</strong>
          <span className="chart__delta">
            {change >= 0 ? '▲' : '▼'} {(Math.abs(change) * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%
          </span>
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Evolución de ${sampleLabel} en ${to}: de ${formatAmount(first.value, to)} a ${formatAmount(last.value, to)}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--l-gold)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--l-gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            className="chart__grid"
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + f * (H - PAD.top - PAD.bottom)}
            y2={PAD.top + f * (H - PAD.top - PAD.bottom)}
          />
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} className="chart__line" />
        <circle cx={x(points.length - 1)} cy={y(last.value)} r="4" className="chart__dot" />
        <line className="chart__axis" x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} />
        <text x={PAD.left} y={H - 10} className="chart__label">
          {formatDateTime(first.date)}
        </text>
        <text x={W - PAD.right} y={H - 10} textAnchor="end" className="chart__label">
          {formatDateTime(last.date)}
        </text>
      </svg>
    </figure>
  )
}

export default RateChart
