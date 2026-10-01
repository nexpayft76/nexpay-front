import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  createAlert,
  deleteAlert,
  getAlerts,
  getNotifications,
  markNotificationRead,
  updateAlert,
} from '../services/alerts.service'
import type { AlertRule, CreateAlertInput, Notification } from '../types/alerts'

interface AlertsContextValue {
  alerts: AlertRule[]
  notifications: Notification[]
  loading: boolean
  error: string | null
  addAlert: (input: CreateAlertInput) => Promise<void>
  toggleAlert: (alert: AlertRule) => Promise<void>
  removeAlert: (id: string) => Promise<void>
  readNotification: (id: string) => Promise<void>
  unreadCount: number
}

const AlertsContext = createContext<AlertsContextValue | null>(null)

const EMPTY_ALERTS: AlertsContextValue = {
  alerts: [],
  notifications: [],
  loading: false,
  error: null,
  addAlert: async () => undefined,
  toggleAlert: async () => undefined,
  removeAlert: async () => undefined,
  readNotification: async () => undefined,
  unreadCount: 0,
}

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getAlerts(), getNotifications()])
      .then(([nextAlerts, nextNotifications]) => {
        if (cancelled) return
        setAlerts(nextAlerts)
        setNotifications(nextNotifications)
      })
      .catch(() => !cancelled && setError('No pudimos cargar tus alertas. Inténtalo de nuevo.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  async function addAlert(input: CreateAlertInput) {
    const created = await createAlert(input)
    setAlerts((current) => [created, ...current])
  }

  async function toggleAlert(alert: AlertRule) {
    const updated = await updateAlert(alert.id, { enabled: !alert.enabled })
    setAlerts((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  async function removeAlert(id: string) {
    await deleteAlert(id)
    setAlerts((current) => current.filter((item) => item.id !== id))
  }

  async function readNotification(id: string) {
    await markNotificationRead(id)
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }

  return (
    <AlertsContext.Provider
      value={{
        alerts,
        notifications,
        loading,
        error,
        addAlert,
        toggleAlert,
        removeAlert,
        readNotification,
        unreadCount: notifications.filter((item) => !item.read).length,
      }}
    >
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  const context = useContext(AlertsContext)
  if (!context) throw new Error('useAlerts debe utilizarse dentro de AlertsProvider')
  return context
}

export function useOptionalAlerts() {
  return useContext(AlertsContext) ?? EMPTY_ALERTS
}