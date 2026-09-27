import { useEffect, useId, useState } from 'react'
import { getCopArsHistory, type CorridorHistory } from '../../services/corridor.service'
import { formatDateTime } from './format'

const W = 560
const H = 300
const PAD = { top: 24, right: 16, bottom: 32, left: 16 }
const SAMPLE_COP = 1_000_000

type State = { status: 'loading' } | { status: 'ok'; data: CorridorHistory } | { status: 'error' }

/** Gráfico del corredor: cuántos ARS rinden 1.000.000 COP al dólar MEP en los últimos 30 días. */
function CorridorChart() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const gradientId = useId()

  useEffect(() => {
    let cancelled = false
    getCopArsHistory('1m')
      .then((data) => !cancelled && setState({ status: 'ok', data }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [])

  const series =
    state.status === 'ok'
      ? (state.data.series.find((s) => s.key === 'mep') ?? state.data.series[0])
      : undefined
  const points = series?.points.map((p) => ({ date: p.date, value: p.value * SAMPLE_COP })) ?? []

  if (state.status === 'error' || (state.status === 'ok' && points.length < 2)) {
    return (
      <figure className="chart chart--empty">
        <p>El historial de tasas no está disponible en este momento.</p>
      </figure>
    )
  }

  if (points.length < 2) {
    return <figure className="chart chart--loading" aria-busy="true" aria-label="Cargando historial" />
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
  const ars = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

  return (
    <figure className="chart">
      <figcaption className="chart__caption">
        <span className="mono-label">1.000.000 COP en ARS · dólar MEP · 30 días</span>
        <span className="chart__now">
          Hoy rinden <strong>${ars(last.value)} ARS</strong>
          <span className={change >= 0 ? 'chart__delta chart__delta--up' : 'chart__delta chart__delta--down'}>
            {change >= 0 ? '▲' : '▼'} {(Math.abs(change) * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%
          </span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Evolución de 1.000.000 COP en ARS: de ${ars(first.value)} a ${ars(last.value)}`}>
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

export default CorridorChart
