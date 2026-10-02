import { useState } from 'react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { usePreferences } from '../../contexts/PreferencesContext'
import type { ArsRateType } from '../../types/rates'
import type { CurrencyCode } from '../../types/currency'
import { CURRENCY_CODES } from '../../utils/currencies'
import Icon from '../../components/common/Icon'
import './PreferencesPage.css'

const ARS_OPTIONS: Array<{ value: ArsRateType; label: string; description: string }> = [
  { value: 'mep', label: 'MEP', description: 'Referencia principal de NexPay' },
  { value: 'oficial', label: 'Oficial', description: 'Cotización oficial bancaria' },
  { value: 'blue', label: 'Blue', description: 'Solo como referencia de mercado' },
]

function PreferencesPage() {
  useDocumentTitle('Preferencias')
  const preferences = usePreferences()
  const [saved, setSaved] = useState(false)

  function showSaved(action: () => void) {
    action()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <section className="dashboard-content preferences-page" aria-labelledby="preferences-title">
      <header className="preferences-page__hero">
        <div>
          <p className="dashboard-eyebrow">Configuración</p>
          <h1 id="preferences-title">Tus preferencias</h1>
          <p>Personaliza cómo ves tus saldos, cotizas tus monedas y recibes avisos en NexPay.</p>
        </div>
        <div className="preferences-page__mark" aria-hidden="true"><Icon name="settings" size={24} /></div>
      </header>

      <div className="preferences-page__sections">
        <section className="preference-section" aria-labelledby="currency-preference-title">
          <div className="preference-section__heading">
            <div><h2 id="currency-preference-title">Moneda principal</h2></div>
            <Icon name="wallet" size={21} />
          </div>
          <p className="preference-section__description">Será la moneda inicial para valorar tu wallet y abrir el gráfico del dashboard.</p>
          <label className="preference-field">
            <span>Mostrar valores en</span>
            <select value={preferences.defaultCurrency} onChange={(event) => showSaved(() => preferences.setDefaultCurrency(event.target.value as CurrencyCode))}>
              {CURRENCY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </label>
        </section>

        <section className="preference-section" aria-labelledby="ars-preference-title">
          <div className="preference-section__heading">
            <div><h2 id="ars-preference-title">Tipo de dólar para ARS</h2></div>
            <Icon name="calculator" size={21} />
          </div>
          <p className="preference-section__description">Se usará como selección inicial en el cotizador cuando intervenga el peso argentino.</p>
          <div className="preference-options" role="radiogroup" aria-label="Tipo de dólar para ARS">
            {ARS_OPTIONS.map((option) => (
              <label key={option.value} className={`preference-option${preferences.arsRate === option.value ? ' is-selected' : ''}`}>
                <input type="radio" name="ars-rate" value={option.value} checked={preferences.arsRate === option.value} onChange={() => showSaved(() => preferences.setArsRate(option.value))} />
                <span><strong>{option.label}</strong><small>{option.description}</small></span>
              </label>
            ))}
          </div>
        </section>

        <section className="preference-section" aria-labelledby="appearance-preference-title">
          <div className="preference-section__heading">
            <div><h2 id="appearance-preference-title">Modo de la interfaz</h2></div>
            <Icon name="eye" size={21} />
          </div>
          <div className="preference-options preference-options--inline" role="radiogroup" aria-label="Modo de la interfaz">
            <label className={`preference-option${preferences.theme === 'dark' ? ' is-selected' : ''}`}>
              <input type="radio" name="theme" checked={preferences.theme === 'dark'} onChange={() => showSaved(() => preferences.setPreferredTheme('dark'))} />
              <span><strong>Oscuro</strong><small>Negro y dorado</small></span>
            </label>
            <label className={`preference-option${preferences.theme === 'light' ? ' is-selected' : ''}`}>
              <input type="radio" name="theme" checked={preferences.theme === 'light'} onChange={() => showSaved(() => preferences.setPreferredTheme('light'))} />
              <span><strong>Claro</strong><small>Marfil y dorado</small></span>
            </label>
          </div>
        </section>

        <section className="preference-section" aria-labelledby="notification-preference-title">
          <div className="preference-section__heading">
            <div><h2 id="notification-preference-title">Cómo quieres enterarte</h2></div>
            <Icon name="bell" size={21} />
          </div>
          <div className="preference-toggles">
            <label className="preference-toggle"><span><strong>Avisos en pantalla</strong><small>Mostrar el aviso flotante y guardarlo en la campana.</small></span><input type="checkbox" checked={preferences.inAppNotifications} onChange={(event) => showSaved(() => preferences.setInAppNotifications(event.target.checked))} /><i /></label>
            <label className="preference-toggle"><span><strong>Notificaciones por email</strong><small>Valor predeterminado para nuevas alertas; el backend enviará el email cuando SES esté conectado.</small></span><input type="checkbox" checked={preferences.emailNotifications} onChange={(event) => showSaved(() => preferences.setEmailNotifications(event.target.checked))} /><i /></label>
          </div>
        </section>
      </div>

      <p className={`preferences-page__saved${saved ? ' is-visible' : ''}`} role="status">Preferencia guardada</p>
    </section>
  )
}

export default PreferencesPage