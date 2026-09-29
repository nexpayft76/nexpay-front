import { useEffect, useRef, type ReactNode } from 'react'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  /** Detalle de lo que va a pasar (montos, monedas, tasa). */
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  /** Mientras se procesa: botones desactivados. */
  busy?: boolean
}

/**
 * Confirmación antes de mover dinero. Usa <dialog> del navegador: bloquea el resto de la página,
 * mantiene el foco adentro y se cierra con Esc (equivale a "Cancelar").
 */
function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, busy = false }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <div className="confirm-dialog__icon" aria-hidden="true">
        !
      </div>
      <h2 id="confirm-dialog-title">{title}</h2>
      <div className="confirm-dialog__body">{children}</div>
      <div className="confirm-dialog__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className="btn btn--primary" onClick={onConfirm} disabled={busy} autoFocus>
          {busy ? 'Procesando…' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

export default ConfirmDialog
