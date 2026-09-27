import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CorridorQuote from '../src/pages/Landing/CorridorQuote'
import { computeQuote } from '../src/pages/Landing/useCorridorQuote'
import { ApiError } from '../src/services/api'
import { convertCopToArs, type ArsRateType, type CorridorConversion } from '../src/services/corridor.service'

vi.mock('../src/services/corridor.service', () => ({
  convertCopToArs: vi.fn(),
  getCopArsHistory: vi.fn(),
}))

const mockedConvert = vi.mocked(convertCopToArs)

// Resultados reales de 1.000.000 COP → ARS (27/09/2026).
const RESULTS: Record<ArsRateType, number> = { oficial: 451828.17, mep: 466727.92, blue: 465428.35 }

function conversion(type: ArsRateType, amount = 1_000_000): CorridorConversion {
  const result = (RESULTS[type] * amount) / 1_000_000
  return {
    from: 'COP',
    to: 'ARS',
    amount,
    rate: result / amount,
    result,
    ars_rate: {
      type,
      label: type === 'mep' ? 'MEP (bolsa)' : type === 'blue' ? 'Blue' : 'Oficial',
      price_used: 'compra',
      compra: 0,
      venta: 0,
      published_at: '2026-09-26T20:56:00.000Z',
    },
    date: '2026-09-27',
    source: 'live',
    warnings: [],
  }
}

describe('computeQuote', () => {
  it('NexPay usa el MEP menos 0,5% y el banco el oficial con dos comisiones de 2,5%', () => {
    const q = computeQuote({ oficial: conversion('oficial'), mep: conversion('mep'), blue: conversion('blue') })

    expect(q.nexpay).toBeCloseTo(466727.92 * 0.995, 2)
    expect(q.bank).toBeCloseTo(451828.17 * 0.975 * 0.975, 2)
    expect(q.savings).toBeCloseTo(q.nexpay - q.bank, 6)
    expect(q.savingsPct).toBeCloseTo(q.savings / q.bank, 6)
  })
})

describe('CorridorQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedConvert.mockImplementation(async (amount, type) => conversion(type, amount))
  })

  it('muestra cuánto llega con NexPay, con el banco y el ahorro', async () => {
    render(<CorridorQuote />)

    expect(await screen.findByText('$464.394 ARS')).toBeInTheDocument()
    expect(screen.getByText('$429.519 ARS')).toBeInTheDocument()
    expect(screen.getByText(/\+\$34\.875 ARS \(\+8,1%\)/)).toBeInTheDocument()
    expect(mockedConvert).toHaveBeenCalledTimes(3)
  })

  it('muestra el error de conexión y permite reintentar', async () => {
    mockedConvert.mockRejectedValueOnce(new ApiError('network', 'No se pudo conectar con el servidor.'))
    render(<CorridorQuote />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('$464.394 ARS')).toBeInTheDocument()
  })

  it('no consulta la API si el monto está vacío', async () => {
    render(<CorridorQuote />)
    await screen.findByText('$464.394 ARS')
    mockedConvert.mockClear()

    await userEvent.clear(screen.getByLabelText('Enviás desde Colombia (COP)'))

    expect(await screen.findByText('Ingresá un monto en pesos colombianos.')).toBeInTheDocument()
    expect(mockedConvert).not.toHaveBeenCalled()
  })
})
