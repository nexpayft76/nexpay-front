import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PasswordInput from '../../components/common/PasswordInput'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { ApiError } from '../../services/api'
import { resetPassword } from '../../services/auth.service'
import { validatePassword } from '../../utils/validators'
import './Auth.css'

function ResetPassword() {
  useDocumentTitle('Crear nueva contraseña')
  const location = useLocation()
  const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)

  const passwordError = password ? validatePassword(password) : ''
  const confirmationError = confirmation && confirmation !== password ? 'Las contraseñas no coinciden.' : ''
  const canSubmit = Boolean(token) && !validatePassword(password) && password === confirmation && !isSubmitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !canSubmit) return

    setError('')
    setIsSubmitting(true)
    try {
      await resetPassword(token, password)
      setCompleted(true)
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-password-title">
        <Link to="/" className="auth-card__brand">NexPay</Link>
        <h1 id="reset-password-title">Crear nueva contraseña</h1>
        {completed ? (
          <>
            <p className="auth-notice" role="status">Tu contraseña se actualizó correctamente.</p>
            <p className="auth-card__footer"><Link to="/login">Iniciar sesión</Link></p>
          </>
        ) : !token ? (
          <>
            <p className="auth-error" role="alert">El enlace no es válido o está incompleto.</p>
            <p className="auth-card__footer"><Link to="/forgot-password">Solicitar un nuevo enlace</Link></p>
          </>
        ) : (
          <>
            <p className="auth-card__intro">Elige una contraseña nueva para tu cuenta NexPay.</p>
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="reset-password">Nueva contraseña</label>
                <PasswordInput
                  id="reset-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby="reset-password-hint"
                />
                <span id="reset-password-hint" className="auth-hint" aria-live="polite">
                  {passwordError && <span className="auth-hint--error">{passwordError}</span>}
                  {password && !passwordError && <span className="auth-hint--ok">✓ La contraseña cumple los requisitos.</span>}
                </span>
              </div>
              <div className="auth-field">
                <label htmlFor="reset-password-confirmation">Repetir nueva contraseña</label>
                <PasswordInput
                  id="reset-password-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="new-password"
                  required
                  aria-invalid={Boolean(confirmationError)}
                  aria-describedby="reset-password-confirmation-hint"
                />
                <span id="reset-password-confirmation-hint" className="auth-hint" aria-live="polite">
                  {confirmationError}
                </span>
              </div>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="btn btn--primary btn--lg auth-form__submit" type="submit" disabled={!canSubmit}>
                {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}

export default ResetPassword
