import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AlertsProvider, useAlerts } from '../src/contexts/AlertsContext'
import type { AlertRule } from '../src/types/alerts'

const service = vi.hoisted(() => ({
  getAlerts: vi.fn(),
  getNotifications: vi.fn(),
  createAlert: vi.fn(),
  updateAlert: vi.fn(),
  deleteAlert: vi.fn(),
  markNotificationRead: vi.fn(),
  deleteNotification: vi.fn(),
  createLocalNotification: vi.fn((_userId, notification) => notification),
}))

vi.mock('../src/services/alerts.service', () => service)

const lowBalanceAlert: AlertRule = {
  id: 'alert-low-eur',
  kind: 'low_balance',
  currency: 'EUR',
  base_currency: 'USD',
  direction: 'down',
  threshold: 2,
  enabled: true,
  email_enabled: false,
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
}

const depositAlert: AlertRule = {
  ...lowBalanceAlert,
  id: 'alert-deposit-usd',
  kind: 'deposit_received',
  currency: 'USD',
}

function Harness() {
  const context = useAlerts()
  return (
    <>
      <span data-testid="notification-count">{context.notifications.length}</span>
      <span data-testid="alert-count">{context.alerts.length}</span>
      <button onClick={() => context.recordDeposit({ transactionId: 'tx-deposit', currency: 'USD', amount: '500', newBalance: '500', createdAt: '2026-10-01T12:00:00.000Z' })}>Recarga de prueba</button>
      <button onClick={() => context.recordExchange({ transactionId: 'tx-exchange', fromCurrency: 'EUR', fromBalance: '1.3', toCurrency: 'USD', toBalance: '500', createdAt: '2026-10-01T12:01:00.000Z' })}>Compra de prueba</button>
      <button onClick={() => context.addAlert({ kind: 'daily_change', currency: 'EUR', base_currency: 'USD', direction: 'up', threshold: 2, email_enabled: false })}>Crear regla</button>
      <button onClick={() => context.editAlert('alert-low-eur', { kind: 'low_balance', currency: 'EUR', base_currency: 'USD', direction: 'down', threshold: 5, email_enabled: false })}>Editar regla</button>
      <button onClick={() => context.removeNotification('local-alert-deposit-usd-tx-deposit-deposit')}>Eliminar notificación</button>
    </>
  )
}

describe('AlertsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.getAlerts.mockResolvedValue([lowBalanceAlert, depositAlert])
    service.getNotifications.mockResolvedValue([])
    service.createAlert.mockImplementation(async (_userId, input) => ({ ...lowBalanceAlert, ...input, id: 'created-alert' }))
    service.updateAlert.mockImplementation(async (id, _userId, changes) => ({ ...lowBalanceAlert, id, ...changes }))
    service.deleteNotification.mockResolvedValue(undefined)
    service.createLocalNotification.mockImplementation((_userId, notification) => notification)
  })

  it('dispara recarga recibida y saldo bajo después de operaciones reales', async () => {
    const user = userEvent.setup()
    render(<AlertsProvider><Harness /></AlertsProvider>)

    await waitFor(() => expect(service.getAlerts).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId('alert-count')).toHaveTextContent('2'))
    await user.click(screen.getByRole('button', { name: 'Recarga de prueba' }))
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1')

    await user.click(screen.getByRole('button', { name: 'Compra de prueba' }))
    expect(service.createLocalNotification).toHaveBeenCalledTimes(2)
  })

  it('expone las operaciones CRUD de reglas y elimina notificaciones', async () => {
    const user = userEvent.setup()
    render(<AlertsProvider><Harness /></AlertsProvider>)

    await waitFor(() => expect(screen.getByTestId('alert-count')).toHaveTextContent('2'))
    await user.click(screen.getByRole('button', { name: 'Crear regla' }))
    expect(service.createAlert).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Editar regla' }))
    expect(service.updateAlert).toHaveBeenCalledWith('alert-low-eur', 'anonymous', expect.objectContaining({ threshold: 5 }))
    await user.click(screen.getByRole('button', { name: 'Eliminar notificación' }))
    expect(service.deleteNotification).toHaveBeenCalledWith('anonymous', 'local-alert-deposit-usd-tx-deposit-deposit')
  })
})