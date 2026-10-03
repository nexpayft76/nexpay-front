import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { ApiError } from '../../services/api'
import { requestPasswordReset } from '../../services/auth.service'
import { validateEmail } from '../../utils/validators'
import './Auth.css'

function ForgotPassword() {
  useDocumentTitle('Restablecer contraseña')
  const location = useLocation()
  const locationState = location.state
  const initialEmail =
    locationState && typeof locationState === 'object' && 'email' in locationState &&
    typeof locationState.email === 'string'
      ? locationState.email
      : ''
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateEmail(email)
    setFieldError(validationError ?? '')
    if (validationError) return

    setError('')
    setIsSubmitting(true)
    try {
      await requestPasswordReset(email.trim())
      setSubmitted(true)
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo enviar la solicitud.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="forgot-password-title">
        <Link to="/" className="auth-card__brand">NexPay</Link>
        <h1 id="forgot-password-title">Recuperar contraseña</h1>
        {submitted ? (
          <>
            <p className="auth-notice" role="status">
              Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.
            </p>
            <p className="auth-card__footer"><Link to="/login">Volver a iniciar sesión</Link></p>
          </>
        ) : (
          <>
            <p className="auth-card__intro">
              Ingresa el email de tu cuenta. Si está registrado, te enviaremos un enlace para cambiar tu contraseña.
            </p>
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="forgot-password-email">Email</label>
                <input
                  id="forgot-password-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setFieldError(validateEmail(email) ?? '')}
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby="forgot-password-email-hint"
                />
                <span id="forgot-password-email-hint" className="auth-hint" aria-live="polite">
                  {fieldError && <span className="auth-hint--error">{fieldError}</span>}
                </span>
              </div>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="btn btn--primary btn--lg auth-form__submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
            <p className="auth-card__footer"><Link to="/login">Volver a iniciar sesión</Link></p>
          </>
        )}
      </section>
    </main>
  )
}

export default ForgotPassword
