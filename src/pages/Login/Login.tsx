import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { validateEmail, validatePassword } from '../../utils/validators'
import '../Auth/Auth.css'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateEmail(email) ?? validatePassword(password)
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      navigate('/dashboard')
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo iniciar sesión.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <Link to="/" className="auth-card__brand">NexPay</Link>
        <h1 id="login-title">Iniciar sesión</h1>
        <p className="auth-card__intro">Ingresá para consultar tus balances y operaciones.</p>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label className="auth-field">
            Contraseña
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>
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
