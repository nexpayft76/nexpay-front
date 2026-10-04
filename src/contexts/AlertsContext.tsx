import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  createAlert,
  deleteAlert,
  getAlerts,
  getNotifications,
  createLocalNotification,
  deleteNotification,
  markNotificationRead,
  updateAlert,
} from '../services/alerts.service'
import type { AlertRule, CreateAlertInput, Notification } from '../types/alerts'
import { AuthContext } from '../context/AuthContext'
import { logger } from '../utils/logger'

const NOTIFICATION_POLL_MS = 15_000

function notificationKey(
  notification: Pick<Notification, 'alert_id' | 'type' | 'title' | 'message' | 'created_at'>,
): string {
  return JSON.stringify([
    notification.alert_id ?? 'manual',
    notification.type,
    notification.title,
    notification.message,
    notification.created_at,
  ])
}

function formatAlertAmount(value: string): string {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount.toFixed(2) : value
}

interface DepositAlertEvent {
  transactionId: string
  currency: string
  amount: string
  newBalance: string
  createdAt: string
}

interface ExchangeAlertEvent {
  transactionId: string
  fromCurrency: string
  fromBalance: string
  toCurrency: string
  toBalance: string
  createdAt: string
}

interface AlertsContextValue {
  alerts: AlertRule[]
  notifications: Notification[]
  loading: boolean
  error: string | null
  addAlert: (input: CreateAlertInput) => Promise<void>
  toggleAlert: (alert: AlertRule) => Promise<void>
  removeAlert: (id: string) => Promise<void>
  editAlert: (id: string, input: CreateAlertInput) => Promise<void>
  readNotification: (id: string) => Promise<void>
  removeNotification: (id: string) => Promise<void>
  recordDeposit: (event: DepositAlertEvent) => void
  recordExchange: (event: ExchangeAlertEvent) => void
  toastNotification: Notification | null
  dismissToast: () => void
  unreadCount: number
  rateAlertsAvailable: boolean | null
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
  editAlert: async () => undefined,
  readNotification: async () => undefined,
  removeNotification: async () => undefined,
  recordDeposit: () => undefined,
  recordExchange: () => undefined,
  toastNotification: null,
  dismissToast: () => undefined,
  unreadCount: 0,
  rateAlertsAvailable: null,
}

