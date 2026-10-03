import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ProfileDetails from '../src/pages/Profile/ProfileDetails'
import type { AuthUser } from '../src/types/auth'

const user: AuthUser = {
  id: 'u1',
  full_name: 'Ana Pérez',
  email: 'ana@nexpay.com',
  status: 'active',
  created_at: '2026-03-05T10:00:00Z',
}

describe('ProfileDetails', () => {
  it('muestra nombre, email, estado y fecha de alta', () => {
    render(<ProfileDetails user={user} />)

    expect(screen.getByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument()
    expect(screen.getAllByText('ana@nexpay.com')).not.toHaveLength(0)
    expect(screen.getAllByText('Activa')).not.toHaveLength(0)
    expect(screen.getByText('5 de marzo de 2026')).toBeInTheDocument()
    expect(screen.getByText('AP')).toBeInTheDocument()
  })

  it('marca visualmente las cuentas suspendidas y cerradas', () => {
    const { container, rerender } = render(<ProfileDetails user={{ ...user, status: 'suspended' }} />)
    expect(container.querySelector('.profile-status--suspended')).toHaveTextContent('Suspendida')

    rerender(<ProfileDetails user={{ ...user, status: 'closed' }} />)
    expect(container.querySelector('.profile-status--closed')).toHaveTextContent('Cerrada')
  })

  it('muestra un nombre muy largo completo', () => {
    const longName = 'Maria de los Angeles '.repeat(8).trim()
    render(<ProfileDetails user={{ ...user, full_name: longName }} />)
    expect(screen.getByRole('heading', { name: longName })).toBeInTheDocument()
  })
})
