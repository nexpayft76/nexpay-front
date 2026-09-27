import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Landing from '../src/pages/Landing/Landing'
import { AuthProvider } from '../src/context/AuthContext'
import type { AuthUser } from '../src/types/auth'
import { getCurrentUser, logout } from '../src/services/auth.service'

vi.mock('../src/services/auth.service', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))

vi.mock('../src/components/common/BackendStatus', () => ({
  default: () => null,
}))

const mockedGetCurrentUser = vi.mocked(getCurrentUser)
const mockedLogout = vi.mocked(logout)

const authenticatedUser: AuthUser = {
  id: 'user-1',
  full_name: 'Ada Lovelace',
  email: 'ada@example.com',
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
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
    localStorage.clear()
    vi.clearAllMocks()
    mockedGetCurrentUser.mockResolvedValue(authenticatedUser)
    mockedLogout.mockResolvedValue(undefined)
  })

  it('muestra los CTA de acceso cuando no hay una sesión iniciada', async () => {
    renderLanding()

    expect(await screen.findByRole('link', { name: 'Crear cuenta gratis' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ya tengo cuenta' })).toBeInTheDocument()
  })

  it('oculta los CTA cuando la sesión está iniciada', async () => {
    localStorage.setItem('nexpay_access_token', 'token')
    renderLanding()

    await waitFor(() => expect(screen.getByRole('link', { name: 'Mi dashboard' })).toBeInTheDocument())

    expect(screen.queryByRole('link', { name: 'Crear cuenta gratis' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ya tengo cuenta' })).not.toBeInTheDocument()
  })

  it('abre el drawer lateral con las tres opciones públicas sin sesión', async () => {
    const user = userEvent.setup()
    renderLanding()

    await user.click(await screen.findByRole('checkbox', { name: 'Abrir menú de navegación' }))

    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Funcionalidades' })).toHaveAttribute('href', '#features-title')
    expect(screen.getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '#steps-title')
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
  })

  it('muestra Cerrar sesión como última opción y ejecuta logout', async () => {
    const user = userEvent.setup()
    localStorage.setItem('nexpay_access_token', 'token')
    renderLanding()

    await waitFor(() => expect(screen.getByRole('link', { name: 'Mi dashboard' })).toBeInTheDocument())
    await user.click(screen.getByRole('checkbox', { name: 'Abrir menú de navegación' }))

    const logoutButtons = screen.getAllByRole('button', { name: 'Cerrar sesión' })
    expect(logoutButtons).toHaveLength(2)
    expect(screen.getByRole('navigation', { name: 'Navegación principal' }).lastElementChild).toHaveTextContent('Cerrar sesión')

    await user.click(logoutButtons[1])

    await waitFor(() => expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument())
    expect(mockedLogout).toHaveBeenCalledOnce()
    expect(localStorage.getItem('nexpay_access_token')).toBeNull()
  })

  it('representa el cierre de sesión del header como un botón de icono sin texto visible', async () => {
    localStorage.setItem('nexpay_access_token', 'token')
    renderLanding()

    await waitFor(() => expect(screen.getByRole('link', { name: 'Mi dashboard' })).toBeInTheDocument())

    const headerLogout = screen.getAllByRole('button', { name: 'Cerrar sesión' })[0]
    expect(headerLogout).toHaveAttribute('title', 'Cerrar sesión')
    expect(headerLogout).not.toHaveTextContent('Cerrar sesión')
    expect(headerLogout.querySelector('svg')).toBeInTheDocument()
  })
})
