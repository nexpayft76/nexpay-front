import type { CurrencyCode } from './currency'

export type AlertKind = 'daily_change' | 'target_rate' | 'low_balance' | 'stale_rates'
export type AlertDirection = 'up' | 'down'

export interface AlertRule {
  id: string
  kind: AlertKind
  currency: CurrencyCode
  base_currency: CurrencyCode
  direction: AlertDirection
  threshold: number
  enabled: boolean
  email_enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateAlertInput {
  kind: AlertKind
  currency: CurrencyCode
  base_currency: CurrencyCode
  direction: AlertDirection
  threshold: number
  email_enabled: boolean
}

export interface Notification {
  id: string
  type: 'rate_alert' | 'system'
  title: string
  message: string
  read: boolean
  created_at: string
  alert_id?: string
}