import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import PreferencesPage from '../src/pages/Preferences/PreferencesPage'
import { PreferencesProvider } from '../src/contexts/PreferencesContext'

const PREFERENCES_STORAGE_KEY = 'nexpay_preferences:anonymous'

describe('Preferencias', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = 'dark'
  })

  it('guarda la moneda principal y el tipo de dólar ARS', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <PreferencesProvider>
          <PreferencesPage />
        </PreferencesProvider>
      </MemoryRouter>,
    )

    await user.selectOptions(screen.getByLabelText('Mostrar valores en'), 'COP')
    await user.click(screen.getByRole('radio', { name: /MEP/i }))

    const saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? '{}')
    expect(saved.defaultCurrency).toBe('COP')
    expect(saved.arsRate).toBe('mep')
  })

  it('mantiene email apagado por defecto y permite activar avisos', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <PreferencesProvider>
          <PreferencesPage />
        </PreferencesProvider>
      </MemoryRouter>,
    )

    const email = screen.getByRole('checkbox', { name: /Notificaciones por email/i })
    expect(email).not.toBeChecked()
    await user.click(email)

    expect(email).toBeChecked()
    expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? '{}').emailNotifications).toBe(true)
  })
})