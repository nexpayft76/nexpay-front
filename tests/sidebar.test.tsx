import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Sidebar from '../src/components/layout/Sidebar'

const baseProps = {
  onClose: vi.fn(),
  onNavigate: vi.fn(),
  onLogout: vi.fn(),
  onExpandSidebar: vi.fn(),
}

describe('Sidebar', () => {
  it('muestra las opciones de Operaciones y Configuración al expandirlas', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar {...baseProps} isOpen isDesktop />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Operaciones' }))
    expect(screen.getByRole('link', { name: 'Recarga' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Compra' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Configuración' }))
    expect(screen.getByRole('link', { name: 'Alertas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Preferencias/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Usuario/ })).toBeInTheDocument()
  })

  it('expande la barra completa al pulsar un grupo en modo plegado', async () => {
    const user = userEvent.setup()
    const onExpandSidebar = vi.fn()
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar {...baseProps} onExpandSidebar={onExpandSidebar} isOpen={false} isDesktop />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Configuración' }))
    expect(onExpandSidebar).toHaveBeenCalledOnce()
  })
})