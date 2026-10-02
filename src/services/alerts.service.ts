import { ApiError, api } from './api'
import type { AlertRule, CreateAlertInput, Notification } from '../types/alerts'

const ALERTS_STORAGE_KEY = 'nexpay_alert_rules'
const NOTIFICATIONS_STORAGE_KEY = 'nexpay_notifications'
const LOCAL_ALERT_KINDS = new Set(['low_balance', 'deposit_received'])

function scopedKey(key: string, userId: string): string {
  return `${key}:${userId}`
}

function localRules(userId: string): AlertRule[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(scopedKey(ALERTS_STORAGE_KEY, userId)) ?? '[]')
    return Array.isArray(value) ? (value as AlertRule[]) : []
  } catch {
    return []
  }
}

function localNotifications(userId: string): Notification[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(scopedKey(NOTIFICATIONS_STORAGE_KEY, userId)) ?? '[]')
    return Array.isArray(value) ? (value as Notification[]) : []
  } catch {
    return []
  }
}

function saveRules(userId: string, rules: AlertRule[]) {
  localStorage.setItem(scopedKey(ALERTS_STORAGE_KEY, userId), JSON.stringify(rules))
}

function saveNotifications(userId: string, notifications: Notification[]) {
  localStorage.setItem(scopedKey(NOTIFICATIONS_STORAGE_KEY, userId), JSON.stringify(notifications))
}

function canUseLocalFallback(error: unknown): boolean {
  const status = (error as ApiError).status
  return status === 404 || status === 405 || status === 501
}

function unwrap<T>(payload: { data?: T } | T): T {
  if (typeof payload === 'object' && payload !== null && 'data' in payload && payload.data !== undefined) {
    return payload.data as T
  }
  return payload as T
}

function localAlert(input: CreateAlertInput): AlertRule {
  const now = new Date().toISOString()
  return { ...input, id: `local-${crypto.randomUUID()}`, enabled: true, created_at: now, updated_at: now }
}

export async function getAlerts(userId: string): Promise<AlertRule[]> {
  try {
    const response = await api.get<{ data: AlertRule[] }>('/api/alerts')
    const serverRules = unwrap(response.data)
    const local = localRules(userId)
    const seen = new Set(serverRules.map((rule) => rule.id))
    return [...serverRules, ...local.filter((rule) => !seen.has(rule.id))]
  } catch (error) {
    if (canUseLocalFallback(error)) return localRules(userId)
    throw error
  }
}

export async function createAlert(userId: string, input: CreateAlertInput): Promise<AlertRule> {
  try {
    const response = await api.post<{ data: AlertRule }>('/api/alerts', input)
    return unwrap(response.data)
  } catch (error) {
    if (!canUseLocalFallback(error)) throw error
    if (!LOCAL_ALERT_KINDS.has(input.kind)) {
      throw new ApiError('http', 'Esta alerta requiere que el backend evalúe las tasas.', 501)
    }
    const rule = localAlert(input)
    saveRules(userId, [...localRules(userId), rule])
    return rule
  }
}

export async function updateAlert(
  id: string,
  userId: string,
  changes: Partial<Pick<AlertRule, 'kind' | 'currency' | 'base_currency' | 'direction' | 'threshold' | 'enabled' | 'email_enabled'>>,
): Promise<AlertRule> {
  try {
    const response = await api.patch<{ data: AlertRule }>(`/api/alerts/${id}`, changes)
    return unwrap(response.data)
  } catch (error) {
    if (!canUseLocalFallback(error)) throw error
    const rule = localRules(userId).find((item) => item.id === id)
    if (!rule) throw error
    const updated = { ...rule, ...changes, updated_at: new Date().toISOString() }
    saveRules(userId, localRules(userId).map((item) => (item.id === id ? updated : item)))
    return updated
  }
}

export async function deleteAlert(userId: string, id: string): Promise<void> {
  const rules = localRules(userId)
  const localRuleExists = rules.some((item) => item.id === id)
  if (id.startsWith('local-')) {
    if (!localRuleExists) throw new ApiError('http', 'La alerta local no existe.', 404)
    saveRules(userId, rules.filter((item) => item.id !== id))
    return
  }

  try {
    await api.delete(`/api/alerts/${id}`)
  } catch (error) {
    if (!canUseLocalFallback(error) || !localRuleExists) throw error
  }

  if (localRuleExists) saveRules(userId, rules.filter((item) => item.id !== id))
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const response = await api.get<{ data: Notification[] }>('/api/notifications')
    const serverNotifications = unwrap(response.data)
    const local = localNotifications(userId)
    const seen = new Set(serverNotifications.map((notification) => notification.id))
    return [...serverNotifications, ...local.filter((notification) => !seen.has(notification.id))].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )
  } catch (error) {
    if (canUseLocalFallback(error)) return localNotifications(userId)
    throw error
  }
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  if (id.startsWith('local-')) {
    saveNotifications(userId, localNotifications(userId).map((item) => (item.id === id ? { ...item, read: true } : item)))
    return
  }
  try {
    await api.patch(`/api/notifications/${id}`, { read: true })
  } catch (error) {
    if (!canUseLocalFallback(error)) throw error
    saveNotifications(userId, localNotifications(userId).map((item) => (item.id === id ? { ...item, read: true } : item)))
  }
}

export function createLocalNotification(userId: string, notification: Notification): Notification {
  if (userId !== 'anonymous') {
    try {
      const apiRequest = api.post<{ data: Notification }>('/api/notifications', {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        alert_id: notification.alert_id ?? null,
      })
      void apiRequest.then((response) => {
        const created = unwrap(response.data)
        const current = localNotifications(userId)
        if (!current.some((item) => item.id === created.id)) {
          saveNotifications(userId, [created, ...current])
        }
      }).catch(() => undefined)
    } catch {
      // El fallback local se usa si la API no está disponible.
    }
  }

  const current = localNotifications(userId)
  if (current.some((item) => item.id === notification.id)) return notification
  saveNotifications(userId, [notification, ...current])
  return notification
}

export async function deleteNotification(userId: string, id: string): Promise<void> {
  if (id.startsWith('local-')) {
    saveNotifications(userId, localNotifications(userId).filter((item) => item.id !== id))
    return
  }
  try {
    await api.delete(`/api/notifications/${id}`)
  } catch (error) {
    if (!canUseLocalFallback(error)) throw error
    saveNotifications(userId, localNotifications(userId).filter((item) => item.id !== id))
  }
}