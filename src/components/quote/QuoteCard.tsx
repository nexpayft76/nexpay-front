import { useState } from 'react'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { ARS_RATE_TYPES, useQuote } from '../../hooks/useQuote'
import type { ArsRateType, Conversion } from '../../types/rates'
import { parseAmount, validateAmountText, visibleAmountError } from '../../utils/amount'
import AmountInput from '../common/AmountInput'
import { CURRENCY_CODES } from '../../utils/currencies'
import { formatCurrency } from '../../utils/formatCurrency'
import { usePreferences } from '../../contexts/PreferencesContext'
import RateSources from './RateSources'
import './QuoteCard.css'

/** Tipos de dólar legales: la sugerencia solo recomienda estos (el blue es mercado informal). */
const LEGAL_ARS_TYPES: ArsRateType[] = ['oficial', 'mep']

const ARS_LABEL: Record<ArsRateType, string> = { oficial: 'Oficial', mep: 'MEP', blue: 'Blue' }

const SOURCE_LABEL = { live: 'en vivo', cache: 'actualizada', fallback: 'última tasa válida' } as const

function formatRate(rate: number): string {
  return new Intl.NumberFormat('es-AR', { maximumSignificantDigits: 6 }).format(rate)
}

function QuoteCard() {
  const [amountText, setAmountText] = useState('1.000.000')
  const [from, setFrom] = useState('COP')
  const [to, setTo] = useState('ARS')
  const { arsRate, setArsRate } = usePreferences()

  const amount = parseAmount(amountText)
  // Validación en tiempo real (igual que recarga y compra): decimales de más al instante; el resto tras una pausa.
  const issue = validateAmountText(amountText)
  const settled = useDebouncedValue(amountText, 400) === amountText
  const amountError = visibleAmountError(issue, settled)
  // Solo se cotiza un monto válido.
  const quote = useQuote({ from, to, amount: issue === undefined ? amount : Number.NaN, arsRate })
  const involvesArs = from === 'ARS' || to === 'ARS'

  function swap() {
    setFrom(to)
    setTo(from)
  }

  return (
    <section className="quote-card" aria-labelledby="quote-title">
      <header className="quote-card__header">
        <h2 id="quote-title">Cotizador</h2>
        <span className="quote-card__hint">No mueve tu saldo</span>
      </header>

      <div className="quote-card__form">
        <label className="quote-field">
          <span className="quote-field__label">Tengo</span>
          <div className="quote-field__row">
            <AmountInput
              value={amountText}
              onValueChange={setAmountText}
              aria-label="Monto a cambiar"
              aria-invalid={amountError !== undefined}
              aria-describedby="quote-amount-error"
            />
            <select value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Moneda que tengo">
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <span id="quote-amount-error" className="quote-field__error" aria-live="polite">
            {amountError}
          </span>
        </label>

        <button type="button" className="quote-card__swap" onClick={swap} aria-label="Invertir monedas" title="Invertir monedas">
          ⇅
        </button>

        <label className="quote-field">
          <span className="quote-field__label">Quiero</span>
          <div className="quote-field__row quote-field__row--end">
            <select value={to} onChange={(event) => setTo(event.target.value)} aria-label="Moneda que quiero">
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>

      {involvesArs && (
        <div className="quote-card__ars" role="radiogroup" aria-label="Tipo de dólar para el peso argentino">
          <span className="quote-field__label">Tipo de dólar (ARS)</span>
          <div className="segmented">
            {ARS_RATE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={arsRate === type}
                className={`segmented__option${arsRate === type ? ' segmented__option--active' : ''}`}
                onClick={() => setArsRate(type)}
              >
                {ARS_LABEL[type]}
              </button>
            ))}
          </div>
          {arsRate === 'blue' && <p className="quote-card__note">El blue es mercado informal: solo como referencia.</p>}
        </div>
      )}

      <QuoteResult
        state={quote}
        from={from}
        to={to}
        amountText={amountText}
        arsRate={arsRate}
        onSelectArsRate={setArsRate}
      />

      <RateSources />
    </section>
  )
}

interface QuoteResultProps {
  state: ReturnType<typeof useQuote>
  from: string
  to: string
  amountText: string
  arsRate: ArsRateType
  onSelectArsRate: (type: ArsRateType) => void
}

