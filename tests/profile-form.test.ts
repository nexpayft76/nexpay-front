import { describe, expect, it } from 'vitest'
import type { AuthUser } from '../src/types/auth'
import { changedFields, isSameEmail, validateProfileForm, validateProfileName } from '../src/utils/profile-form'

const user: AuthUser = {
  id: 'u1',
  full_name: 'Ana Pérez',
  email: 'ana@nexpay.com',
  status: 'active',
  created_at: '2026-03-05T10:00:00Z',
}

describe('formulario de perfil', () => {
  it('compara emails sin distinguir mayúsculas ni espacios', () => {
    expect(isSameEmail(' ANA@nexpay.com ', 'ana@nexpay.com')).toBe(true)
    expect(isSameEmail('otra@nexpay.com', 'ana@nexpay.com')).toBe(false)
  })

  it('envía solo los campos que cambiaron', () => {
    expect(changedFields(user, { name: 'Ana M. Pérez', email: 'ana@nexpay.com' })).toEqual({ full_name: 'Ana M. Pérez' })
    expect(changedFields(user, { name: 'Ana Pérez', email: 'nueva@nexpay.com' })).toEqual({ email: 'nueva@nexpay.com' })
    expect(changedFields(user, { name: 'Ana M.', email: 'nueva@nexpay.com' })).toEqual({
      full_name: 'Ana M.',
      email: 'nueva@nexpay.com',
    })
  })

  it('no hay cambios si solo difieren mayúsculas del email o espacios del nombre', () => {
    expect(changedFields(user, { name: '  Ana Pérez ', email: 'ANA@NEXPAY.COM' })).toEqual({})
  })

  it('valida el nombre: obligatorio, mínimo 2 y máximo 120', () => {
    expect(validateProfileName('')).toBeDefined()
    expect(validateProfileName(' A ')).toBeDefined()
    expect(validateProfileName('Al')).toBeUndefined()
    expect(validateProfileName('A'.repeat(120))).toBeUndefined()
    expect(validateProfileName('A'.repeat(121))).toBeDefined()
  })

  it('valida nombre y email juntos', () => {
    expect(validateProfileForm({ name: 'Ana', email: 'ana@nexpay.com' })).toBeUndefined()
    expect(validateProfileForm({ name: 'A', email: 'ana@nexpay.com' })).toBeDefined()
    expect(validateProfileForm({ name: 'Ana', email: 'no-es-email' })).toBeDefined()
  })
})
