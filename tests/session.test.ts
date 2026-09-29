import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getValidToken, isTokenExpired, notifySessionExpired, onSessionExpired, saveToken } from '../src/services/session'

function tokenWithExp(exp: unknown) {
  return `header.${btoa(JSON.stringify({ sub: 'user-1', exp }))}.firma`
}

describe('session', () => {
  beforeEach(() => localStorage.clear())

  it('reconoce un token vigente y uno vencido', () => {
    const now = Date.now()
    expect(isTokenExpired(tokenWithExp(Math.floor(now / 1000) + 3600), now)).toBe(false)
    expect(isTokenExpired(tokenWithExp(Math.floor(now / 1000) - 1), now)).toBe(true)
  })

  it('trata como vencido un token sin formato JWT o sin exp', () => {
    expect(isTokenExpired('token')).toBe(true)
    expect(isTokenExpired('a.no-es-base64.c')).toBe(true)
    expect(isTokenExpired(tokenWithExp('mañana'))).toBe(true)
  })

  it('getValidToken borra el token vencido sin llamar al back', () => {
    saveToken(tokenWithExp(Math.floor(Date.now() / 1000) - 60))
    expect(getValidToken()).toBeNull()
    expect(localStorage.getItem('nexpay_access_token')).toBeNull()
  })

  it('notifySessionExpired borra el token y avisa a quien escucha', () => {
    saveToken(tokenWithExp(Math.floor(Date.now() / 1000) + 3600))
    const listener = vi.fn()
    const stop = onSessionExpired(listener)

    notifySessionExpired()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('nexpay_access_token')).toBeNull()
    stop()
  })
})
