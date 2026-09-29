// Estado de la sesión en el navegador y aviso de "sesión vencida" para toda la app.
//
// El token ya NO se guarda acá: vive en una cookie HttpOnly que pone el back en el login.
// El JavaScript de la página no puede leerla (un script inyectado no puede robar la sesión)
// y el navegador la manda solo en cada petición a /api.

const EXPIRED_EVENT = 'nexpay:session-expired'
/** Clave vieja de cuando el token se guardaba en localStorage: se borra si quedó de antes. */
const LEGACY_TOKEN_KEY = 'nexpay_access_token'

let sessionActive = false

export function setSessionActive(active: boolean): void {
  sessionActive = active
}

export function isSessionActive(): boolean {
  return sessionActive
}

/** Borra el token que versiones anteriores guardaban en localStorage. */
export function removeLegacyToken(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // Sin acceso a localStorage (modo privado estricto): no hay nada que borrar.
  }
}

/** El back respondió 401 con una sesión iniciada: se avisa a la app para cerrarla (solo una vez). */
export function notifySessionExpired(): void {
  if (!sessionActive) return
  sessionActive = false
  window.dispatchEvent(new Event(EXPIRED_EVENT))
}

export function onSessionExpired(listener: () => void): () => void {
  window.addEventListener(EXPIRED_EVENT, listener)
  return () => window.removeEventListener(EXPIRED_EVENT, listener)
}
