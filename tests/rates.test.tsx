import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RatesPanel from '../src/components/rates/RatesPanel'
import { ApiError } from '../src/services/api'
import { getRates } from '../src/services/rates.service'
import type { RatesSnapshot } from '../src/types/rates'

vi.mock('../src/services/rates.service', () => ({
  getRates: vi.fn(),
}))

const mockedGetRates = vi.mocked(getRates)

function snapshot(overrides: Partial<RatesSnapshot> = {}): RatesSnapshot {
  return {
    base: 'USD',
    date: '2026-09-27',
    source: 'live',
    fetched_at: '2026-09-27T10:37:39.881Z',
    rates: { EUR: 0.87734, ARS: 1550.8, COP: 3308.78 },
    unavailable: [],
    providers: [
      {
        provider: 'frankfurter',
        label: 'Frankfurter · tasa oficial diaria',
        currencies: ['COP', 'EUR'],
        source: 'live',
        stale: false,
        fetched_at: '2026-09-27T10:37:39.881Z',
        published_at: '2026-09-27',
      },
      {
        provider: 'dolarapi',
        label: 'DolarApi · dólar oficial',
        currencies: ['ARS'],
        source: 'live',
        stale: false,
        fetched_at: '2026-09-27T10:37:39.986Z',
        published_at: '2026-09-26T20:56:00.000Z',
      },
    ],
    warnings: [],
    ...overrides,
  }
}

describe('RatesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra las tasas de cada moneda respecto a la base', async () => {
    mockedGetRates.mockResolvedValue(snapshot())
    render(<RatesPanel />)

    expect(await screen.findByText('En vivo')).toBeInTheDocument()
    expect(screen.getByText('1.550,8')).toBeInTheDocument()
    expect(screen.getByText('3.308,78')).toBeInTheDocument()
    expect(screen.getByText('0,8773')).toBeInTheDocument()
    expect(screen.getByText(/Frankfurter · tasa oficial diaria \| DolarApi/)).toBeInTheDocument()
    expect(mockedGetRates).toHaveBeenCalledWith('USD')
  })

  it('avisa cuando una fuente está caída y marca las monedas sin tasa', async () => {
    const data = snapshot({ source: 'cache', rates: { EUR: 0.87734, COP: 3308.78 }, unavailable: ['ARS'] })
    data.providers[1] = { ...data.providers[1], stale: true }
    mockedGetRates.mockResolvedValue(data)
    render(<RatesPanel />)

    expect(await screen.findByText('Guardadas hoy')).toBeInTheDocument()
    expect(screen.getByText(/No pudimos consultar DolarApi/)).toBeInTheDocument()
    expect(screen.getByText('No disponible')).toBeInTheDocument()
  })

  it('muestra el error y permite reintentar', async () => {
    mockedGetRates
      .mockRejectedValueOnce(new ApiError('network', 'No se pudo conectar con el servidor.'))
      .mockResolvedValueOnce(snapshot())
    render(<RatesPanel />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('En vivo')).toBeInTheDocument()
    expect(mockedGetRates).toHaveBeenCalledTimes(2)
  })

  it('vuelve a pedir las tasas al cambiar la moneda base', async () => {
    mockedGetRates.mockResolvedValue(snapshot())
    render(<RatesPanel />)
    await screen.findByText('En vivo')

    mockedGetRates.mockResolvedValue(snapshot({ base: 'EUR', rates: { USD: 1.1398, ARS: 1767.61, COP: 3771.37 } }))
    await userEvent.click(screen.getByRole('button', { name: 'EUR' }))

    expect(await screen.findByText('1.767,61')).toBeInTheDocument()
    expect(mockedGetRates).toHaveBeenLastCalledWith('EUR')
    expect(screen.getByRole('button', { name: 'EUR' })).toHaveAttribute('aria-pressed', 'true')
  })
})
