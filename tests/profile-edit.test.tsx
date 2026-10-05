import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/context/AuthProvider'
import ProfilePage from '../src/pages/Profile/ProfilePage'
import ProtectedRoute from '../src/routes/ProtectedRoute'
import { ApiError } from '../src/services/api'
import * as authService from '../src/services/auth.service'
import * as userService from '../src/services/user.service'
import * as walletService from '../src/services/wallet.service'
import type { AuthSession } from '../src/types/auth'
import type { MyWallet } from '../src/types/wallet'

vi.mock('../src/services/auth.service')
vi.mock('../src/services/user.service')
vi.mock('../src/services/wallet.service')

const session: AuthSession = {
  user: { id: 'u1', full_name: 'Ana Pérez', email: 'ana@nexpay.com', status: 'active', created_at: '2026-03-05T10:00:00Z' },
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
}

const wallet: MyWallet = {
  wallet_id: 'w1',
  created_at: '2026-03-05T10:00:00Z',
  valuation: null,
  balances: [
    { currency: 'USD', name: 'Dólar', decimals: 2, amount: '25.50000000', value_in_target: 25.5, updated_at: '2026-03-06T10:00:00Z' },
    { currency: 'COP', name: 'Peso colombiano', decimals: 0, amount: '0.00000000', value_in_target: 0, updated_at: '2026-03-06T10:00:00Z' },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/configuracion/usuario']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route path="/dashboard/operaciones/intercambio" element={<p>Pantalla de intercambio</p>} />
          <Route
            path="/dashboard/configuracion/usuario"
            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function openEditor() {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: /Editar datos/ }))
  return user
}

