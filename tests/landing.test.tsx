import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Landing from '../src/pages/Landing/Landing'
import { AuthProvider } from '../src/context/AuthProvider'
import type { AuthUser } from '../src/types/auth'
import { getSession, logout } from '../src/services/auth.service'

vi.mock('../src/services/auth.service', () => ({
  getSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))

vi.mock('../src/components/common/BackendStatus', () => ({
  default: () => null,
}))

const mockedGetSession = vi.mocked(getSession)
const mockedLogout = vi.mocked(logout)

const authenticatedUser: AuthUser = {
  id: 'user-1',
  full_name: 'Ada Lovelace',
  email: 'ada@example.com',
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
}

/** La sesión vive en una cookie HttpOnly: el test simula la respuesta de GET /api/auth/session. */
function withSession() {
  mockedGetSession.mockResolvedValue({ user: authenticatedUser, expires_at: new Date(Date.now() + 3_600_000).toISOString() })
}

function renderLanding() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Landing />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Landing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetSession.mockResolvedValue(null)
    mockedLogout.mockResolvedValue(undefined)
  })

  it('muestra los CTA de acceso cuando no hay una sesión iniciada', async () => {
    renderLanding()

    expect(await screen.findByRole('link', { name: 'Crear cuenta gratis' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ya tengo cuenta' })).toBeInTheDocument()
  })

  it('oculta los CTA cuando la sesión está iniciada', async () => {
    withSession()
    renderLanding()

    await waitFor(() => expect(screen.getByRole('link', { name: 'Mi dashboard' })).toBeInTheDocument())

    expect(screen.queryByRole('link', { name: 'Crear cuenta gratis' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ya tengo cuenta' })).not.toBeInTheDocument()
  })

  it('no muestra un menú lateral en la landing', async () => {
    renderLanding()

    expect(screen.queryByRole('checkbox', { name: /menú/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).not.toBeInTheDocument()
  })

  it('muestra el logo NexPay y mantiene el enlace al inicio', async () => {
    withSession()
    renderLanding()

    await waitFor(() => expect(screen.getByRole('link', { name: 'Mi dashboard' })).toBeInTheDocument())
    const brand = screen.getByRole('link', { name: /NexPay/i })
    expect(brand).toHaveAttribute('href', '/')
    expect(brand.querySelector('svg')).toBeInTheDocument()
  })

  it('lleva el scroll al inicio al pulsar NexPay', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    renderLanding()

    await userEvent.click(await screen.findByRole('link', { name: /NexPay/i }))

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
    scrollTo.mockRestore()
  })

  it('representa el cierre de sesión del header como un botón de icono sin texto visible', async () => {
    withSession()
    renderLanding()

    await waitFor(() => expect(screen.getByRole('link', { name: 'Mi dashboard' })).toBeInTheDocument())

    const headerLogout = screen.getAllByRole('button', { name: 'Cerrar sesión' })[0]
    expect(headerLogout).toHaveAttribute('title', 'Cerrar sesión')
    expect(headerLogout).not.toHaveTextContent('Cerrar sesión')
    expect(headerLogout.querySelector('svg')).toBeInTheDocument()
  })
})
