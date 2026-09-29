import { useEffect, useState } from 'react'
import { checkEmailAvailable } from '../services/auth.service'
import { validateEmail } from '../utils/validators'

/**
 * idle: email vacío o con formato inválido (no se consulta).
 * checking: consultando al back.
 * available / taken: respuesta del back.
 * unknown: no se pudo verificar (sin conexión o demasiadas consultas); el registro lo vuelve a verificar.
 */
export type EmailAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'unknown'

/** Consulta si `email` ya tiene cuenta. Pasale el email ya "debounced" para no llamar al back en cada tecla. */
export function useEmailAvailability(email: string): EmailAvailability {
  const normalized = email.trim().toLowerCase()
  const valid = validateEmail(normalized) === undefined
  const [result, setResult] = useState<{ email: string; status: EmailAvailability } | null>(null)

  useEffect(() => {
    if (!valid) return
    let cancelled = false
    checkEmailAvailable(normalized)
      .then((available) => {
        if (!cancelled) setResult({ email: normalized, status: available ? 'available' : 'taken' })
      })
      .catch(() => {
        if (!cancelled) setResult({ email: normalized, status: 'unknown' })
      })
    return () => {
      cancelled = true
    }
  }, [normalized, valid])

  if (!valid) return 'idle'
  // Mientras llega la respuesta del email actual, no mostrar la de uno anterior.
  return result?.email === normalized ? result.status : 'checking'
}
