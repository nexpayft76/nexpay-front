import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Navbar from '../src/components/layout/Navbar'

describe('Navbar del dashboard', () => {
  it('usa la marca NexPay, enlaza al inicio y muestra logout dorado', () => {
    render(
      <MemoryRouter>
        <Navbar isMenuOpen={false} onToggleMenu={vi.fn()} onLogout={vi.fn()} />
      </MemoryRouter>,
    )

    const brand = screen.getByRole('link', { name: /NEXPAY/i })
    expect(brand).toHaveAttribute('href', '/')
    expect(brand.querySelector('svg')).toBeInTheDocument()

    const logout = screen.getByRole('button', { name: 'Cerrar sesión' })
    expect(logout).toHaveClass('navbar__logout')
    expect(logout).toHaveAttribute('title', 'Cerrar sesión')
  })

  it('refleja el estado del menú en aria-expanded', () => {
    const { rerender } = render(
      <MemoryRouter>
        <Navbar isMenuOpen={false} onToggleMenu={vi.fn()} onLogout={vi.fn()} />
      </MemoryRouter>,
    )

    const menuButton = screen.getByRole('button', { name: 'Abrir menú' })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    rerender(
      <MemoryRouter>
        <Navbar isMenuOpen onToggleMenu={vi.fn()} onLogout={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true')
  })
})