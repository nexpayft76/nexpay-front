import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import P2PMarket from '../src/pages/P2P/P2PMarket'
import P2PMyOffers from '../src/pages/P2P/P2PMyOffers'
import P2PPublish from '../src/pages/P2P/P2PPublish'
import { ApiError } from '../src/services/api'
import {
  acceptP2POffer,
  cancelP2POffer,
  createP2POffer,
  getMyP2POffers,
  getP2PMarket,
  quoteP2POffer,
} from '../src/services/p2p.service'
import type { P2PMarketOffer, P2PQuote } from '../src/types/p2p'

vi.mock('../src/services/p2p.service', () => ({
  quoteP2POffer: vi.fn(),
  createP2POffer: vi.fn(),
  getP2PMarket: vi.fn(),
  getMyP2POffers: vi.fn(),
  acceptP2POffer: vi.fn(),
  cancelP2POffer: vi.fn(),
}))

// Billetera con 500 USD.
vi.mock('../src/hooks/useMyWallet', () => ({
  useMyWallet: () => ({
    status: 'ok',
    data: { balances: [{ currency: 'USD', amount: '500.00' }] },
    reload: vi.fn(),
  }),
}))

const QUOTE: P2PQuote = {
  sell_currency: 'USD',
  buy_currency: 'COP',
  sell_amount: '100.00',
  rate: 4000,
  market_rate: 4000,
  deviation_percent: 0,
  min_rate: 3600,
  max_rate: 4400,
  fee_percent: 0.5,
  buy_amount: '400000.00',
  seller_fee: '2000.00',
  seller_receives: '398000.00',
  buyer_fee: '0.50',
  buyer_receives: '99.50',
  market_reference: 'tasa oficial del día',
  rates_date: '2026-10-03',
  warnings: [],
}

const OFFER: P2PMarketOffer = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'open',
  sell_currency: 'USD',
  buy_currency: 'COP',
  sell_amount: '100.00',
  rate: 4100,
  market_rate: 4000,
  buy_amount: '410000.00',
  fee_percent: 0.5,
  seller_fee: '2050.00',
  seller_receives: '407950.00',
  buyer_fee: '0.50',
  buyer_receives: '99.50',
  created_at: '2026-10-03T10:00:00.000Z',
  expires_at: new Date(Date.now() + 5 * 3_600_000).toISOString(),
  closed_at: null,
  seller_name: 'Ana P.',
  completed_trades: 12,
}

describe('P2P', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
      this.open = true
    }
    HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
      this.open = false
    }
  })

  it('publicar: muestra la tasa actual, la comisión y lo que recibe, y publica con la tasa del mercado', async () => {
    vi.mocked(quoteP2POffer).mockResolvedValue(QUOTE)
    vi.mocked(createP2POffer).mockResolvedValue({ offer: { ...OFFER, rate: 4000 }, balance: '400.00' })
    const onPublished = vi.fn()
    render(<P2PPublish onPublished={onPublished} />)

    await userEvent.type(screen.getByLabelText('Monto a vender'), '100')
    const summary = await screen.findByText('Recibes si aceptan')
    expect(summary.closest('dl')).toHaveTextContent('Tasa actual')
    expect(summary.closest('dl')).toHaveTextContent('Comisión NexPay')
    // Sin tasa escrita se simula con la del mercado.
    expect(quoteP2POffer).toHaveBeenLastCalledWith({ sell_currency: 'USD', buy_currency: 'COP', sell_amount: 100 })

    await userEvent.click(screen.getByRole('button', { name: 'Publicar oferta' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, publicar' }))
    await waitFor(() => expect(onPublished).toHaveBeenCalled())
    expect(createP2POffer).toHaveBeenCalledWith({ sell_currency: 'USD', buy_currency: 'COP', sell_amount: 100, rate: 4000 })
  })

  it('publicar: si la tasa está fuera del rango, muestra el aviso del back y no deja publicar', async () => {
    vi.mocked(quoteP2POffer).mockImplementation(async (params) => {
      if (params.rate === 9000) throw new ApiError('http', 'La tasa debe estar entre 3600 y 4400', 400)
      return QUOTE
    })
    render(<P2PPublish onPublished={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Monto a vender'), '100')
    await userEvent.type(screen.getByLabelText(/Tu tasa/), '9000')
    expect(await screen.findByRole('alert')).toHaveTextContent('entre 3600 y 4400')
    expect(screen.getByRole('button', { name: 'Publicar oferta' })).toBeDisabled()
  })

  it('mercado: muestra la oferta y al aceptarla avisa lo que pagó y recibió', async () => {
    vi.mocked(getP2PMarket).mockResolvedValue([OFFER])
    vi.mocked(acceptP2POffer).mockResolvedValue({
      offer: { ...OFFER, status: 'completed' },
      balances: { paid: '90000.00', received: '99.50' },
    })
    const onAccepted = vi.fn()
    render(<P2PMarket onAccepted={onAccepted} />)

    const card = (await screen.findByText('Ana P.')).closest('li') as HTMLElement
    expect(card).toHaveTextContent('Vende')
    // Reputación: solo el número de intercambios.
    expect(within(card).getByText('12 intercambios')).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Aceptar oferta' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, aceptar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('¡Listo!')
    expect(acceptP2POffer).toHaveBeenCalledWith(OFFER.id)
    expect(onAccepted).toHaveBeenCalled()
  })

  it('mis ofertas: una abierta se puede cancelar', async () => {
    vi.mocked(getMyP2POffers).mockResolvedValue([OFFER])
    vi.mocked(cancelP2POffer).mockResolvedValue({ offer: { ...OFFER, status: 'cancelled' }, balance: '500.00' })
    const onChanged = vi.fn()
    render(<P2PMyOffers onChanged={onChanged} />)

    expect(await screen.findByText('Abierta')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar oferta' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, cancelar' }))
    await waitFor(() => expect(cancelP2POffer).toHaveBeenCalledWith(OFFER.id))
    expect(onChanged).toHaveBeenCalled()
  })
})
