import { useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import PasswordInput from '../../components/common/PasswordInput'
import { ApiError } from '../../services/api'
import { getMyWallet } from '../../services/wallet.service'
import type { WalletBalance } from '../../types/wallet'

interface CloseAccountSectionProps {
  /** Cierra la cuenta con la contraseña. Si falla, lanza un ApiError (403 contraseña, 409 saldo). */
  onClose: (password: string) => Promise<void>
}

/** Saldo con sus decimales y la moneda, ej. "25,50 USD". */
function formatBalance(balance: WalletBalance): string {
  const amount = Number(balance.amount).toLocaleString('es-AR', {
    minimumFractionDigits: balance.decimals,
    maximumFractionDigits: balance.decimals,
  })
  return `${amount} ${balance.currency}`
}

/**
 * Zona de peligro: cerrar la cuenta. Pide la contraseña en un diálogo de confirmación.
 * Si el back no deja cerrar porque todavía hay saldo (409), muestra su mensaje y qué fondos hay que mover.
 */
function CloseAccountSection({ onClose }: CloseAccountSectionProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState<{ message: string; balances: WalletBalance[] } | null>(null)

  function reset() {
    setOpen(false)
    setPassword('')
    setError('')
  }

  async function loadFundsToMove(): Promise<WalletBalance[]> {
    try {
      const wallet = await getMyWallet('USD')
      return wallet.balances.filter((balance) => Number(balance.amount) > 0)
    } catch {
      // Si no se pudo consultar, igual se explica el motivo; solo falta la lista.
      return []
    }
  }

  async function handleConfirm() {
    if (busy) return
    if (!password) {
      setError('Ingresa tu contraseña para confirmar.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await onClose(password)
      // Éxito: la sesión se cerró y la ruta protegida redirige al login. No queda nada que mostrar acá.
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && requestError.status === 409) {
        const balances = await loadFundsToMove()
        setBlocked({ message: requestError.message, balances })
        reset()
      } else {
        setError(requestError instanceof ApiError ? requestError.message : 'No se pudo cerrar la cuenta.')
      }
      setBusy(false)
    }
  }

  return (
    <section className="profile-card profile-danger" aria-labelledby="profile-danger-title">
      <h2 id="profile-danger-title">Cerrar cuenta</h2>
      <p>
        Al cerrar tu cuenta dejarás de poder iniciar sesión. Para hacerlo, tus saldos tienen que estar en 0 y vas a
        tener que confirmar tu contraseña.
      </p>

      {blocked && (
        <div className="profile-danger__blocked" role="alert">
          <p>{blocked.message}</p>
          {blocked.balances.length > 0 && (
            <ul aria-label="Saldos pendientes">
              {blocked.balances.map((balance) => (
                <li key={balance.currency}>{formatBalance(balance)}</li>
              ))}
            </ul>
          )}
          <Link to="/dashboard/operaciones/intercambio">Ir a Intercambio de balance para convertir tus fondos</Link>
        </div>
      )}

      <div>
        <button type="button" className="btn btn--ghost profile-danger__button" onClick={() => setOpen(true)}>
          Cerrar mi cuenta
        </button>
      </div>

      <ConfirmDialog
        open={open}
        title="¿Cerrar tu cuenta?"
        confirmLabel="Cerrar mi cuenta"
        onConfirm={handleConfirm}
        onCancel={reset}
        busy={busy}
      >
        <p>Esta acción no se puede deshacer desde la app. Ingresa tu contraseña para confirmar.</p>
        <label className="profile-danger__field">
          <span>Contraseña</span>
          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleConfirm()
            }}
            autoComplete="current-password"
            aria-invalid={error !== ''}
            autoFocus
          />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
      </ConfirmDialog>
    </section>
  )
}

export default CloseAccountSection
