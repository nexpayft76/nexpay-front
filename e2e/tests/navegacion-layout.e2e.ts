import { expect, openSidebar, test, visit } from '../support/fixtures'

// Layout, Navbar, Sidebar y ThemeToggle: la estructura que rodea a todas las pantallas con sesión.

test.describe('Menú lateral en desktop', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn({ full_name: 'Ana Pérez' })
    await visit(page, '/dashboard')
  })

  test('arranca contraído (solo íconos) y se expande con la hamburguesa', async ({ page }) => {
    const sidebar = page.locator('#app-sidebar')
    await expect(sidebar).toHaveClass(/sidebar--collapsed/)

    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await expect(sidebar).not.toHaveClass(/sidebar--collapsed/)
    await expect(sidebar.getByRole('link', { name: 'Mi wallet' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Cotizador' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'P2P' })).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar menú' }).click()
    await expect(sidebar).toHaveClass(/sidebar--collapsed/)
  })

  test('marca como activa la pantalla actual', async ({ page }) => {
    await openSidebar(page)
    await expect(page.getByRole('link', { name: 'Mi wallet' })).toHaveClass(/sidebar__link--active/)
    await expect(page.getByRole('link', { name: 'Cotizador' })).not.toHaveClass(/sidebar__link--active/)

    await page.getByRole('link', { name: 'Cotizador' }).click()
    await expect(page).toHaveURL(/\/dashboard\/cotizador$/)
    await expect(page.getByRole('link', { name: 'Cotizador' })).toHaveClass(/sidebar__link--active/)
    await expect(page.getByRole('link', { name: 'Mi wallet' })).not.toHaveClass(/sidebar__link--active/)
  })

  test('el grupo Operaciones se abre y muestra Recarga, Intercambio de balance e Historial', async ({ page }) => {
    await openSidebar(page)
    const grupo = page.getByRole('button', { name: 'Operaciones' })
    await expect(grupo).toHaveAttribute('aria-expanded', 'false')

    await grupo.click()
    await expect(grupo).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: 'Recarga' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Intercambio de balance' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Historial' })).toBeVisible()

    await grupo.click()
    await expect(grupo).toHaveAttribute('aria-expanded', 'false')
  })

  test('el grupo Configuración lleva a Alertas, Preferencias y Usuario', async ({ page }) => {
    await openSidebar(page)
    await page.getByRole('button', { name: 'Configuración' }).click()

    await page.getByRole('link', { name: 'Alertas' }).click()
    await expect(page).toHaveURL(/\/configuracion\/alertas$/)
    await page.getByRole('link', { name: 'Preferencias' }).click()
    await expect(page).toHaveURL(/\/configuracion\/preferencias$/)
    await page.getByRole('link', { name: 'Usuario' }).click()
    await expect(page).toHaveURL(/\/configuracion\/usuario$/)
  })

  test('entrar directo a una subpantalla deja abierto su grupo', async ({ page }) => {
    await visit(page, '/dashboard/operaciones/historial')
    await openSidebar(page)
    await expect(page.getByRole('button', { name: 'Operaciones' })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: 'Historial' })).toHaveClass(/sidebar__link--active/)
  })

  test('con el menú contraído, tocar un grupo expande la barra y abre sus opciones', async ({ page }) => {
    await page.getByRole('button', { name: 'Operaciones' }).click()
    await expect(page.locator('#app-sidebar')).not.toHaveClass(/sidebar--collapsed/)
    await expect(page.getByRole('link', { name: 'Recarga' })).toBeVisible()
  })

  test('el logo de la barra superior lleva a la landing', async ({ page }) => {
    await page.getByRole('link', { name: /NEXPAY/i }).click()
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe('Menú lateral en celular', () => {
  test.use({ viewport: { width: 390, height: 800 } })

  test.beforeEach(async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard')
  })

  test('arranca cerrado y no se puede navegar con el teclado', async ({ page }) => {
    await expect(page.locator('#app-sidebar')).toHaveAttribute('inert', '')
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible()
  })

  test('se abre como panel, enfoca "Cerrar menú" y se cierra con Escape devolviendo el foco', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await expect(page.locator('#app-sidebar')).not.toHaveAttribute('inert', '')
    await expect(page.locator('#app-sidebar').getByRole('button', { name: 'Cerrar menú' })).toBeFocused()
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')

    await page.keyboard.press('Escape')
    await expect(page.locator('#app-sidebar')).toHaveAttribute('inert', '')
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeFocused()
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  })

  test('tocar un enlace navega y cierra el panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.locator('#app-sidebar').getByRole('link', { name: 'Cotizador' }).click()

    await expect(page).toHaveURL(/\/dashboard\/cotizador$/)
    await expect(page.locator('#app-sidebar')).toHaveAttribute('inert', '')
  })

  test('tocar el fondo oscuro cierra el panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.locator('.sidebar-backdrop').click({ position: { x: 380, y: 400 } })
    await expect(page.locator('#app-sidebar')).toHaveAttribute('inert', '')
  })

  test('no hay scroll horizontal en 390 px de ancho', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('Modo claro / oscuro', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard')
  })

  test('el botón de la barra alterna el tema, cambia su etiqueta y lo guarda en el servidor', async ({ page, api }) => {
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.getByRole('button', { name: 'Cambiar a modo claro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('button', { name: 'Cambiar a modo oscuro' })).toBeVisible()
    await expect.poll(() => api.preferences.theme).toBe('light')

    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('el modo elegido se mantiene al recargar', async ({ page }) => {
    await page.getByRole('button', { name: 'Cambiar a modo claro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('si el servidor guardó "claro" para el usuario, se aplica al entrar', async ({ page, api }) => {
    api.preferences.theme = 'light'
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})
