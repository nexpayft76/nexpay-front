import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PasswordInput from '../src/components/common/PasswordInput'

describe('PasswordInput', () => {
  it('oculta la contraseña por defecto y el ojito la muestra y la vuelve a ocultar', () => {
    render(<PasswordInput aria-label="Contraseña" defaultValue="Secreta123" />)

    const input = screen.getByLabelText('Contraseña')
    expect(input).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('el ojito no envía el formulario', () => {
    let submitted = false
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitted = true
        }}
      >
        <PasswordInput aria-label="Contraseña" />
      </form>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(submitted).toBe(false)
  })
})
