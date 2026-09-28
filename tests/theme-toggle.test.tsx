import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import ThemeToggle from '../src/components/common/ThemeToggle'
import { THEME_STORAGE_KEY } from '../src/theme/theme'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = 'dark'
  })

  it('pasa de oscuro a claro, lo guarda y vuelve a oscuro', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Cambiar a modo claro' }))

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('arranca en el modo que ya fijó la página', () => {
    document.documentElement.dataset.theme = 'light'
    render(<ThemeToggle />)

    expect(screen.getByRole('button', { name: 'Cambiar a modo oscuro' })).toBeInTheDocument()
  })
})
