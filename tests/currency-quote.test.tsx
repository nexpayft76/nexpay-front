import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CurrencyQuote from '../src/pages/Landing/CurrencyQuote'
import WalletPreview from '../src/pages/Landing/WalletPreview'
import { ApiError } from '../src/services/api'
import { convert, getRates, type ArsRateType, type Conversion } from '../src/services/conversion.service'
import type { CurrencyCode } from '../src/types/currency'

vi.mock('../src/services/conversion.service', () => ({
  convert: vi.fn(),
  getRates: vi.fn(),
  getRateHistory: vi.fn(),
}))

const mockedConvert = vi.mocked(convert)
const mockedGetRates = vi.mocked(getRates)

// Tasas reales del 27/09/2026 (1 unidad de origen → destino).
const RATES: Record<string, number> = {
  'COP-ARS:oficial': 0.4518281663,
  'COP-ARS:mep': 0.4667279178,
  'COP-ARS:blue': 0.4654283452,
  'USD-EUR': 0.8774,
  'EUR-USD': 1.1398,
}

function fakeConvert(from: CurrencyCode, to: CurrencyCode, amount: number, arsRate?: ArsRateType): Conversion {
  const rate = RATES[arsRate ? `${from}-${to}:${arsRate}` : `${from}-${to}`]
  const labels = { oficial: 'Oficial', mep: 'MEP (bolsa)', blue: 'Blue' }
  return {
    from,
    to,
    amount,
    rate,
    result: Math.round(amount * rate * 100) / 100,
    ars_rate: arsRate
      ? { type: arsRate, label: labels[arsRate], price_used: 'compra', compra: 0, venta: 0, published_at: '2026-09-26T20:56:00.000Z' }
      : null,
    date: '2026-09-27',
    source: 'live',
    warnings: [],
  }
}

describe('CurrencyQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedConvert.mockImplementation(async (from, to, amount, arsRate) => fakeConvert(from, to, amount, arsRate))
  })

  it('arranca en COP → ARS con el dólar MEP y compara los tres tipos de dólar', async () => {
    render(<CurrencyQuote />)

    expect(await screen.findByText('466.728 ARS', { selector: '.quote-card__value' })).toBeInTheDocument()
    const types = screen.getByText('Mismo monto, tres dólares argentinos').closest('div')!
    expect(within(types).getByText('451.828 ARS')).toBeInTheDocument()
    expect(within(types).getByText('465.428 ARS')).toBeInTheDocument()
    expect(within(types).getByText(/la diferencia llega a 14\.900 ARS/)).toBeInTheDocument()
    expect(mockedConvert).toHaveBeenCalledTimes(3)
  })

  it('cotiza pares sin ARS con una sola consulta y sin la comparación de dólares', async () => {
    const user = userEvent.setup()
    render(<CurrencyQuote />)
    await screen.findByText('466.728 ARS', { selector: '.quote-card__value' })

    await user.selectOptions(screen.getByLabelText('Tienes'), 'USD')
    await user.selectOptions(screen.getByLabelText('Recibes en'), 'EUR')
    mockedConvert.mockClear()

    expect(await screen.findByText('219,35 EUR')).toBeInTheDocument()
    expect(screen.getByText('1 USD = 0,8774 EUR')).toBeInTheDocument()
    expect(screen.queryByText('Mismo monto, tres dólares argentinos')).not.toBeInTheDocument()
  })

  it('invierte el par con el botón ⇄', async () => {
    const user = userEvent.setup()
    render(<CurrencyQuote />)
    await user.selectOptions(screen.getByLabelText('Tienes'), 'USD')
    await user.selectOptions(screen.getByLabelText('Recibes en'), 'EUR')
    await screen.findByText('219,35 EUR')

    await user.click(screen.getByRole('button', { name: 'Invertir monedas' }))

    expect(screen.getByLabelText('Tienes')).toHaveValue('EUR')
    expect(screen.getByLabelText('Recibes en')).toHaveValue('USD')
    expect(await screen.findByText('284,95 USD')).toBeInTheDocument()
  })

  it('muestra el error de conexión y permite reintentar', async () => {
    mockedConvert.mockRejectedValueOnce(new ApiError('network', 'No se pudo conectar con el servidor.'))
    render(<CurrencyQuote />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('466.728 ARS', { selector: '.quote-card__value' })).toBeInTheDocument()
  })

  it('no consulta la API si el monto está vacío', async () => {
    render(<CurrencyQuote />)
    await screen.findByText('466.728 ARS', { selector: '.quote-card__value' })
    mockedConvert.mockClear()

    await userEvent.clear(screen.getByLabelText('Monto en COP'))

    expect(await screen.findByText('Ingresa un monto en COP.')).toBeInTheDocument()
    expect(mockedConvert).not.toHaveBeenCalled()
  })
})

describe('WalletPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetRates.mockImplementation(async (base) => ({
      base,
      date: '2026-09-27',
      source: 'live',
      fetched_at: '2026-09-27T10:37:39.881Z',
      // Unidades de cada moneda por 1 USD (con base USD).
      rates: { EUR: 0.8, ARS: 1500, COP: 4000 },
      unavailable: [],
    }))
  })

  it('suma los 4 saldos de ejemplo en la moneda elegida', async () => {
    render(<WalletPreview />)

    // 1250 USD + 830/0,8 + 452.300/1500 + 2.180.000/4000 = 1250 + 1037,5 + 301,53 + 545 = 3134,03
    expect(await screen.findByText('3.134,03 USD')).toBeInTheDocument()
    expect(screen.getByText('≈ 1.037,50 USD')).toBeInTheDocument()
    expect(mockedGetRates).toHaveBeenCalledWith('USD')
  })

  it('vuelve a pedir las tasas al cambiar la moneda del total', async () => {
    render(<WalletPreview />)
    await screen.findByText('3.134,03 USD')

    await userEvent.click(screen.getByRole('button', { name: 'EUR' }))

    expect(mockedGetRates).toHaveBeenLastCalledWith('EUR')
    expect(screen.getByRole('button', { name: 'EUR' })).toHaveAttribute('aria-pressed', 'true')
  })
})
