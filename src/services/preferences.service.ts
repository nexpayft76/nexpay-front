import { api } from './api'
import type { Theme } from '../theme/theme'

export interface UserPreferences {
  theme: Theme
  inAppNotifications: boolean
  emailNotifications: boolean
}

export async function getThemePreference(): Promise<Theme | null> {
  try {
    const response = await api.get<{ data: { theme: Theme } }>('/api/users/me/theme')
    return response.data.data.theme ?? null
  } catch {
    return null
  }
}

export async function getUserPreferences(): Promise<UserPreferences | null> {
  try {
    const response = await api.get<{
      data: {
        theme: Theme
        in_app_notifications: boolean
        email_notifications: boolean
      }
    }>('/api/users/me/preferences')

    const { theme, in_app_notifications, email_notifications } = response.data.data
    return {
      theme,
      inAppNotifications: in_app_notifications,
      emailNotifications: email_notifications,
    }
  } catch {
    return null
  }
}

export async function saveThemePreference(theme: Theme): Promise<void> {
  await api.patch('/api/users/me/theme', { theme })
}

export async function saveUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
  await api.patch('/api/users/me/preferences', {
    theme: preferences.theme,
    in_app_notifications: preferences.inAppNotifications,
    email_notifications: preferences.emailNotifications,
  })
}