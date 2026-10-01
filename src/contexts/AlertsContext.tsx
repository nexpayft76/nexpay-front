import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  createAlert,
  deleteAlert,
  getAlerts,
  getNotifications,
  createLocalNotification,
  markNotificationRead,
  updateAlert,
} from '../services/alerts.service'
import type { AlertRule, CreateAlertInput, Notification } from '../types/alerts'

const NOTIFICATION_POLL_MS = 15_000

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
  readNotification: (id: string) => Promise<void>
  recordDeposit: (event: DepositAlertEvent) => void
  recordExchange: (event: ExchangeAlertEvent) => void
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
  recordDeposit: () => undefined,
  recordExchange: () => undefined,
  unreadCount: 0,
}

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadNotifications = async () => {
      try {
        const nextNotifications = await getNotifications()
        if (!cancelled) setNotifications(nextNotifications)
      } catch {
        if (!cancelled) setError('No pudimos actualizar tus notificaciones.')
      }
    }

    Promise.all([getAlerts(), getNotifications()])
      .then(([nextAlerts, nextNotifications]) => {
        if (cancelled) return
        setAlerts(nextAlerts)
        setNotifications(nextNotifications)
      })
      .catch(() => !cancelled && setError('No pudimos cargar tus alertas. Inténtalo de nuevo.'))
      .finally(() => !cancelled && setLoading(false))

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

  function addLocalNotification(notification: Notification) {
    const created = createLocalNotification(notification)
    setNotifications((current) => (current.some((item) => item.id === created.id) ? current : [created, ...current]))
  }

  function recordDeposit(event: DepositAlertEvent) {
    for (const alert of alerts) {
      if (!alert.enabled || alert.currency !== event.currency) continue
      if (alert.kind === 'deposit_received') {
        addLocalNotification({
          id: `local-${alert.id}-${event.transactionId}-deposit`,
          type: 'system',
          title: `Recarga recibida en ${event.currency}`,
          message: `Sumaste ${event.amount} ${event.currency} a tu wallet.`,
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
          message: `Tu saldo quedó en ${event.newBalance} ${event.currency}.`,
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
            message: `Tu saldo quedó en ${balance.balance} ${balance.currency}.`,
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
        readNotification,
        recordDeposit,
        recordExchange,
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