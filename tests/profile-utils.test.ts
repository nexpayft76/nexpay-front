import { describe, expect, it } from 'vitest'
import { formatMemberSince, initials, statusLabel } from '../src/utils/profile'

describe('utilidades del perfil', () => {
  it('traduce el estado de la cuenta', () => {
    expect(statusLabel('active')).toBe('Activa')
    expect(statusLabel('suspended')).toBe('Suspendida')
    expect(statusLabel('closed')).toBe('Cerrada')
  })

  it('formatea la fecha de alta en español', () => {
    expect(formatMemberSince('2026-03-05T10:00:00Z')).toBe('5 de marzo de 2026')
  })

  it('devuelve un guion si la fecha no es válida', () => {
    expect(formatMemberSince('no-es-fecha')).toBe('—')
  })

  it('arma las iniciales con un máximo de dos letras', () => {
    expect(initials('Ana Pérez')).toBe('AP')
    expect(initials('ana maría de los Ángeles')).toBe('AM')
    expect(initials('ana')).toBe('A')
    expect(initials('   ')).toBe('?')
  })
})
