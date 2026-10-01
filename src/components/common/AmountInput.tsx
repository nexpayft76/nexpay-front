import { useLayoutEffect, useRef, type InputHTMLAttributes } from 'react'
import { formatAmountInput } from '../../utils/amount'

type AmountInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string
  /** Recibe el texto ya formateado ("1.000.000,5"). */
  onValueChange: (formatted: string) => void
}

/** Cuántos dígitos (y la coma) hay antes de la posición `pos`: sirve para ubicar el cursor tras formatear. */
function significantBefore(text: string, pos: number): number {
  return text.slice(0, pos).replace(/[^\d,]/g, '').length
}

/** Posición en `text` que deja `count` dígitos/comas a la izquierda del cursor. */
function positionFor(text: string, count: number): number {
  if (count <= 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i++) {
    if (/[\d,]/.test(text[i]!)) seen++
    if (seen === count) return i + 1
  }
  return text.length
}

/**
 * Campo de monto con puntos de miles automáticos mientras se escribe (1000 → 1.000).
 * Mantiene el cursor en su lugar aunque se agreguen o quiten puntos.
 */
function AmountInput({ value, onValueChange, ...props }: AmountInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)

  // Después de formatear, el cursor vuelve a quedar detrás del mismo dígito que el usuario escribió.
  useLayoutEffect(() => {
    const input = ref.current
    if (!input || caret.current === null || document.activeElement !== input) return
    const position = positionFor(value, caret.current)
    input.setSelectionRange(position, position)
    caret.current = null
  }, [value])

  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(event) => {
        const raw = event.target.value
        caret.current = significantBefore(raw, event.target.selectionStart ?? raw.length)
        onValueChange(formatAmountInput(raw))
      }}
    />
  )
}

export default AmountInput