function QuoteResult({ state, from, to, amountText, arsRate, onSelectArsRate }: QuoteResultProps) {
  if (from === to) return <p className="quote-card__message">Elige dos monedas distintas.</p>
  if (state.status === 'idle') {
    return <p className="quote-card__message">{amountText ? 'Corrige el monto para cotizar.' : 'Ingresa un monto para cotizar.'}</p>
  }
  if (state.status === 'error') {
    return (
      <p className="quote-card__message quote-card__message--error" role="alert">
        {state.message}
      </p>
    )
  }

  // Mientras carga se mantiene el alto de la caja para que la pantalla no "salte".
  if (state.status === 'loading') {
    return <div className="quote-result quote-result--loading" aria-busy="true" aria-label="Cotizando" />
  }

  const { quote, comparison } = state
  const selected = comparison.find((c) => c.ars_rate?.type === arsRate)

  return (
    <>
      <div className="quote-result" aria-live="polite">
        <span className="quote-result__label">Recibirías</span>
        <strong className="quote-result__amount">{formatCurrency(quote.result, quote.to)}</strong>
        <span className="quote-result__meta">
          1 {quote.from} = {formatRate(quote.rate)} {quote.to}
          {quote.ars_rate && ` · dólar ${quote.ars_rate.label}, precio de ${quote.ars_rate.price_used}`}
          {` · tasa ${SOURCE_LABEL[quote.source]}`}
        </span>
      </div>

      {quote.warnings.length > 0 && (
        <ul className="quote-card__warnings" role="status">
          {quote.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      {comparison.length > 0 && selected && (
        <>
          <Suggestion comparison={comparison} selected={selected} onSelect={onSelectArsRate} />
          <Comparison comparison={comparison} selected={selected} />
        </>
      )}
    </>
  )
}

interface SuggestionProps {
  comparison: Conversion[]
  selected: Conversion
  onSelect: (type: ArsRateType) => void
}

/**
 * Qué tipo de dólar le conviene al usuario: el que le da MÁS de la moneda que recibe.
 * - Si recibe ARS: más pesos.
 * - Si paga con ARS: más dólares/euros por sus pesos (compra más barato).
 * Solo recomienda tipos legales; si el blue diera más, lo menciona aparte como informal.
 */
function Suggestion({ comparison, selected, onSelect }: SuggestionProps) {
  const byType = (type: ArsRateType) => comparison.find((c) => c.ars_rate?.type === type)
  const legal = LEGAL_ARS_TYPES.map(byType).filter((c): c is Conversion => c !== undefined)
  const best = legal.reduce<Conversion | undefined>((top, c) => (!top || c.result > top.result ? c : top), undefined)
  const blue = byType('blue')
  const bestType = best?.ars_rate?.type
  if (!best || !bestType) return null

  const receivesArs = best.to === 'ARS'
  const selectedType = selected.ars_rate?.type
  const diffVsSelected = best.result - selected.result
  const blueExtra = blue && blue.result > best.result ? blue.result - best.result : 0

  const benefit = (amount: number) =>
    receivesArs
      ? `recibes ${formatCurrency(amount, best.to)} más`
      : `compras más barato: recibes ${formatCurrency(amount, best.to)} más por tus pesos`

  let message: string
  if (selectedType === bestType) {
    message = `Estás usando la mejor opción legal: el dólar ${ARS_LABEL[bestType]}.`
  } else if (selectedType === 'blue') {
    message = `Te recomendamos el dólar ${ARS_LABEL[bestType]}: es la mejor opción legal para esta operación.`
  } else {
    message = `Te conviene el dólar ${ARS_LABEL[bestType]}: ${benefit(diffVsSelected)} que con el ${selectedType ? ARS_LABEL[selectedType] : 'elegido'}.`
  }

  return (
    <div className="quote-suggestion" role="status">
      <p>
        💡 {message}
        {blueExtra > 0 && (
          <span className="quote-suggestion__extra">
            El blue daría {formatCurrency(blueExtra, best.to)} más, pero es mercado informal.
          </span>
        )}
      </p>
      {selectedType !== bestType && (
        <button type="button" className="btn btn--primary btn--sm" onClick={() => onSelect(bestType)}>
          Usar {ARS_LABEL[bestType]}
        </button>
      )}
    </div>
  )
}

function Comparison({ comparison, selected }: { comparison: Conversion[]; selected: Conversion }) {
  return (
    <div className="quote-compare">
      <h3>¿Cuánto recibirías con cada tipo de dólar?</h3>
      <ul>
        {comparison.map((option) => {
          const type = option.ars_rate?.type
          const diff = option.result - selected.result
          const isSelected = option === selected
          return (
            <li key={type} className={isSelected ? 'quote-compare__row--selected' : undefined}>
              <span className="quote-compare__type">{type ? ARS_LABEL[type] : ''}</span>
              <span className="quote-compare__amount">{formatCurrency(option.result, option.to)}</span>
              <span className={`quote-compare__diff${diff < 0 ? ' is-negative' : diff > 0 ? ' is-positive' : ''}`}>
                {isSelected ? 'elegido' : `${diff > 0 ? '+' : ''}${formatCurrency(diff, option.to)}`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default QuoteCard
