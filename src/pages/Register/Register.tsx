import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { validateEmail, validateName, validatePassword } from '../../utils/validators'
import { useAuth } from '../../hooks/useAuth'
import '../Auth/Auth.css'

function Register() {
  const navigate = useNavigate()
  const { user, isLoading, register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateName(name) ?? validateEmail(email) ?? validatePassword(password)
    if (validationError) {
      setError(validationError)
      return
    }
    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await register({ full_name: name.trim(), email: email.trim(), password })
      navigate('/dashboard')
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo crear la cuenta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <main className="placeholder-page"><p>Verificando sesión...</p></main>
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <Link to="/" className="auth-card__brand">NexPay</Link>
        <h1 id="register-title">Crear cuenta</h1>
        <p className="auth-card__intro">Regístrate para empezar a gestionar tus divisas.</p>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            Nombre completo
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
          </label>
          <label className="auth-field">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label className="auth-field">
            Contraseña
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
          </label>
          <label className="auth-field">
            Repetir contraseña
            <input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} autoComplete="new-password" required />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn btn--primary btn--lg auth-form__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="auth-card__footer">¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link></p>
        <Link to="/" className="auth-card__back">Volver al inicio</Link>
      </section>
    </main>
  )
}

export default Register
