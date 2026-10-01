export type Theme = 'light' | 'dark'

// Misma clave que usa el script de index.html para pintar el modo correcto desde el inicio.
export const THEME_STORAGE_KEY = 'nexpay_theme'

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Sin almacenamiento (modo privado): el modo vale solo para esta visita.
  }
}
