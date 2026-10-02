import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotificationBell from '../src/components/notifications/NotificationBell'
import NotificationToast from '../src/components/notifications/NotificationToast'
import { AlertsProvider, useAlerts } from '../src/contexts/AlertsContext'

const service = vi.hoisted(() => ({
  getAlerts: vi.fn(),
  getNotifications: vi.fn(),
  deleteNotification: vi.fn(),
  markNotificationRead: vi.fn(),
  createLocalNotification: vi.fn((notification) => notification),
}))

vi.mock('../src/services/alerts.service', () => service)

const notification = {
  id: 'notification-1',
  type: 'system' as const,
  title: 'Recarga recibida',
  message: 'Sumaste 500 USD a tu wallet.',
  read: false,
  created_at: '2026-10-01T12:00:00.000Z',
}

function DepositTrigger() {
  const { recordDeposit } = useAlerts()
  return <button onClick={() => recordDeposit({ transactionId: 'tx-1', currency: 'USD', amount: '500', newBalance: '500', createdAt: notification.created_at })}>Disparar aviso</button>
}

describe('Notificaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.getAlerts.mockResolvedValue([
      {
        id: 'alert-1', kind: 'deposit_received', currency: 'USD', base_currency: 'USD', direction: 'up', threshold: 1,
        enabled: true, email_enabled: false, created_at: notification.created_at, updated_at: notification.created_at,
      },
    ])
    service.getNotifications.mockResolvedValue([notification])
    service.deleteNotification.mockResolvedValue(undefined)
  })

  it('muestra el panel, solo el título Notificaciones y permite eliminar una entrada', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><AlertsProvider><NotificationBell /></AlertsProvider></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: /Notificaciones/ }))
    expect(screen.getByRole('heading', { name: 'Notificaciones' })).toBeInTheDocument()
    expect(screen.queryByText('Centro NexPay')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Eliminar Recarga recibida' }))
    expect(service.deleteNotification).toHaveBeenCalledWith('notification-1')
  })

  it('muestra el aviso flotante y lo oculta después de tres segundos', async () => {
    vi.useFakeTimers()
    render(<AlertsProvider><NotificationToast /><DepositTrigger /></AlertsProvider>)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Disparar aviso' })))
    expect(screen.getByRole('status')).toHaveTextContent('Recarga recibida en USD')
    act(() => vi.advanceTimersByTime(3_000))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})