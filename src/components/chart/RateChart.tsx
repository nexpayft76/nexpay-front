import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useRateHistory } from '../../hooks/useRateHistory'
import type { HistoryRange, HistorySeries, RateHistory } from '../../types/rates'
import { CURRENCIES, CURRENCY_CODES } from '../../utils/currencies'
import './RateChart.css'

const RANGES: { value: HistoryRange; label: string; long: string }[] = [
  { value: '1w', label: '1S', long: 'la última semana' },
  { value: '1m', label: '1M', long: 'el último mes' },
  { value: '3m', label: '3M', long: 'los últimos 3 meses' },
  { value: '6m', label: '6M', long: 'los últimos 6 meses' },
  { value: '1y', label: '1A', long: 'el último año' },
]

/** Colores de las series de ARS (el MEP, tipo por defecto, en verde y más grueso). */
const ARS_TYPE_COLOR: Record<string, string> = { oficial: '#3b82f6', mep: '#10b981', blue: '#a855f7' }
const ARS_TYPE_LABEL: Record<string, string> = { oficial: 'Oficial', mep: 'MEP', blue: 'Blue' }

const PROVIDER_LABEL = {
  frankfurter: 'Frankfurter (tasa oficial, días hábiles)',
  argentinadatos: 'ArgentinaDatos (dólar en Argentina, promedio compra/venta)',
} as const

const compactFormat = new Intl.NumberFormat('es-AR', { maximumSignificantDigits: 4 })

