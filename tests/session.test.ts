import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isSessionActive,
  notifySessionExpired,
  onSessionExpired,
  removeLegacyToken,
  setSessionActive,
} from '../src/services/session'

describe('session', () => {
  beforeEach(() => {
    localStorage.clear()
    setSessionActive(false)
  })

  it('avisa que la sesión venció solo si había una sesión activa, y una sola vez', () => {
    const listener = vi.fn()
    const stop = onSessionExpired(listener)

    notifySessionExpired() // sin sesión (ej. login con contraseña incorrecta): no avisa
    expect(listener).not.toHaveBeenCalled()

    setSessionActive(true)
    notifySessionExpired()
    notifySessionExpired() // varias peticiones con 401 a la vez: un solo aviso
    expect(listener).toHaveBeenCalledTimes(1)
    expect(isSessionActive()).toBe(false)
    stop()
  })

  it('borra el token que versiones anteriores guardaban en localStorage', () => {
    localStorage.setItem('nexpay_access_token', 'token-viejo')
    removeLegacyToken()
    expect(localStorage.getItem('nexpay_access_token')).toBeNull()
  })
})
