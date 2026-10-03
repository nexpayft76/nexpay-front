import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Notification } from '../src/types/alerts'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../src/services/api', () => ({
  api,
  ApiError: class ApiError extends Error {
    status?: number
  },
}))

import { createLocalNotification, getNotifications } from '../src/services/alerts.service'

const localNotification: Notification = {
  id: 'local-alert-1-tx-1-deposit',
  type: 'system',
  title: 'Recarga recibida en EUR',
  message: 'Sumaste 50.00 EUR a tu wallet.',
  read: false,
  created_at: '2026-10-03T12:00:00.000Z',
  alert_id: 'alert-1',
}

const serverNotification: Notification = {
  ...localNotification,
  id: 'server-notification-1',
  created_at: '2026-10-03T12:00:01.000Z',
}

describe('alerts service notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('persists a notification remotely without creating a second local copy', async () => {
    api.post.mockResolvedValue({ data: { data: serverNotification } })

    const created = await createLocalNotification('user-1', localNotification)

    expect(api.post).toHaveBeenCalledOnce()
    expect(created).toEqual(serverNotification)
    expect(localStorage.getItem('nexpay_notifications:user-1')).toBeNull()
  })

  it('removes previously saved local copies when loading their server notification', async () => {
    localStorage.setItem('nexpay_notifications:user-1', JSON.stringify([localNotification]))
    api.get.mockResolvedValue({ data: { data: [serverNotification] } })

    const notifications = await getNotifications('user-1')

    expect(notifications).toEqual([serverNotification])
    expect(JSON.parse(localStorage.getItem('nexpay_notifications:user-1') ?? '[]')).toEqual([])
  })
})
