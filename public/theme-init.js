// Fija el modo claro/oscuro antes de pintar, para que no parpadee.
// Usa la elección guardada o, si no hay, la preferencia del sistema.
try {
  var saved = localStorage.getItem('nexpay_theme')
  var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
  document.documentElement.dataset.theme = saved || (prefersLight ? 'light' : 'dark')
} catch {
  document.documentElement.dataset.theme = 'dark'
}
