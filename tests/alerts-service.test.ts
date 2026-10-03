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

  it('awaits remote persistence and caches its ID with the stable source event key', async () => {
    api.post.mockResolvedValue({ data: { data: serverNotification } })

    const created = await createLocalNotification('user-1', localNotification)

    expect(api.post).toHaveBeenCalledOnce()
    expect(created).toEqual(serverNotification)
    expect(JSON.parse(localStorage.getItem('nexpay_notifications:user-1') ?? '[]')).toEqual([
      { ...serverNotification, source_event_key: localNotification.id },
    ])

    api.get.mockResolvedValue({ data: { data: [serverNotification] } })
    expect(await getNotifications('user-1')).toEqual([
      { ...serverNotification, source_event_key: localNotification.id },
    ])
    expect(JSON.parse(localStorage.getItem('nexpay_notifications:user-1') ?? '[]')).toEqual([
      { ...serverNotification, source_event_key: localNotification.id },
    ])

    const retried = await createLocalNotification('user-1', localNotification)
    expect(retried).toEqual({ ...serverNotification, source_event_key: localNotification.id })
    expect(api.post).toHaveBeenCalledOnce()
  })

  it('does not resolve or save locally before the backend confirms creation', async () => {
    let finishPost!: (response: { data: { data: Notification } }) => void
    api.post.mockReturnValue(new Promise((resolve) => {
      finishPost = resolve
    }))
    let resolved = false
    const pending = createLocalNotification('user-1', localNotification).then((result) => {
      resolved = true
      return result
    })

    await Promise.resolve()
    expect(resolved).toBe(false)
    expect(localStorage.getItem('nexpay_notifications:user-1')).toBeNull()

    finishPost({ data: { data: serverNotification } })
    expect(await pending).toEqual(serverNotification)
    expect(resolved).toBe(true)
  })

  it('deduplicates a legacy local copy with a backend notification that has a different ID and timestamp', async () => {
    localStorage.setItem('nexpay_notifications:user-1', JSON.stringify([localNotification]))
    api.get.mockResolvedValue({ data: { data: [serverNotification] } })

    const notifications = await getNotifications('user-1')

    expect(notifications).toEqual([serverNotification])
    expect(JSON.parse(localStorage.getItem('nexpay_notifications:user-1') ?? '[]')).toEqual([])
  })

  it('does not replace backend failures with a local success-shaped fallback', async () => {
    const failure = Object.assign(new Error('server error'), { status: 500 })
    api.post.mockRejectedValue(failure)

    await expect(createLocalNotification('user-1', localNotification)).rejects.toBe(failure)
    expect(localStorage.getItem('nexpay_notifications:user-1')).toBeNull()
  })
})
