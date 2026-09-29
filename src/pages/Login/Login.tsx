import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { validateEmail, validateLoginPassword } from '../../utils/validators'
import { useAuth } from '../../hooks/useAuth'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import PasswordInput from '../../components/common/PasswordInput'
import '../Auth/Auth.css'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

function Login() {
  useDocumentTitle('Iniciar sesión')
  const { user, isLoading, sessionExpired, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })

  // En tiempo real: el formato del email se revisa cuando el usuario hace una pausa al escribir.
  const emailSettled = useDebouncedValue(email, 500) === email
  const emailError = (email && emailSettled) || touched.email ? validateEmail(email) : undefined
  const passwordError = touched.password ? validateLoginPassword(password) : undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ email: true, password: true })
    if (validateEmail(email) ?? validateLoginPassword(password)) {
      setError('')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      // Al guardar el usuario, esta pantalla redirige sola al dashboard (<Navigate> de abajo).
      await login({ email: email.trim(), password })
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo iniciar sesión.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <main className="placeholder-page"><p>Verificando sesión...</p></main>
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <Link to="/" className="auth-card__brand">NexPay</Link>
        <h1 id="login-title">Iniciar sesión</h1>
        <p className="auth-card__intro">Ingresá para consultar tus balances y operaciones.</p>
        {sessionExpired && (
          <p className="auth-notice" role="status">
            Tu sesión expiró. Volvé a iniciar sesión para continuar.
          </p>
        )}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              autoComplete="email"
              required
              aria-invalid={emailError !== undefined}
              aria-describedby="login-email-hint"
            />
            <span id="login-email-hint" className="auth-hint" aria-live="polite">
              {emailError && <span className="auth-hint--error">{emailError}</span>}
            </span>
          </div>
          <div className="auth-field">
            <label htmlFor="login-password">Contraseña</label>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              autoComplete="current-password"
              required
              aria-invalid={passwordError !== undefined}
              aria-describedby="login-password-hint"
            />
            <span id="login-password-hint" className="auth-hint" aria-live="polite">
              {passwordError && <span className="auth-hint--error">{passwordError}</span>}
            </span>
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn btn--primary btn--lg auth-form__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="auth-card__footer">¿No tenés cuenta? <Link to="/register">Crear cuenta</Link></p>
        <Link to="/" className="auth-card__back">Volver al inicio</Link>
      </section>
    </main>
  )
}

export default Login
