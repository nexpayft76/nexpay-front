import { useState } from 'react'
import { getTheme, setTheme, type Theme } from '../../theme/theme'
import { useOptionalPreferences } from '../../contexts/PreferencesContext'

/** Botón sol/luna para cambiar entre modo claro y oscuro. */
function ThemeToggle() {
  const preferences = useOptionalPreferences()
  const [standaloneTheme, setStandaloneTheme] = useState<Theme>(getTheme)
  const theme = preferences.isProvider ? preferences.theme : standaloneTheme
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'light' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  function toggle() {
    setTheme(next)
    setStandaloneTheme(next)
    preferences.setPreferredTheme(next)
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}

export default ThemeToggle
