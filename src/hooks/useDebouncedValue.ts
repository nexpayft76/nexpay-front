import { useEffect, useState } from 'react'

/** Devuelve `value` recién cuando dejó de cambiar durante `delayMs` (el usuario hizo una pausa al escribir). */
export function useDebouncedValue<T>(value: T, delayMs = 500): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
