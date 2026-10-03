import { useState } from 'react'
import type { FormEvent } from 'react'
import PasswordInput from '../../components/common/PasswordInput'
import { ApiError } from '../../services/api'
import { PASSWORD_RULES, validatePassword } from '../../utils/validators'
import '../Auth/Auth.css'

interface ChangePasswordSectionProps {
  /** Cambia la contraseña. Si falla, lanza un ApiError (403 actual incorrecta, 409 cuenta sin contraseña). */
  onChange: (currentPassword: string, newPassword: string) => Promise<void>
}

/** Primer problema del formulario (o undefined si se puede enviar). */
function formError(current: string, next: string, confirmation: string): string | undefined {
  if (!current) return 'Ingresa tu contraseña actual.'
  const passwordError = validatePassword(next)
  if (passwordError) return passwordError
  if (next === current) return 'La nueva contraseña debe ser distinta de la actual.'
  if (confirmation !== next) return 'Las contraseñas no coinciden.'
  return undefined
}

/** Configuración → Usuario: cambiar la contraseña pidiendo la actual. Cerrado por defecto. */
function ChangePasswordSection({ onChange }: ChangePasswordSectionProps) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const problem = formError(current, next, confirmation)

  function close() {
    setOpen(false)
    setCurrent('')
    setNext('')
    setConfirmation('')
    setError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await onChange(current, next)
      close()
      setSaved(true)
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="profile-card" aria-labelledby="profile-password-title">
      <h2 id="profile-password-title">Contraseña</h2>

      {!open ? (
        <>
          {saved && <p className="profile-page__saved" role="status">✓ Contraseña actualizada.</p>}
          <p className="profile-card__hint">Te pediremos tu contraseña actual para confirmar el cambio.</p>
          <div>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setSaved(false)
                setOpen(true)
              }}
            >
              Cambiar contraseña
            </button>
          </div>
        </>
      ) : (
        <form className="auth-form profile-edit__form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="profile-current-password">Contraseña actual</label>
            <PasswordInput
              id="profile-current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              autoComplete="current-password"
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="profile-new-password">Nueva contraseña</label>
            <PasswordInput
              id="profile-new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              autoComplete="new-password"
              required
              aria-describedby="profile-new-password-rules"
            />
            {next && (
              <ul id="profile-new-password-rules" className="auth-rules" aria-live="polite">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(next)
                  return (
                    <li key={rule.id} className={`auth-rules__item${ok ? ' auth-rules__item--ok' : ''}`}>
                      <span aria-hidden="true">{ok ? '✓' : '✗'}</span> {rule.label}
                      <span className="visually-hidden">{ok ? ' (cumple)' : ' (falta)'}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="profile-confirm-password">Repetir nueva contraseña</label>
            <PasswordInput
              id="profile-confirm-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              required
              aria-invalid={confirmation !== '' && confirmation !== next}
            />
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="profile-edit__actions">
            <button className="btn btn--primary" type="submit" disabled={problem !== undefined || isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
            </button>
            <button className="btn btn--ghost" type="button" onClick={close} disabled={isSubmitting}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default ChangePasswordSection
