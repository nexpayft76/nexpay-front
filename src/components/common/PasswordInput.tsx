import { useState, type InputHTMLAttributes } from 'react'
import Icon from './Icon'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Campo de contraseña con botón "ojito" para mostrarla u ocultarla.
 * Recibe las mismas props que un <input> (value, onChange, autoComplete…), menos `type`.
 */
function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const label = visible ? 'Ocultar contraseña' : 'Mostrar contraseña'

  return (
    <span className="password-input">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-input__toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} />
      </button>
    </span>
  )
}

export default PasswordInput
