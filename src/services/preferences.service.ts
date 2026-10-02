import { api } from './api'
import type { Theme } from '../theme/theme'

export async function saveThemePreference(theme: Theme): Promise<void> {
  await api.patch('/api/users/me/theme', { theme })
}