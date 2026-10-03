import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AlertsPage from '../src/pages/Alerts/AlertsPage'

const alertsContext = vi.hoisted(() => ({
  alerts: [
    {
      id: 'alert-rate',
      kind: 'target_rate',
      currency: 'EUR',
      base_currency: 'USD',
      direction: 'up',
      threshold: 1.2,
      enabled: true,
      email_enabled: false,
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'alert-balance',
      kind: 'low_balance',
      currency: 'COP',
      base_currency: 'USD',
      direction: 'down',
      threshold: 123.4,
      enabled: true,
      email_enabled: false,
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-01T10:00:00.000Z',
    },
  ],
  loading: false,
  error: null,
  addAlert: vi.fn(),
  editAlert: vi.fn(),
  toggleAlert: vi.fn(),
  removeAlert: vi.fn(),
  rateAlertsAvailable: true,
}))

vi.mock('../src/contexts/AlertsContext', () => ({
  useAlerts: () => alertsContext,
}))
vi.mock('../src/contexts/PreferencesContext', () => ({
  usePreferences: () => ({ emailNotifications: false }),
}))
vi.mock('../src/hooks/useDocumentTitle', () => ({
  useDocumentTitle: vi.fn(),
}))
vi.mock('../src/components/common/Icon', () => ({
  default: () => null,
}))

describe('AlertsPage', () => {
  it('shows alert thresholds with exactly two decimal places', () => {
    render(<AlertsPage />)

    expect(screen.getByText('Avisarme si 1 USD supera 1.20 EUR.')).toBeInTheDocument()
    expect(screen.getByText('Avisarme si mi saldo en COP baja de 123.40 COP.')).toBeInTheDocument()
  })
})
