import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChangePasswordSection from '../src/pages/Profile/ChangePasswordSection'
import { ApiError } from '../src/services/api'

let onChange = vi.fn<(current: string, next: string) => Promise<void>>()

async function openForm() {
  const user = userEvent.setup()
  render(<ChangePasswordSection onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
  return user
}

async function fill(user: ReturnType<typeof userEvent.setup>, current: string, next: string, confirmation = next) {
  await user.type(screen.getByLabelText('Contraseña actual'), current)
  await user.type(screen.getByLabelText('Nueva contraseña'), next)
  await user.type(screen.getByLabelText('Repetir nueva contraseña'), confirmation)
}

describe('Usuario: cambiar contraseña', () => {
  beforeEach(() => {
    onChange = vi.fn<(current: string, next: string) => Promise<void>>()
  })

  it('arranca cerrado y "Guardar" está deshabilitado hasta que el formulario sea válido', async () => {
    render(<ChangePasswordSection onChange={onChange} />)
    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeDisabled()
  })

  it('muestra las reglas de la nueva contraseña mientras se escribe', async () => {
    const user = await openForm()
    await user.type(screen.getByLabelText('Nueva contraseña'), 'abc')
    expect(screen.getByText(/Al menos un número/)).toHaveTextContent('✗')
    expect(screen.getByText(/Al menos una letra/)).toHaveTextContent('✓')
  })

  it('no deja guardar si la confirmación no coincide o la nueva es igual a la actual', async () => {
    const user = await openForm()
    await fill(user, 'Secreta123', 'NuevaSecreta456', 'Otra12345')
    expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeDisabled()

    await user.clear(screen.getByLabelText('Nueva contraseña'))
    await user.clear(screen.getByLabelText('Repetir nueva contraseña'))
    await user.type(screen.getByLabelText('Nueva contraseña'), 'Secreta123')
    await user.type(screen.getByLabelText('Repetir nueva contraseña'), 'Secreta123')
    expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeDisabled()
  })

  it('envía la actual y la nueva, cierra el formulario y avisa que se guardó', async () => {
    onChange.mockResolvedValue(undefined)
    const user = await openForm()
    await fill(user, 'Secreta123', 'NuevaSecreta456')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(onChange).toHaveBeenCalledWith('Secreta123', 'NuevaSecreta456')
    expect(await screen.findByRole('status')).toHaveTextContent('Contraseña actualizada')
    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument()
  })

  it('si el back rechaza la contraseña actual muestra su mensaje y deja el formulario abierto', async () => {
    onChange = vi.fn(async () => {
      throw new ApiError('http', 'La contraseña actual es incorrecta', 403)
    })
    const user = await openForm()
    await fill(user, 'Incorrecta1', 'NuevaSecreta456')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña actual es incorrecta')
    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument()
  })
})
