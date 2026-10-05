import { useEffect, useState, type FormEvent } from 'react'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { ApiError } from '../../services/api'
import { getFeeSettings, updateFeeSettings } from '../../services/superuser.service'
import type { FeeSettings } from '../../types/superuser'
import { formatDateTime } from '../../utils/time'

type LoadState = { status: 'loading' } | { status: 'ok'; data: FeeSettings } | { status: 'error'; message: string }

/** "0,05" → 0.05. Acepta coma o punto; NaN si no es un número. */
function parsePercent(text: string): number {
  const normalized = text.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN
}

function toText(value: number): string {
  return String(value).replace('.', ',')
}

/** Mismo rango que valida el back: 0 a 10 %, hasta 4 decimales. */
function percentError(value: number): string | undefined {
  if (Number.isNaN(value)) return 'Escribe un número, ej. 0,05'
  if (value > 10) return 'Como máximo 10%'
  if (Math.abs(value * 10_000 - Math.round(value * 10_000)) > 1e-6) return 'Como máximo 4 decimales'
  return undefined
}

/** Comisiones de la plataforma: el superusuario las decide; rigen desde la próxima operación. */
function FeeSettingsForm() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [exchangeText, setExchangeText] = useState('')
  const [p2pText, setP2pText] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    getFeeSettings()
      .then((data) => {
        if (cancelled) return
        setState({ status: 'ok', data })
        setExchangeText(toText(data.exchange_fee_percent))
        setP2pText(toText(data.p2p_fee_percent))
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: error instanceof ApiError ? error.message : 'No se pudieron cargar las comisiones.' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return (
      <p className="op-summary op-summary--empty" aria-busy="true">
        Cargando comisiones…
      </p>
    )
  }
  if (state.status === 'error') {
    return (
      <p className="op-error" role="alert">
        {state.message}
      </p>
    )
  }

  const current = state.data
  const exchange = parsePercent(exchangeText)
  const p2p = parsePercent(p2pText)
  const exchangeError = percentError(exchange)
  const p2pError = percentError(p2p)
  const changed = exchange !== current.exchange_fee_percent || p2p !== current.p2p_fee_percent
  const canSave = !exchangeError && !p2pError && changed && !saving

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canSave) setConfirming(true)
  }

  async function save() {
    setSaving(true)
    try {
      const data = await updateFeeSettings({ exchange_fee_percent: exchange, p2p_fee_percent: p2p })
      setState({ status: 'ok', data })
      setNotice({ kind: 'ok', text: 'Comisiones actualizadas. Rigen desde la próxima operación.' })
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof ApiError ? error.message : 'No se pudieron guardar las comisiones.' })
    } finally {
      setSaving(false)
      setConfirming(false)
    }
  }

  return (
    <form className="op-card fee-settings" onSubmit={handleSubmit} noValidate>
      <div className="op-card__header">
        <h2>Comisiones vigentes</h2>
      </div>

      <div className="fee-settings__fields">
        <div className="op-field">
          <label className="op-field__label" htmlFor="fee-exchange">
            Intercambio de balance (%)
          </label>
          <input
            id="fee-exchange"
            className="op-input"
            inputMode="decimal"
            value={exchangeText}
            onChange={(event) => setExchangeText(event.target.value)}
            aria-invalid={exchangeError !== undefined}
            aria-describedby="fee-exchange-hint"
          />
          <span id="fee-exchange-hint" className={exchangeError ? 'op-field-error' : 'op-hint'}>
            {exchangeError ?? 'Del monto de origen. Ej. 0,05 = 0,05%'}
          </span>
        </div>

        <div className="op-field">
          <label className="op-field__label" htmlFor="fee-p2p">
            P2P, cada parte (%)
          </label>
          <input
            id="fee-p2p"
            className="op-input"
            inputMode="decimal"
            value={p2pText}
            onChange={(event) => setP2pText(event.target.value)}
            aria-invalid={p2pError !== undefined}
            aria-describedby="fee-p2p-hint"
          />
          <span id="fee-p2p-hint" className={p2pError ? 'op-field-error' : 'op-hint'}>
            {p2pError ?? 'De lo que recibe cada parte. Ej. 0,5 = 0,5%'}
          </span>
        </div>
      </div>

      {notice && (
        <p className={notice.kind === 'ok' ? 'history-notice' : 'op-error'} role={notice.kind === 'ok' ? 'status' : 'alert'}>
          {notice.text}
        </p>
      )}

      <button type="submit" className="btn btn--primary" disabled={!canSave}>
        {saving ? 'Guardando…' : 'Guardar comisiones'}
      </button>
      {current.updated_at && (
        <p className="op-hint">
          Último cambio: {formatDateTime(current.updated_at)}
          {current.updated_by_email && ` por ${current.updated_by_email}`}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title="¿Cambias las comisiones?"
        confirmLabel="Sí, guardar"
        busy={saving}
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      >
        <p>
          Intercambio de balance: <strong>{toText(current.exchange_fee_percent)}%</strong> → <strong>{toText(exchange)}%</strong>
        </p>
        <p>
          P2P (cada parte): <strong>{toText(current.p2p_fee_percent)}%</strong> → <strong>{toText(p2p)}%</strong>
        </p>
        <p className="confirm-dialog__note">
          Rigen desde la próxima operación. Las ofertas P2P ya publicadas conservan la comisión con la que se publicaron.
        </p>
      </ConfirmDialog>
    </form>
  )
}

export default FeeSettingsForm
