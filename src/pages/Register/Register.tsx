import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import PasswordInput from '../../components/common/PasswordInput'
import { useAuth } from '../../hooks/useAuth'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useEmailAvailability } from '../../hooks/useEmailAvailability'
import { ApiError } from '../../services/api'
import { PASSWORD_RULES, validateEmail, validateName, validatePassword } from '../../utils/validators'
import '../Auth/Auth.css'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

type Field = 'name' | 'email' | 'password' | 'confirmation'

const NOT_TOUCHED: Record<Field, boolean> = { name: false, email: false, password: false, confirmation: false }
const ALL_TOUCHED: Record<Field, boolean> = { name: true, email: true, password: true, confirmation: true }

function Register() {
  useDocumentTitle('Crear cuenta')
  const { user, isLoading, register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Campos que el usuario ya dejó (o intentó enviar): ahí también se avisa si quedaron vacíos.
  const [touched, setTouched] = useState(NOT_TOUCHED)

  // El email se valida cuando el usuario hace una pausa al escribir: así no marca error letra por letra.
  const debouncedEmail = useDebouncedValue(email, 500)
  const emailSettled = debouncedEmail === email
  const availability = useEmailAvailability(debouncedEmail)
  const emailFormatOk = validateEmail(email) === undefined

  const nameError = name || touched.name ? validateName(name) : undefined
  const emailFormatError = (email && emailSettled) || touched.email ? validateEmail(email) : undefined
  const emailTaken = emailSettled && availability === 'taken'
  const passwordEmptyError = touched.password && !password ? 'La contraseña es obligatoria.' : undefined
  let confirmationError: string | undefined
  if (passwordConfirmation || touched.confirmation) {
    if (!passwordConfirmation) confirmationError = 'Repetí la contraseña.'
    else if (passwordConfirmation !== password) confirmationError = 'Las contraseñas no coinciden.'
  }

  const formValid =
    validateName(name) === undefined &&
    emailFormatOk &&
    !emailTaken &&
    validatePassword(password) === undefined &&
    password === passwordConfirmation

  function touch(field: Field) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(ALL_TOUCHED)
    if (!formValid) {
      setError('Revisá los campos marcados.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      // Al guardar el usuario, esta pantalla redirige sola al dashboard (<Navigate> de abajo).
      await register({ full_name: name.trim(), email: email.trim(), password })
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo crear la cuenta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <main className="placeholder-page"><p>Verificando sesión...</p></main>
  if (user) return <Navigate to="/dashboard" replace />

  let emailHint = null
  if (emailFormatError) emailHint = <span className="auth-hint--error">{emailFormatError}</span>
  else if (emailTaken)
    emailHint = (
      <span className="auth-hint--error">
        Ya existe una cuenta con este email. <Link to="/login">Iniciá sesión</Link>
      </span>
    )
  else if (emailSettled && availability === 'available') emailHint = <span className="auth-hint--ok">✓ Email disponible</span>
  else if (emailFormatOk && (!emailSettled || availability === 'checking')) emailHint = <span>Verificando email…</span>

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <Link to="/" className="auth-card__brand">NexPay</Link>
        <h1 id="register-title">Crear cuenta</h1>
        <p className="auth-card__intro">Registrate para empezar a gestionar tus divisas.</p>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="register-name">Nombre completo</label>
            <input
              type="text"
              id="register-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => touch('name')}
              autoComplete="name"
              required
              aria-invalid={nameError !== undefined}
              aria-describedby="register-name-hint"
            />
            <FieldHint id="register-name-hint" error={nameError} />
          </div>

          <div className="auth-field">
            <label htmlFor="register-email">Email</label>
            <input
              type="email"
              id="register-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => touch('email')}
              autoComplete="email"
              required
              aria-invalid={emailFormatError !== undefined || emailTaken}
              aria-describedby="register-email-hint"
            />
            <span id="register-email-hint" className="auth-hint" aria-live="polite">
              {emailHint}
            </span>
          </div>

          <div className="auth-field">
            <label htmlFor="register-password">Contraseña</label>
            <PasswordInput
              id="register-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => touch('password')}
              autoComplete="new-password"
              required
              aria-invalid={passwordEmptyError !== undefined || (password !== '' && validatePassword(password) !== undefined)}
              aria-describedby="register-password-rules"
            />
            <FieldHint error={passwordEmptyError} />
            {/* Las reglas aparecen desde la primera letra y se van tildando mientras se escribe. */}
            {(password || touched.password) && (
              <ul id="register-password-rules" className="auth-rules" aria-live="polite">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password)
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
            <label htmlFor="register-confirmation">Repetir contraseña</label>
            <PasswordInput
              id="register-confirmation"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              onBlur={() => touch('confirmation')}
              autoComplete="new-password"
              required
              aria-invalid={confirmationError !== undefined}
              aria-describedby="register-confirmation-hint"
            />
            <FieldHint
              id="register-confirmation-hint"
              error={confirmationError}
              ok={passwordConfirmation && !confirmationError ? '✓ Las contraseñas coinciden' : undefined}
            />
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn btn--primary btn--lg auth-form__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="auth-card__footer">¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link></p>
        <Link to="/" className="auth-card__back">Volver al inicio</Link>
      </section>
    </main>
  )
}

/** Mensaje debajo de un campo: error en rojo u ok en verde. */
function FieldHint({ id, error, ok }: { id?: string; error?: string; ok?: string }) {
  return (
    <span id={id} className="auth-hint" aria-live="polite">
      {error ? <span className="auth-hint--error">{error}</span> : ok ? <span className="auth-hint--ok">{ok}</span> : null}
    </span>
  )
}

export default Register
