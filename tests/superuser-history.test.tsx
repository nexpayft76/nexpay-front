import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Sidebar from '../src/components/layout/Sidebar'
import { AuthContext } from '../src/context/AuthContext'
import HistoryPage from '../src/pages/History/HistoryPage'
import P2PTrades from '../src/pages/P2P/P2PTrades'
import SuperuserUsersPage from '../src/pages/Superuser/SuperuserUsersPage'
import { getMyP2PTrades, getMyTransactions } from '../src/services/history.service'
import FeeSettingsForm from '../src/pages/Superuser/FeeSettingsForm'
import { getFeeSettings, getUsers, setUserRole, setUserStatus, updateFeeSettings } from '../src/services/superuser.service'
import type { AuthUser } from '../src/types/auth'
import type { ManagedUser } from '../src/types/superuser'

vi.mock('../src/services/history.service', () => ({ getMyTransactions: vi.fn(), getMyP2PTrades: vi.fn() }))
vi.mock('../src/services/superuser.service', () => ({
  getUsers: vi.fn(),
  setUserRole: vi.fn(),
  setUserStatus: vi.fn(),
  getFeeSettings: vi.fn(),
  updateFeeSettings: vi.fn(),
}))

const OWNER: AuthUser = {
  id: 'owner',
  full_name: 'NexPay',
  email: 'owner@nexpay.com',
  status: 'active',
  role: 'superuser',
  is_owner: true,
  created_at: '2026-10-01T10:00:00Z',
}

let currentUser: AuthUser | null = OWNER
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ user: currentUser, isLoading: false }) }))

const page = <T,>(items: T[]) => ({ items, page: 1, limit: 20, total: items.length })

const ANA: ManagedUser = {
  id: 'ana',
  full_name: 'Ana Pérez',
  email: 'ana@nexpay.com',
  role: 'user',
  is_owner: false,
  status: 'active',
  created_at: '2026-10-02T10:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = OWNER
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.open = false
  }
})

describe('Historial de la cuenta', () => {
  it('muestra recargas y compras, y filtra por tipo', async () => {
    vi.mocked(getMyTransactions).mockResolvedValue(
      page([
        {
          id: 't1',
          type: 'DEPOSIT',
          from_currency: null,
          to_currency: 'USD',
          from_amount: '100.00',
          to_amount: '100.00',
          exchange_rate: 1,
          fee_amount: '0',
          fee_currency: null,
          fee_percent: 0,
          ars_rate_type: null,
          created_at: '2026-10-03T10:00:00Z',
        },
        {
          id: 't2',
          type: 'BUY',
          from_currency: 'COP',
          to_currency: 'USD',
          from_amount: '400000.00',
          to_amount: '99.00',
          exchange_rate: 0.00025,
          fee_amount: '4000.00',
          fee_currency: 'COP',
          fee_percent: 1,
          ars_rate_type: null,
          created_at: '2026-10-03T11:00:00Z',
        },
      ]),
    )
    render(<HistoryPage />)

    expect(await screen.findByText('Recarga')).toBeInTheDocument()
    expect(screen.getByText('Intercambio de balance')).toBeInTheDocument()
    expect(screen.getByText(/Recargaste/)).toHaveTextContent('US$')
    expect(screen.getByText(/Tasa: 1 COP/)).toHaveTextContent('comisión')

    await userEvent.click(screen.getByRole('radio', { name: 'Intercambios de balance' }))
    await waitFor(() => expect(getMyTransactions).toHaveBeenLastCalledWith({ type: 'EXCHANGE', page: 1, limit: 20 }))
  })
})

describe('Historial P2P', () => {
  it('muestra cada intercambio aceptado con la otra parte, lo pagado, lo recibido y la comisión', async () => {
    vi.mocked(getMyP2PTrades).mockResolvedValue(
      page([
        {
          offer_id: 'o1',
          role: 'seller' as const,
          counterpart_name: 'Leo M.',
          paid_amount: '100.00',
          paid_currency: 'USD',
          received_amount: '407950.00',
          received_currency: 'COP',
          fee_amount: '2050.00',
          fee_currency: 'COP',
          fee_percent: 0.5,
          rate: 4100,
          sell_currency: 'USD',
          buy_currency: 'COP',
          transaction_id: 'tx',
          completed_at: '2026-10-03T12:00:00Z',
        },
      ]),
    )
    render(<P2PTrades />)

    const item = (await screen.findByText('Vendiste')).closest('li') as HTMLElement
    expect(item).toHaveTextContent('Leo M.')
    expect(item).toHaveTextContent('comisión')
    expect(item).toHaveTextContent('0,5%')
  })
})

