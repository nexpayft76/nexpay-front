import type { CSSProperties } from 'react'
import { CURRENCIES } from '../../utils/currencies'

interface CurrencyPickerProps {
  value: string
  onChange: (code: string) => void
  /** Nombre del grupo para lectores de pantalla (ej. "Moneda a recargar"). */
  label: string
  /** Moneda que no se puede elegir (ej. la misma que la de origen). */
  disabledCode?: string
}

/** Botones con el color de cada moneda (Operaciones: recarga, compra…). */
function CurrencyPicker({ value, onChange, label, disabledCode }: CurrencyPickerProps) {
  return (
    <div className="currency-picker" role="radiogroup" aria-label={label}>
      {CURRENCIES.map((c) => (
        <button
          key={c.code}
          type="button"
          role="radio"
          aria-checked={value === c.code}
          disabled={c.code === disabledCode}
          className={`currency-picker__option${value === c.code ? ' currency-picker__option--active' : ''}`}
          style={{ '--currency-color': c.color } as CSSProperties}
          onClick={() => onChange(c.code)}
        >
          <span className="currency-picker__dot" aria-hidden="true" />
          <span className="currency-picker__code">{c.code}</span>
        </button>
      ))}
    </div>
  )
}

export default CurrencyPicker