describe('Usuario: editar datos', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(authService.getSession).mockResolvedValue(session)
    vi.mocked(authService.checkEmailAvailable).mockResolvedValue(true)
  })

  it('el formulario arranca con los datos actuales y "Guardar" deshabilitado hasta que haya cambios', async () => {
    await openEditor()

    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana Pérez')
    expect(screen.getByLabelText('Email')).toHaveValue('ana@nexpay.com')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('guarda solo el nombre, actualiza lo que se ve y avisa que se guardó', async () => {
    vi.mocked(userService.updateMyProfile).mockResolvedValue({ ...session.user, full_name: 'Ana María Pérez' })
    const user = await openEditor()

    const name = screen.getByLabelText('Nombre completo')
    await user.clear(name)
    await user.type(name, 'Ana María Pérez')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(userService.updateMyProfile).toHaveBeenCalledWith({ full_name: 'Ana María Pérez' })
    expect(await screen.findByRole('heading', { name: 'Ana María Pérez' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Datos actualizados')
    expect(screen.queryByLabelText('Nombre completo')).not.toBeInTheDocument()
  })

  it('cambiar el email consulta su disponibilidad y lo envía', async () => {
    vi.mocked(userService.updateMyProfile).mockResolvedValue({ ...session.user, email: 'nueva@nexpay.com' })
    const user = await openEditor()

    const email = screen.getByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'nueva@nexpay.com')

    expect(await screen.findByText('✓ Email disponible', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(authService.checkEmailAvailable).toHaveBeenCalledWith('nueva@nexpay.com')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(userService.updateMyProfile).toHaveBeenCalledWith({ email: 'nueva@nexpay.com' })
    expect(await screen.findByText('nueva@nexpay.com', { selector: 'dd' })).toBeInTheDocument()
  })

  it('bloquea el guardado durante la espera y la consulta de disponibilidad', async () => {
    let resolveAvailability!: (available: boolean) => void
    vi.mocked(authService.checkEmailAvailable).mockReturnValue(
      new Promise((resolve) => {
        resolveAvailability = resolve
      }),
    )
    const user = await openEditor()

    const email = screen.getByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'pendiente@nexpay.com')
    const save = screen.getByRole('button', { name: 'Guardar cambios' })

    expect(save).toBeDisabled()
    await waitFor(() => expect(authService.checkEmailAvailable).toHaveBeenCalledWith('pendiente@nexpay.com'))
    expect(save).toBeDisabled()

    resolveAvailability(true)
    expect(await screen.findByText('✓ Email disponible')).toBeInTheDocument()
    expect(save).toBeEnabled()
  })

  it('si el email ya tiene otra cuenta lo avisa y no deja guardar', async () => {
    vi.mocked(authService.checkEmailAvailable).mockResolvedValue(false)
    const user = await openEditor()

    const email = screen.getByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'ocupado@nexpay.com')

    expect(await screen.findByText('Ya existe una cuenta con este email.', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('escribir el mismo email con otras mayúsculas no cuenta como cambio ni consulta al back', async () => {
    const user = await openEditor()

    const email = screen.getByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'ANA@nexpay.com')
    await act(() => new Promise((resolve) => setTimeout(resolve, 700)))

    expect(authService.checkEmailAvailable).not.toHaveBeenCalled()
    expect(screen.queryByText(/Ya existe una cuenta/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('valida el nombre y el email en pantalla', async () => {
    const user = await openEditor()

    const name = screen.getByLabelText('Nombre completo')
    await user.clear(name)
    await user.type(name, 'A')
    expect(await screen.findByText('Ingresa al menos 2 caracteres.')).toBeInTheDocument()

    const email = screen.getByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'no-es-email')
    expect(await screen.findByText('Ingresa un email válido.', {}, { timeout: 3000 })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    expect(userService.updateMyProfile).not.toHaveBeenCalled()
  })

  it('limpia el error de formato obsoleto al corregir el email', async () => {
    const user = await openEditor()
    const email = screen.getByLabelText('Email')

    await user.clear(email)
    await user.type(email, 'email-invalido')
    await user.tab()
    expect(await screen.findByText('Ingresa un email válido.')).toBeInTheDocument()

    await user.clear(email)
    await user.type(email, 'valido@nexpay.com')
    expect(screen.queryByText('Ingresa un email válido.')).not.toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'false')
  })

  it('muestra el mensaje del back si falla el guardado (409) y deja seguir editando', async () => {
    vi.mocked(userService.updateMyProfile).mockRejectedValue(
      new ApiError('http', 'Ya existe una cuenta con ese email', 409),
    )
    const user = await openEditor()

    const name = screen.getByLabelText('Nombre completo')
    await user.clear(name)
    await user.type(name, 'Otro Nombre')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con ese email')
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Otro Nombre')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
  })

  it('"Cancelar" vuelve a los datos sin guardar nada', async () => {
    const user = await openEditor()

    await user.type(screen.getByLabelText('Nombre completo'), ' extra')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText('Nombre completo')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument()
    expect(userService.updateMyProfile).not.toHaveBeenCalled()
  })
})

describe('Usuario: cerrar cuenta', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(authService.getSession).mockResolvedValue(session)
  })

  async function openCloseDialog() {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Cerrar mi cuenta' }))
    return { user, dialog: await screen.findByRole('dialog') }
  }

  it('pide la contraseña antes de cerrar', async () => {
    const { user, dialog } = await openCloseDialog()

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar mi cuenta' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Ingresa tu contraseña')
    expect(userService.closeMyAccount).not.toHaveBeenCalled()
  })

  it('con contraseña incorrecta muestra el mensaje del back, sigue en el diálogo y no cierra la sesión', async () => {
    vi.mocked(userService.closeMyAccount).mockRejectedValue(new ApiError('http', 'La contraseña es incorrecta', 403))
    const { user, dialog } = await openCloseDialog()

    await user.type(within(dialog).getByLabelText('Contraseña'), 'Incorrecta1')
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar mi cuenta' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('La contraseña es incorrecta')
    expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tu usuario' })).toBeInTheDocument()
  })

  it('ignora envíos repetidos con Enter mientras la solicitud de cierre sigue activa', async () => {
    let finishClose!: () => void
    vi.mocked(userService.closeMyAccount).mockImplementation(
      () => new Promise<void>((resolve) => {
        finishClose = resolve
      }),
    )
    const { user, dialog } = await openCloseDialog()
    const password = within(dialog).getByLabelText('Contraseña')
    await user.type(password, 'Secreta123')

    await user.keyboard('{Enter}')
    await waitFor(() => expect(userService.closeMyAccount).toHaveBeenCalledOnce())
    await user.keyboard('{Enter}{Enter}')
    expect(userService.closeMyAccount).toHaveBeenCalledOnce()

    finishClose()
    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument()
  })

  it('si tiene saldo explica el motivo, lista los fondos con saldo y enlaza a Intercambio de balance', async () => {
    vi.mocked(userService.closeMyAccount).mockRejectedValue(
      new ApiError('http', 'No se puede cerrar la cuenta mientras tengas saldo.', 409),
    )
    vi.mocked(walletService.getMyWallet).mockResolvedValue(wallet)
    const { user, dialog } = await openCloseDialog()

    await user.type(within(dialog).getByLabelText('Contraseña'), 'Secreta123')
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar mi cuenta' }))

    const blocked = await screen.findByText('No se puede cerrar la cuenta mientras tengas saldo.')
    expect(blocked).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Saldos pendientes' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(list).toHaveTextContent('25,50 USD')
    expect(list).not.toHaveTextContent('COP')

    await user.click(screen.getByRole('link', { name: /Ir a Intercambio de balance/ }))
    expect(await screen.findByText('Pantalla de intercambio')).toBeInTheDocument()
  })

  it('si tiene saldo pero no se pudo consultar la billetera, igual explica el motivo', async () => {
    vi.mocked(userService.closeMyAccount).mockRejectedValue(new ApiError('http', 'Todavía tienes saldo.', 409))
    vi.mocked(walletService.getMyWallet).mockRejectedValue(new ApiError('network', 'Sin conexión'))
    const { user, dialog } = await openCloseDialog()

    await user.type(within(dialog).getByLabelText('Contraseña'), 'Secreta123')
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar mi cuenta' }))

    expect(await screen.findByText('Todavía tienes saldo.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Saldos pendientes' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ir a Intercambio de balance/ })).toBeInTheDocument()
  })

  it('con la contraseña correcta cierra la cuenta y manda al login', async () => {
    vi.mocked(userService.closeMyAccount).mockResolvedValue()
    const { user, dialog } = await openCloseDialog()

    await user.type(within(dialog).getByLabelText('Contraseña'), 'Secreta123')
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar mi cuenta' }))

    await waitFor(() => expect(userService.closeMyAccount).toHaveBeenCalledWith('Secreta123'))
    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument()
  })

  it('"Cancelar" cierra el diálogo sin llamar al back', async () => {
    const { user, dialog } = await openCloseDialog()

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(userService.closeMyAccount).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
