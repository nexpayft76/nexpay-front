import { api, type ApiError } from './api'
import type { AlertRule, CreateAlertInput, Notification } from '../types/alerts'

const ALERTS_STORAGE_KEY = 'nexpay_alert_rules'
const NOTIFICATIONS_STORAGE_KEY = 'nexpay_notifications'

function localRules(): AlertRule[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(ALERTS_STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? (value as AlertRule[]) : []
  } catch {
    return []
  }
}

function localNotifications(): Notification[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? (value as Notification[]) : []
  } catch {
    return []
  }
}

function saveRules(rules: AlertRule[]) {
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(rules))
}

function saveNotifications(notifications: Notification[]) {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications))
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

export async function getAlerts(): Promise<AlertRule[]> {
  try {
    const response = await api.get<{ data: AlertRule[] }>('/api/alerts')
    return unwrap(response.data)
  } catch (error) {
    if (canUseLocalFallback(error)) return localRules()
    throw error
  }
}

export async function createAlert(input: CreateAlertInput): Promise<AlertRule> {
  try {
    const response = await api.post<{ data: AlertRule }>('/api/alerts', input)
    return unwrap(response.data)
  } catch (error) {
    if (!canUseLocalFallback(error)) throw error
    const rule = localAlert(input)
    saveRules([...localRules(), rule])
    return rule
  }
}

export async function updateAlert(id: string, changes: Partial<Pick<AlertRule, 'enabled' | 'email_enabled'>>): Promise<AlertRule> {
  try {
    const response = await api.patch<{ data: AlertRule }>(`/api/alerts/${id}`, changes)
    return unwrap(response.data)
  } catch (error) {
    if (!canUseLocalFallback(error)) throw error
    const rule = localRules().find((item) => item.id === id)
    if (!rule) throw error
    const updated = { ...rule, ...changes, updated_at: new Date().toISOString() }
    saveRules(localRules().map((item) => (item.id === id ? updated : item)))
    return updated
  }
}

export async function deleteAlert(id: string): Promise<void> {
  try {
    await api.delete(`/api/alerts/${id}`)
  } catch (error) {
    if (!canUseLocalFallback(error)) throw error
    saveRules(localRules().filter((item) => item.id !== id))
  }
}

export async function getNotifications(): Promise<Notification[]> {
  try {
    const response = await api.get<{ data: Notification[] }>('/api/notifications')
    const serverNotifications = unwrap(response.data)
    const local = localNotifications()
    const seen = new Set(serverNotifications.map((notification) => notification.id))
    return [...serverNotifications, ...local.filter((notification) => !seen.has(notification.id))].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )
  } catch (error) {
    if (canUseLocalFallback(error)) return localNotifications()
    throw error
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await api.patch(`/api/notifications/${id}`, { read: true })
  } catch (error) {
    if (!canUseLocalFallback(error)) throw error
    saveNotifications(localNotifications().map((item) => (item.id === id ? { ...item, read: true } : item)))
  }
}

export function createLocalNotification(notification: Notification): Notification {
  const current = localNotifications()
  if (current.some((item) => item.id === notification.id)) return notification
  saveNotifications([notification, ...current])
  return notification
}