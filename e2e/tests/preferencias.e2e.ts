import { expect, test, visit } from '../support/fixtures'

// Configuración → Preferencias (PreferencesPage + PreferencesContext): moneda, tipo de dólar, modo y avisos.

test.describe('Preferencias', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn({}, { USD: 100 })
    await visit(page, '/dashboard/configuracion/preferencias')
  })

  test('muestra las cuatro secciones con los valores por defecto', async ({ page }) => {
    await expect(page).toHaveTitle(/Preferencias/)
    await expect(page.getByRole('heading', { name: 'Tus preferencias' })).toBeVisible()
    await expect(page.getByLabel('Mostrar valores en')).toHaveValue('USD')
    await expect(page.getByRole('radio', { name: /MEP/ })).toBeChecked()
    await expect(page.getByRole('radio', { name: /Oscuro/ })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: /Avisos en pantalla/ })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: /Notificaciones por email/ })).not.toBeChecked()
  })

  test('cambiar una preferencia muestra "Preferencia guardada" y luego desaparece', async ({ page }) => {
    await page.getByLabel('Mostrar valores en').selectOption('EUR')
    await expect(page.getByRole('status').filter({ hasText: 'Preferencia guardada' })).toHaveClass(/is-visible/)
    await expect(page.getByRole('status').filter({ hasText: 'Preferencia guardada' })).not.toHaveClass(/is-visible/, { timeout: 5000 })
  })

  test('la moneda principal se usa como moneda inicial del dashboard', async ({ page }) => {
    await page.getByLabel('Mostrar valores en').selectOption('COP')
    await page.goto('/dashboard')
    await expect(page.getByLabel('Moneda del total estimado')).toHaveValue('COP')
    await expect(page.getByLabel('Moneda de destino')).toHaveValue('COP')
  })

  test('el tipo de dólar elegido es la selección inicial del cotizador', async ({ page }) => {
    await page.getByRole('radio', { name: /Oficial/ }).check()
    await page.goto('/dashboard/cotizador')
    await expect(page.getByRole('radio', { name: 'Oficial', exact: true })).toHaveAttribute('aria-checked', 'true')
  })

  test('las preferencias se guardan por usuario y sobreviven a recargar', async ({ page }) => {
    await page.getByLabel('Mostrar valores en').selectOption('EUR')
    await page.getByRole('radio', { name: /Blue/ }).check()
    await page.reload()

    await expect(page.getByLabel('Mostrar valores en')).toHaveValue('EUR')
    await expect(page.getByRole('radio', { name: /Blue/ })).toBeChecked()
  })

  test('elegir modo claro cambia la interfaz y se guarda en el servidor', async ({ page, api }) => {
    await page.getByRole('radio', { name: /Claro/ }).check()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect.poll(() => api.preferences.theme).toBe('light')
    await expect(page.getByRole('button', { name: 'Cambiar a modo oscuro' })).toBeVisible()
  })

  test('el interruptor de la barra superior y el de Preferencias están sincronizados', async ({ page }) => {
    await page.getByRole('button', { name: 'Cambiar a modo claro' }).click()
    await expect(page.getByRole('radio', { name: /Claro/ })).toBeChecked()
  })

  test('desactivar los avisos y el email se guarda en el servidor', async ({ page, api }) => {
    await page.getByRole('checkbox', { name: /Avisos en pantalla/ }).uncheck()
    await page.getByRole('checkbox', { name: /Notificaciones por email/ }).check()

    await expect.poll(() => api.preferences.in_app_notifications).toBe(false)
    await expect.poll(() => api.preferences.email_notifications).toBe(true)
  })

  test('el email activado por defecto marca la casilla de email en el formulario de alertas', async ({ page }) => {
    await page.getByRole('checkbox', { name: /Notificaciones por email/ }).check()
    await page.goto('/dashboard/configuracion/alertas')
    await expect(page.getByLabel('También enviarme un email')).toBeChecked()
  })

  test('las preferencias que guardó el servidor se aplican al entrar', async ({ page, api }) => {
    api.preferences.email_notifications = true
    api.preferences.in_app_notifications = false
    await page.reload()

    await expect(page.getByRole('checkbox', { name: /Notificaciones por email/ })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: /Avisos en pantalla/ })).not.toBeChecked()
  })

  test('si el servidor no guarda la preferencia, igual se aplica en esta sesión', async ({ page, api }) => {
    api.failNext('PATCH', /users\/me\/preferences/, 500, 'Error', 5)
    await page.getByLabel('Mostrar valores en').selectOption('EUR')
    await expect(page.getByLabel('Mostrar valores en')).toHaveValue('EUR')
    await expect(page.getByRole('status').filter({ hasText: 'Preferencia guardada' })).toHaveClass(/is-visible/)
  })
})
