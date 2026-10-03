import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ForgotPassword from '../src/pages/Auth/ForgotPassword'
import ResetPassword from '../src/pages/Auth/ResetPassword'
import { ApiError } from '../src/services/api'
import { requestPasswordReset, resetPassword } from '../src/services/auth.service'

vi.mock('../src/services/auth.service', () => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}))

describe('recuperación de contraseña', () => {
  beforeEach(() => vi.resetAllMocks())

  it('envía el email y muestra una respuesta que no revela si la cuenta existe', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPassword />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'ana@nexpay.com')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(requestPasswordReset).toHaveBeenCalledWith('ana@nexpay.com')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
    )
  })

  it('no muestra errores del servidor que puedan revelar si el email existe', async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(
      new ApiError('http', 'Este email no está registrado', 404),
    )
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPassword />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'ana@nexpay.com')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo procesar la solicitud.')
    expect(screen.queryByText('Este email no está registrado')).not.toBeInTheDocument()
  })

  it('limpia el error de validación al editar el email', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPassword />
      </MemoryRouter>,
    )
    const email = screen.getByLabelText('Email')

    await user.type(email, 'invalido')
    await user.tab()
    expect(await screen.findByText('Ingresa un email válido.')).toBeInTheDocument()

    await user.clear(email)
    await user.type(email, 'valido@nexpay.com')
    expect(screen.queryByText('Ingresa un email válido.')).not.toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'false')
  })

  it('permite cambiar la contraseña desde el enlace y confirma el resultado', async () => {
    vi.mocked(resetPassword).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/reset-password#token=reset-token']}>
        <ResetPassword />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave123')
    await user.type(screen.getByLabelText('Repetir nueva contraseña'), 'NuevaClave123')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(resetPassword).toHaveBeenCalledWith('reset-token', 'NuevaClave123')
    expect(await screen.findByRole('status')).toHaveTextContent('Tu contraseña se actualizó correctamente.')
  })

  it('impide enviar una nueva contraseña que no cumpla las reglas', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/reset-password#token=reset-token']}>
        <ResetPassword />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Nueva contraseña'), 'invalida')
    await user.type(screen.getByLabelText('Repetir nueva contraseña'), 'invalida')

    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeDisabled()
    expect(resetPassword).not.toHaveBeenCalled()
  })
})
