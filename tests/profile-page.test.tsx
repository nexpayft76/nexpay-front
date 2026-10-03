import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/context/AuthProvider'
import ProfilePage from '../src/pages/Profile/ProfilePage'
import ProtectedRoute from '../src/routes/ProtectedRoute'
import * as authService from '../src/services/auth.service'
import type { AuthSession } from '../src/types/auth'

vi.mock('../src/services/auth.service')

const session: AuthSession = {
  user: { id: 'u1', full_name: 'Ana Pérez', email: 'ana@nexpay.com', status: 'active', created_at: '2026-03-05T10:00:00Z' },
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route
            path="/dashboard/configuracion/usuario"
            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
          />
          <Route path="/dashboard/configuracion/preferencias" element={<p>Pantalla de preferencias</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Pantalla Usuario', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('muestra los datos reales de la sesión', async () => {
    vi.mocked(authService.getSession).mockResolvedValue(session)
    renderAt('/dashboard/configuracion/usuario')

    expect(await screen.findByRole('heading', { name: 'Tu usuario' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument()
    expect(screen.getByText('5 de marzo de 2026')).toBeInTheDocument()
    expect(screen.queryByText(/Próximamente/i)).not.toBeInTheDocument()
  })

  it('sin sesión redirige al login', async () => {
    vi.mocked(authService.getSession).mockResolvedValue(null)
    renderAt('/dashboard/configuracion/usuario')

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument()
  })

  it('cerrar sesión llama al back y vuelve al login', async () => {
    vi.mocked(authService.getSession).mockResolvedValue(session)
    vi.mocked(authService.logout).mockResolvedValue()
    const user = userEvent.setup()
    renderAt('/dashboard/configuracion/usuario')

    await user.click(await screen.findByRole('button', { name: /Cerrar sesión/ }))

    await waitFor(() => expect(authService.logout).toHaveBeenCalledOnce())
    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument()
  })

  it('el acceso a Preferencias lleva a esa pantalla', async () => {
    vi.mocked(authService.getSession).mockResolvedValue(session)
    const user = userEvent.setup()
    renderAt('/dashboard/configuracion/usuario')

    await user.click(await screen.findByRole('link', { name: /Ir a Preferencias/ }))

    expect(await screen.findByText('Pantalla de preferencias')).toBeInTheDocument()
  })
})