export function AlertsProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext)
  const userId = auth?.user?.id ?? 'anonymous'
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rateAlertsAvailable, setRateAlertsAvailable] = useState<boolean | null>(null)
  const [toastNotification, setToastNotification] = useState<Notification | null>(null)
  const knownNotificationKeys = useRef(new Set<string>())
  const notificationsInitialized = useRef(false)

  useEffect(() => {
    let cancelled = false
    setAlerts([])
    setNotifications([])
    setToastNotification(null)
    setRateAlertsAvailable(null)
    knownNotificationKeys.current.clear()
    notificationsInitialized.current = false
    const loadNotifications = async () => {
      try {
        const nextNotifications = await getNotifications(userId)
        if (cancelled) return
        const newUnread = notificationsInitialized.current
          ? nextNotifications.find(
              (notification) => !notification.read && !knownNotificationKeys.current.has(notificationKey(notification)),
            )
          : undefined
        nextNotifications.forEach((notification) => {
          knownNotificationKeys.current.add(notificationKey(notification))
          if (notification.source_event_key) knownNotificationKeys.current.add(notification.source_event_key)
        })
        setNotifications(nextNotifications)
        if (newUnread) setToastNotification(newUnread)
      } catch {
        if (!cancelled) setError('No pudimos actualizar tus notificaciones.')
      }
    }

    const alertsRequest = getAlerts(userId).then((nextAlerts) => {
      if (cancelled) return
      setRateAlertsAvailable(true)
      setAlerts(nextAlerts)
    }).catch(() => {
      if (cancelled) return
      setRateAlertsAvailable(false)
      setError('No pudimos cargar tus alertas. Inténtalo de nuevo.')
    })
    const notificationsRequest = getNotifications(userId).then((nextNotifications) => {
      if (cancelled) return
      setNotifications(nextNotifications)
      nextNotifications.forEach((notification) => {
        knownNotificationKeys.current.add(notificationKey(notification))
        if (notification.source_event_key) knownNotificationKeys.current.add(notification.source_event_key)
      })
      notificationsInitialized.current = true
    }).catch(() => !cancelled && setError('No pudimos cargar tus notificaciones. Inténtalo de nuevo.'))
    Promise.allSettled([alertsRequest, notificationsRequest]).finally(() => !cancelled && setLoading(false))

    const poll = window.setInterval(() => void loadNotifications(), NOTIFICATION_POLL_MS)
    const refreshWhenActive = () => {
      if (document.visibilityState === 'visible') void loadNotifications()
    }
    document.addEventListener('visibilitychange', refreshWhenActive)
    window.addEventListener('focus', refreshWhenActive)

    return () => {
      cancelled = true
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', refreshWhenActive)
      window.removeEventListener('focus', refreshWhenActive)
    }
  }, [userId])

  async function addAlert(input: CreateAlertInput) {
    const created = await createAlert(userId, input)
    setAlerts((current) => [created, ...current])
  }

  async function toggleAlert(alert: AlertRule) {
    const updated = await updateAlert(alert.id, userId, { enabled: !alert.enabled })
    setAlerts((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  async function editAlert(id: string, input: CreateAlertInput) {
    const updated = await updateAlert(id, userId, input)
    setAlerts((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  async function removeAlert(id: string) {
    await deleteAlert(userId, id)
    setAlerts((current) => current.filter((item) => item.id !== id))
  }

  async function readNotification(id: string) {
    await markNotificationRead(userId, id)
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }

  async function removeNotification(id: string) {
    await deleteNotification(userId, id)
    setNotifications((current) => current.filter((item) => item.id !== id))
  }

  async function addLocalNotification(notification: Notification) {
    const key = notificationKey(notification)
    if (knownNotificationKeys.current.has(key) || knownNotificationKeys.current.has(notification.id)) return
    knownNotificationKeys.current.add(key)
    knownNotificationKeys.current.add(notification.id)

    try {
      const created = await createLocalNotification(userId, notification)
      const createdKey = notificationKey(created)
      knownNotificationKeys.current.add(createdKey)
      setNotifications((current) => {
        const withoutDuplicate = current.filter(
          (item) => item.id !== created.id && notificationKey(item) !== key && notificationKey(item) !== createdKey,
        )
        return [created, ...withoutDuplicate]
      })
      setToastNotification(created)
    } catch (error) {
      logger.warn('alertas', 'No se pudo guardar la notificación', {
        error: error instanceof Error ? error.message : String(error),
      })
      setNotifications((current) => {
        if (current.some((item) => notificationKey(item) === key)) return current
        return [notification, ...current]
      })
      setToastNotification(notification)
    }
  }

  const dismissToast = useCallback(() => setToastNotification(null), [])

  function recordDeposit(event: DepositAlertEvent) {
    for (const alert of alerts) {
      if (!alert.enabled || alert.currency !== event.currency) continue
      if (alert.kind === 'deposit_received') {
        addLocalNotification({
          id: `local-${alert.id}-${event.transactionId}-deposit`,
          type: 'system',
          title: `Recarga recibida en ${event.currency}`,
          message: `Sumaste ${formatAlertAmount(event.amount)} ${event.currency} a tu wallet.`,
          read: false,
          created_at: event.createdAt,
          alert_id: alert.id,
        })
      }
      if (alert.kind === 'low_balance' && Number(event.newBalance) <= alert.threshold) {
        addLocalNotification({
          id: `local-${alert.id}-${event.transactionId}-low`,
          type: 'rate_alert',
          title: `Saldo bajo en ${event.currency}`,
          message: `Tu saldo quedó en ${formatAlertAmount(event.newBalance)} ${event.currency}.`,
          read: false,
          created_at: event.createdAt,
          alert_id: alert.id,
        })
      }
    }
  }

  function recordExchange(event: ExchangeAlertEvent) {
    const balances = [
      { currency: event.fromCurrency, balance: event.fromBalance },
      { currency: event.toCurrency, balance: event.toBalance },
    ]
    for (const balance of balances) {
      for (const alert of alerts) {
        if (!alert.enabled || alert.kind !== 'low_balance' || alert.currency !== balance.currency) continue
        if (Number(balance.balance) <= alert.threshold) {
          addLocalNotification({
            id: `local-${alert.id}-${event.transactionId}-${balance.currency}-low`,
            type: 'rate_alert',
            title: `Saldo bajo en ${balance.currency}`,
            message: `Tu saldo quedó en ${formatAlertAmount(balance.balance)} ${balance.currency}.`,
            read: false,
            created_at: event.createdAt,
            alert_id: alert.id,
          })
        }
      }
    }
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
        editAlert,
        readNotification,
        removeNotification,
        recordDeposit,
        recordExchange,
        toastNotification,
        dismissToast,
        unreadCount: notifications.filter((item) => !item.read).length,
        rateAlertsAvailable,
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