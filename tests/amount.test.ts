import { describe, expect, it } from 'vitest'
import { formatAmountInput, validateAmountText, visibleAmountError } from '../src/utils/amount'

describe('formatAmountInput (puntos de miles mientras se escribe)', () => {
  it('pone el punto de miles al pasar al 4.º dígito y sigue agrupando', () => {
    expect(formatAmountInput('100')).toBe('100')
    expect(formatAmountInput('1000')).toBe('1.000')
    expect(formatAmountInput('100000')).toBe('100.000')
    expect(formatAmountInput('1000000')).toBe('1.000.000')
  })

  it('reacomoda los puntos que escribe el usuario: nunca dos seguidos ni mal agrupados', () => {
    expect(formatAmountInput('1.000.')).toBe('1.000')
    expect(formatAmountInput('1..000')).toBe('1.000')
    expect(formatAmountInput('10.00.000')).toBe('1.000.000')
    expect(formatAmountInput('12.34')).toBe('1.234')
  })

  it('respeta la coma decimal y no recorta decimales (los avisa la validación)', () => {
    expect(formatAmountInput('1500,5')).toBe('1.500,5')
    expect(formatAmountInput('5000,0000000')).toBe('5.000,0000000')
    expect(formatAmountInput(',5')).toBe('0,5')
    expect(formatAmountInput('1000,')).toBe('1.000,')
    expect(formatAmountInput('1,2,3')).toBe('1,23')
  })

  it('ignora letras y ceros a la izquierda', () => {
    expect(formatAmountInput('abc12x3')).toBe('123')
    expect(formatAmountInput('0005')).toBe('5')
  })
})

describe('validateAmountText (recarga, compra y cotizador en tiempo real)', () => {
  it('no marca error con el campo vacío ni con montos válidos', () => {
    expect(validateAmountText('')).toBeUndefined()
    expect(validateAmountText('1.500,50')).toBeUndefined()
    expect(validateAmountText('100.000')).toBeUndefined()
    expect(validateAmountText('1.000,')).toBeUndefined()
  })

  it('más de 2 decimales se avisa al instante (5.000,0000000)', () => {
    const issue = validateAmountText('5.000,0000000')
    expect(issue?.code).toBe('decimals')
    expect(visibleAmountError(issue, false)).toMatch(/2 decimales/)
  })

  it('"mayor que 0" espera la pausa, para no marcar error al escribir "0,5"', () => {
    const issue = validateAmountText('0')
    expect(issue?.code).toBe('zero')
    expect(visibleAmountError(issue, false)).toBeUndefined()
    expect(visibleAmountError(issue, true)).toMatch(/mayor que 0/)
  })

  it('avisa si pasa el máximo por recarga o el saldo disponible', () => {
    expect(validateAmountText('60.000.000', { max: { value: 50_000_000, message: 'Máximo 50M' } })?.message).toBe('Máximo 50M')
    expect(validateAmountText('200', { available: { value: 100, message: 'Saldo insuficiente' } })?.code).toBe('available')
    expect(validateAmountText('100', { available: { value: 100, message: 'Saldo insuficiente' } })).toBeUndefined()
  })
})
