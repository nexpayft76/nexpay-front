import { useEffect, useState, type FormEvent } from 'react'
import { useAlerts } from '../../contexts/AlertsContext'
import { usePreferences } from '../../contexts/PreferencesContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import type { AlertDirection, AlertKind, CreateAlertInput } from '../../types/alerts'
import type { CurrencyCode } from '../../types/currency'
import { CURRENCY_CODES } from '../../utils/currencies'
import Icon from '../../components/common/Icon'
import './AlertsPage.css'

const initialForm: CreateAlertInput = {
  kind: 'daily_change',
  currency: 'EUR',
  base_currency: 'USD',
  direction: 'up',
  threshold: 2,
  email_enabled: false,
}

function formatRule(kind: AlertKind, currency: string, base: string, direction: AlertDirection, threshold: number) {
  if (kind === 'daily_change') {
    return `Avisarme si ${currency} ${direction === 'up' ? 'sube' : 'baja'} más del ${threshold}% frente a ayer.`
  }
  if (kind === 'target_rate') {
    return `Avisarme si 1 ${base} ${direction === 'up' ? 'supera' : 'baja de'} ${threshold} ${currency}.`
  }
  if (kind === 'low_balance') {
    return `Avisarme si mi saldo en ${currency} baja de ${threshold} ${currency}.`
  }
  if (kind === 'stale_rates') {
    return `Avisarme si las tasas de ${currency} llevan más de ${threshold} minutos sin actualizarse.`
  }
  return `Avisarme cada vez que reciba una recarga en ${currency}.`
}

