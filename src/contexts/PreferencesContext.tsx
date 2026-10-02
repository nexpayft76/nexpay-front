import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getTheme, setTheme, type Theme } from '../theme/theme'
import type { ArsRateType } from '../types/rates'
import type { CurrencyCode } from '../types/currency'
import { AuthContext } from '../context/AuthContext'

const STORAGE_KEY = 'nexpay_preferences'

export interface Preferences {
  defaultCurrency: CurrencyCode
  arsRate: ArsRateType
  theme: Theme
  inAppNotifications: boolean
  emailNotifications: boolean
}

interface PreferencesContextValue extends Preferences {
  isProvider: boolean
  setDefaultCurrency: (currency: CurrencyCode) => void
  setArsRate: (rate: ArsRateType) => void
  setPreferredTheme: (theme: Theme) => void
  setInAppNotifications: (enabled: boolean) => void
  setEmailNotifications: (enabled: boolean) => void
}

const defaults: Preferences = {
  defaultCurrency: 'USD',
  arsRate: 'mep',
  theme: getTheme(),
  inAppNotifications: true,
  emailNotifications: false,
}

function storageKey(userId: string): string {
  return `${STORAGE_KEY}:${userId}`
}

function readPreferences(userId: string): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '{}') as Partial<Preferences>
    return {
      ...defaults,
      ...saved,
      theme: saved.theme === 'light' ? 'light' : saved.theme === 'dark' ? 'dark' : defaults.theme,
    }
  } catch {
    return defaults
  }
}

function savePreferences(userId: string, preferences: Preferences) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(preferences))
  } catch {
    // Las preferencias siguen activas durante esta visita aunque el navegador no permita guardar.
  }
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

const EMPTY_PREFERENCES: PreferencesContextValue = {
  ...defaults,
  isProvider: false,
  setDefaultCurrency: () => undefined,
  setArsRate: () => undefined,
  setPreferredTheme: (theme) => setTheme(theme),
  setInAppNotifications: () => undefined,
  setEmailNotifications: () => undefined,
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext)
  const userId = auth?.user?.id ?? 'anonymous'
  const [preferences, setPreferences] = useState<Preferences>(() => readPreferences(userId))

  useEffect(() => {
    setPreferences(readPreferences(userId))
  }, [userId])

  function update(changes: Partial<Preferences>) {
    setPreferences((current) => {
      const next = { ...current, ...changes }
      savePreferences(userId, next)
      return next
    })
  }

  function setDefaultCurrency(defaultCurrency: CurrencyCode) {
    update({ defaultCurrency })
  }

  function setArsRate(arsRate: ArsRateType) {
    update({ arsRate })
  }

  function setPreferredTheme(theme: Theme) {
    setTheme(theme)
    update({ theme })
  }

  return (
    <PreferencesContext.Provider
      value={{
        ...preferences,
        isProvider: true,
        setDefaultCurrency,
        setArsRate,
        setPreferredTheme,
        setInAppNotifications: (enabled) => update({ inAppNotifications: enabled }),
        setEmailNotifications: (enabled) => update({ emailNotifications: enabled }),
      }}
    >
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences debe utilizarse dentro de PreferencesProvider')
  return context
}

export function useOptionalPreferences() {
  return useContext(PreferencesContext) ?? EMPTY_PREFERENCES
}