describe('Superusuario: usuarios', () => {
  it('cambia el rol y suspende, con confirmación; la cuenta propietaria no se puede tocar', async () => {
    const ownerRow: ManagedUser = { ...ANA, id: 'owner', email: 'owner@nexpay.com', role: 'superuser', is_owner: true }
    vi.mocked(getUsers).mockResolvedValue(page([ownerRow, ANA]))
    vi.mocked(setUserRole).mockResolvedValue({ ...ANA, role: 'superuser' })
    vi.mocked(setUserStatus).mockResolvedValue({ ...ANA, status: 'suspended' })
    render(<SuperuserUsersPage />)

    const ownerCells = (await screen.findByText('owner@nexpay.com')).closest('tr') as HTMLElement
    expect(within(ownerCells).getByText('Propietario')).toBeInTheDocument()
    expect(within(ownerCells).queryByRole('button', { name: 'Suspender' })).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Rol de ana@nexpay.com'), 'superuser')
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, confirmar' }))
    await waitFor(() => expect(setUserRole).toHaveBeenCalledWith('ana', 'superuser'))

    const anaRow = screen.getByText('ana@nexpay.com').closest('tr') as HTMLElement
    await userEvent.click(within(anaRow).getByRole('button', { name: 'Suspender' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, confirmar' }))
    await waitFor(() => expect(setUserStatus).toHaveBeenCalledWith('ana', 'suspended'))
  })
})

describe('Menú lateral', () => {
  function renderSidebar(user: AuthUser) {
    render(
      <AuthContext.Provider value={{ user } as never}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Sidebar isOpen isDesktop onClose={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()} onExpandSidebar={vi.fn()} />
        </MemoryRouter>
      </AuthContext.Provider>,
    )
  }

  it('la sección Superusuario solo aparece para el superusuario', () => {
    renderSidebar(OWNER)
    expect(screen.getByRole('button', { name: 'Superusuario' })).toBeInTheDocument()
  })

  it('un usuario común no la ve', () => {
    renderSidebar({ ...OWNER, role: 'user', is_owner: false })
    expect(screen.queryByRole('button', { name: 'Superusuario' })).not.toBeInTheDocument()
  })
})

describe('Superusuario: comisiones vigentes', () => {
  it('muestra las comisiones, valida el rango y guarda con confirmación', async () => {
    vi.mocked(getFeeSettings).mockResolvedValue({
      exchange_fee_percent: 0.05,
      p2p_fee_percent: 0.5,
      updated_at: null,
      updated_by_email: null,
    })
    vi.mocked(updateFeeSettings).mockResolvedValue({
      exchange_fee_percent: 0.1,
      p2p_fee_percent: 0.5,
      updated_at: '2026-10-04T12:00:00Z',
      updated_by_email: 'owner@nexpay.com',
    })
    render(<FeeSettingsForm />)

    const exchange = await screen.findByLabelText('Intercambio de balance (%)')
    expect(exchange).toHaveValue('0,05')
    const save = screen.getByRole('button', { name: 'Guardar comisiones' })
    expect(save).toBeDisabled()

    await userEvent.clear(exchange)
    await userEvent.type(exchange, '11')
    expect(screen.getByText('Como máximo 10%')).toBeInTheDocument()
    expect(save).toBeDisabled()

    await userEvent.clear(exchange)
    await userEvent.type(exchange, '0,1')
    await userEvent.click(save)
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, guardar' }))
    await waitFor(() => expect(updateFeeSettings).toHaveBeenCalledWith({ exchange_fee_percent: 0.1, p2p_fee_percent: 0.5 }))
    expect(await screen.findByRole('status')).toHaveTextContent('Comisiones actualizadas')
  })
})