function AlertsPage() {
  useDocumentTitle('Alertas')
  const { alerts, loading, error, addAlert, editAlert, toggleAlert, removeAlert, rateAlertsAvailable } = useAlerts()
  const { emailNotifications } = usePreferences()
  const [form, setForm] = useState(() => ({ ...initialForm, email_enabled: emailNotifications }))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const isRateRule = form.kind === 'daily_change' || form.kind === 'target_rate'
  const needsThreshold = form.kind !== 'deposit_received'
  const backendRuleKinds: AlertKind[] = ['daily_change', 'target_rate', 'stale_rates']

  useEffect(() => {
    if (rateAlertsAvailable === false && !editingId && backendRuleKinds.includes(form.kind)) {
      setForm((current) => ({ ...current, kind: 'low_balance' }))
    }
  }, [editingId, form.kind, rateAlertsAvailable])

  function updateForm<K extends keyof CreateAlertInput>(key: K, value: CreateAlertInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (needsThreshold && (!form.threshold || form.threshold <= 0)) {
      setFormError('Escribe un umbral mayor que cero.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editingId) await editAlert(editingId, form)
      else await addAlert(form)
      setForm({ ...initialForm, email_enabled: emailNotifications })
      setEditingId(null)
    } catch {
      setFormError('No pudimos guardar la alerta. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  function startEditing(alert: (typeof alerts)[number]) {
    setEditingId(alert.id)
    setForm({
      kind: alert.kind,
      currency: alert.currency,
      base_currency: alert.base_currency,
      direction: alert.direction,
      threshold: alert.threshold,
      email_enabled: alert.email_enabled,
    })
    setFormError(null)
  }

  function cancelEditing() {
    setEditingId(null)
    setForm({ ...initialForm, email_enabled: emailNotifications })
    setFormError(null)
  }

  return (
    <section className="dashboard-content alerts-page" aria-labelledby="alerts-title">
      <header className="alerts-page__hero">
        <div>
          <p className="dashboard-eyebrow">Centro de notificaciones</p>
          <h1 id="alerts-title">Tus notificaciones</h1>
          <p>Aquí se reúnen tus alertas de tasas, movimientos de tu wallet y avisos importantes de NexPay.</p>
        </div>
        <div className="alerts-page__mark" aria-hidden="true">
          <Icon name="bell" size={30} />
        </div>
      </header>

      <div className="alerts-page__layout">
        <form className="alert-form" onSubmit={handleSubmit}>
          <div className="alert-form__heading">
            <div>
              <p className="dashboard-eyebrow">{editingId ? 'Editar regla' : 'Nueva regla'}</p>
              <h2>{editingId ? 'Actualiza cuándo avisarte' : 'Elige cuándo avisarte'}</h2>
            </div>
          </div>

          <label className="field">
            <span>Tipo de alerta</span>
            <select value={form.kind} onChange={(event) => updateForm('kind', event.target.value as AlertKind)}>
              <option value="daily_change" disabled={rateAlertsAvailable === false}>Variación diaria</option>
              <option value="target_rate" disabled={rateAlertsAvailable === false}>Tasa objetivo</option>
              <option value="low_balance">Saldo bajo</option>
              <option value="stale_rates" disabled={rateAlertsAvailable === false}>Fuente desactualizada</option>
              <option value="deposit_received">Recarga recibida</option>
            </select>
          </label>

          <div className={`alert-form__pair${isRateRule ? '' : ' alert-form__pair--compact'}`}>
            <label className="field">
              <span>Moneda</span>
              <select value={form.currency} onChange={(event) => updateForm('currency', event.target.value as CurrencyCode)}>
                {CURRENCY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
            {isRateRule ? (
              <label className="field">
                <span>Comparada con</span>
                <select value={form.base_currency} onChange={(event) => updateForm('base_currency', event.target.value as CurrencyCode)}>
                  {CURRENCY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
            ) : (
              <p className="alert-form__hint">
                {form.kind === 'low_balance' ? 'Vigila el saldo disponible de esta moneda.' : 'Te avisaremos si la fuente deja de publicar datos recientes.'}
              </p>
            )}
          </div>

          {needsThreshold ? <div className={`alert-form__pair${isRateRule ? '' : ' alert-form__pair--single'}`}>
            {isRateRule ? (
              <label className="field">
                <span>Condición</span>
                <select value={form.direction} onChange={(event) => updateForm('direction', event.target.value as AlertDirection)}>
                  <option value="up">Sube más de</option>
                  <option value="down">Baja más de</option>
                </select>
              </label>
            ) : null}
            <label className="field">
              <span>
                {form.kind === 'daily_change' && 'Porcentaje'}
                {form.kind === 'target_rate' && `Valor en ${form.currency}`}
                {form.kind === 'low_balance' && `Avisar cuando baje de ${form.currency}`}
                {form.kind === 'stale_rates' && 'Tiempo sin actualizar'}
              </span>
              <span className="field__input-wrap">
                <input
                  type="number"
                  min={form.kind === 'target_rate' ? '0' : '0.01'}
                  step={form.kind === 'target_rate' ? 'any' : '0.01'}
                  value={form.threshold}
                  onChange={(event) => updateForm('threshold', Number(event.target.value))}
                  required
                />
                <b>
                  {form.kind === 'daily_change' && '%'}
                  {form.kind === 'target_rate' && form.currency}
                  {form.kind === 'low_balance' && form.currency}
                  {form.kind === 'stale_rates' && 'min'}
                </b>
              </span>
            </label>
          </div> : (
            <p className="alert-form__event-note">Se activará cuando una recarga de {form.currency} se registre correctamente en tu wallet.</p>
          )}

          <label className="check-row">
            <input type="checkbox" checked={form.email_enabled} onChange={(event) => updateForm('email_enabled', event.target.checked)} />
            <span><strong>También enviarme un email</strong><small>Se enviará a tu correo registrado cuando SES esté conectado.</small></span>
          </label>

          <p className="alert-form__preview">{formatRule(form.kind, form.currency, form.base_currency, form.direction, form.threshold || 0)}</p>
          {(formError || error) && <p className="alerts-error" role="alert">{formError ?? error}</p>}
          <div className="alert-form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear alerta'}
            </button>
            {editingId && <button type="button" className="btn btn--ghost" onClick={cancelEditing}>Cancelar</button>}
          </div>
        </form>

        <section className="alert-list" aria-labelledby="active-alerts-title">
          <div className="alert-list__heading">
            <div>
              <p className="dashboard-eyebrow">Tus reglas</p>
              <h2 id="active-alerts-title">Alertas activas</h2>
            </div>
            <span>{alerts.filter((alert) => alert.enabled).length} activas</span>
          </div>
          {loading ? (
            <div className="alert-list__empty" aria-busy="true">Cargando tus alertas…</div>
          ) : alerts.length === 0 ? (
            <div className="alert-list__empty"><strong>Aún no tienes alertas.</strong><span>Crea una regla y deja que NexPay vigile el movimiento por ti.</span></div>
          ) : (
            <ul>
              {alerts.map((alert) => (
                <li key={alert.id} className={!alert.enabled ? 'is-disabled' : undefined}>
                  <div className="alert-list__icon"><Icon name="bell" size={18} /></div>
                  <div className="alert-list__copy">
                    <strong>{formatRule(alert.kind, alert.currency, alert.base_currency, alert.direction, alert.threshold)}</strong>
                    <span>{alert.email_enabled ? 'Campanita + email' : 'Solo campanita'}</span>
                  </div>
                  <div className="alert-list__actions">
                    <button type="button" className="alert-list__edit" onClick={() => startEditing(alert)} aria-label="Editar alerta" title="Editar alerta">
                      <Icon name="edit" size={16} />
                    </button>
                    <label className="switch" title={alert.enabled ? 'Desactivar alerta' : 'Activar alerta'}>
                      <input
                        type="checkbox"
                        checked={alert.enabled}
                        onChange={() => toggleAlert(alert)}
                        aria-label={`${alert.enabled ? 'Desactivar' : 'Activar'} alerta: ${formatRule(alert.kind, alert.currency, alert.base_currency, alert.direction, alert.threshold)}`}
                      />
                      <span />
                    </label>
                    <button type="button" className="alert-list__delete" onClick={() => removeAlert(alert.id)} aria-label="Eliminar alerta" title="Eliminar alerta">×</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </section>
  )
}

export default AlertsPage