/** Tasas de cualquier tamaño: 1 COP = 0,0003055 USD · 1 USD = 0,8769 EUR · 1 USD = 3.273,3 COP. */
function formatValue(value: number): string {
  if (value < 1) return value.toLocaleString('es-AR', { maximumSignificantDigits: 4 })
  if (value < 10) return value.toLocaleString('es-AR', { maximumFractionDigits: 4 })
  return value.toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

function formatAxisDate(iso: string, range: HistoryRange): string {
  const date = new Date(`${iso}T00:00:00`)
  return range === '6m' || range === '1y'
    ? date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
    : date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function seriesColor(key: string, from: string): string {
  return ARS_TYPE_COLOR[key] ?? CURRENCIES.find((c) => c.code === from)?.color ?? '#3b4fd8'
}

/** Une las series por fecha para Recharts: [{ date, oficial: 1380, mep: 1550, blue: 1560 }, …]. */
function toRows(series: HistorySeries[]): Array<Record<string, number | string>> {
  const byDate = new Map<string, Record<string, number | string>>()
  for (const s of series) {
    for (const point of s.points) {
      const row = byDate.get(point.date) ?? { date: point.date }
      row[s.key] = point.value
      byDate.set(point.date, row)
    }
  }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

interface RateChartProps {
  /** Moneda de origen: se grafica "1 {from} = X {to}". */
  from: string
  to: string
  onFromChange: (currency: string) => void
  onToChange: (currency: string) => void
  onSwap: () => void
}

function RateChart({ from, to, onFromChange, onToChange, onSwap }: RateChartProps) {
  const [range, setRange] = useState<HistoryRange>('1m')
  const history = useRateHistory(from, to, range)
  const isWide = useMediaQuery('(min-width: 768px)')
  const rangeInfo = RANGES.find((r) => r.value === range) ?? RANGES[1]!
  const involvesArs = from === 'ARS' || to === 'ARS'

  return (
    <section className="rate-chart" aria-labelledby="rate-chart-title">
      <header className="rate-chart__header">
        <div>
          <h2 id="rate-chart-title">
            1 {from} en {to}
          </h2>
          {involvesArs && <p className="rate-chart__subtitle">Según el tipo de dólar en Argentina</p>}
        </div>

        <div className="rate-chart__controls">
          <div className="pair-select">
            <label>
              <span>De</span>
              <select value={from} onChange={(event) => onFromChange(event.target.value)} aria-label="Moneda de origen">
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="pair-select__swap" onClick={onSwap} aria-label="Invertir monedas" title="Invertir monedas">
              ⇄
            </button>
            <label>
              <span>a</span>
              <select value={to} onChange={(event) => onToChange(event.target.value)} aria-label="Moneda de destino">
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="range-tabs" role="radiogroup" aria-label="Rango del gráfico">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={range === r.value}
                aria-label={r.long}
                className={`range-tabs__option${range === r.value ? ' range-tabs__option--active' : ''}`}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {history.status === 'loading' && <div className="rate-chart__skeleton" aria-busy="true" aria-label="Cargando gráfico" />}

      {history.status === 'error' && (
        <p className="rate-chart__error" role="alert">
          {history.message}
        </p>
      )}

      {history.status === 'ok' && (
        <div className={`rate-chart__body${history.updating ? ' rate-chart__body--updating' : ''}`} aria-busy={history.updating}>
          {history.updating && (
            <span className="rate-chart__updating" role="status">
              Actualizando…
            </span>
          )}
          <ChartBody data={history.data} rangeLong={rangeInfo.long} height={isWide ? 280 : 220} />
        </div>
      )}
    </section>
  )
}

function ChartBody({ data, rangeLong, height }: { data: RateHistory; rangeLong: string; height: number }) {
  const rows = toRows(data.series)
  const multi = data.series.length > 1
  const main = data.series[0]

  if (rows.length === 0 || !main) {
    return <p className="rate-chart__error">No hay datos para este rango.</p>
  }

  return (
    <>
      {multi ? (
        <ul className="rate-chart__chips">
          {data.series.map((s) => (
            <li key={s.key} style={{ borderColor: seriesColor(s.key, data.from) }}>
              <span className="rate-chart__chip-name">
                <span className="rate-chart__dot" style={{ background: seriesColor(s.key, data.from) }} aria-hidden="true" />
                {ARS_TYPE_LABEL[s.key] ?? s.label}
              </span>
              {s.stats && (
                <>
                  <strong>
                    {formatValue(s.stats.last)} {data.to}
                  </strong>
                  <Change pct={s.stats.change_pct} />
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        main.stats && (
          <div className="rate-chart__headline">
            <strong>
              {formatValue(main.stats.last)} {data.to}
            </strong>
            <span>
              <Change pct={main.stats.change_pct} /> en {rangeLong}
              <span className="rate-chart__explain">
                {' '}
                (el {data.from} se {main.stats.change_pct >= 0 ? 'fortaleció' : 'debilitó'} frente al {data.to})
              </span>
            </span>
          </div>
        )
      )}

      <figure className="rate-chart__figure" aria-label={summaryText(data, rangeLong)}>
        {/* initialDimension: se dibuja de entrada con un ancho estimado (no con 0) y después se ajusta,
            así no hay un primer dibujo vacío. debounce: al cambiar el tamaño de la ventana mide menos veces. */}
        <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 640, height }} debounce={100}>
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => formatAxisDate(value, data.range)}
              minTickGap={24}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(value: number) => compactFormat.format(value)}
              width={60}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              labelFormatter={(label) => formatLongDate(String(label))}
              formatter={(value, name) => [
                typeof value === 'number' ? `${formatValue(value)} ${data.to}` : String(value),
                ARS_TYPE_LABEL[String(name)] ?? data.series.find((s) => s.key === name)?.label ?? String(name),
              ]}
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                color: 'var(--color-text)',
              }}
            />
            {data.series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.key}
                stroke={seriesColor(s.key, data.from)}
                strokeWidth={s.key === 'mep' || !multi ? 2.5 : 1.75}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </figure>

      {data.warnings.length > 0 && (
        <ul className="rate-chart__warnings" role="status">
          {data.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <p className="rate-chart__footer">
        {!multi && main.stats && (
          <>
            Mín {formatValue(main.stats.min)} · Máx {formatValue(main.stats.max)} ·{' '}
          </>
        )}
        Fuente: {data.providers.map((p) => PROVIDER_LABEL[p]).join(' + ')}
        {' · '}
        {formatLongDate(data.start)} al {formatLongDate(data.end)}
      </p>
    </>
  )
}

function Change({ pct }: { pct: number }) {
  const sign = pct > 0 ? '▲' : pct < 0 ? '▼' : '●'
  return (
    <span className="rate-chart__change">
      {sign} {Math.abs(pct).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%
    </span>
  )
}

/** Resumen en texto del gráfico, para lectores de pantalla. */
function summaryText(data: RateHistory, rangeLong: string): string {
  const parts = data.series.flatMap((s) =>
    s.stats
      ? [`${s.label}: de ${formatValue(s.stats.first)} a ${formatValue(s.stats.last)} ${data.to} (${s.stats.change_pct}%)`]
      : [],
  )
  return `1 ${data.from} en ${data.to}, evolución en ${rangeLong}. ${parts.join('. ')}.`
}

export default RateChart
