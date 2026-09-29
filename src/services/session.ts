// Token de sesión en localStorage y aviso de "sesión vencida" para toda la app.

const TOKEN_KEY = 'nexpay_access_token'
const EXPIRED_EVENT = 'nexpay:session-expired'
/** Margen para no mandar un token que vence en medio de la petición. */
const EXPIRY_MARGIN_MS = 10_000

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Sin localStorage (modo privado estricto) la sesión dura hasta recargar.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nada que limpiar.
  }
}

/**
 * true si el token no sirve: formato inválido o `exp` vencido.
 * Se revisa en el navegador (sin llamar al back) para no generar errores 401 en la consola
 * al recargar con una sesión vieja. La firma la sigue verificando el back en cada petición.
 */
export function isTokenExpired(token: string, now = Date.now()): boolean {
  const payload = token.split('.')[1]
  if (!payload) return true
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(base64)) as { exp?: unknown }
    return typeof exp !== 'number' || exp * 1000 <= now + EXPIRY_MARGIN_MS
  } catch {
    return true
  }
}

/** Token vigente, o null (y lo borra) si venció o es inválido. */
export function getValidToken(): string | null {
  const token = getToken()
  if (token && isTokenExpired(token)) {
    clearToken()
    return null
  }
  return token
}

/** Avisa a la app que la sesión venció (el back respondió 401 a una petición con token). */
export function notifySessionExpired(): void {
  clearToken()
  window.dispatchEvent(new Event(EXPIRED_EVENT))
}

export function onSessionExpired(listener: () => void): () => void {
  window.addEventListener(EXPIRED_EVENT, listener)
  return () => window.removeEventListener(EXPIRED_EVENT, listener)
}
