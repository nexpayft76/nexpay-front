import type { Page } from '@playwright/test'
import { expect, test, visit } from '../support/fixtures'

// Configuración → Alertas (AlertsPage + AlertsContext): crear, editar, activar/desactivar y eliminar reglas.

/** Campo del formulario por el texto de su etiqueta (las etiquetas envuelven al campo y su nombre accesible incluye las opciones). */
function campo(page: Page, etiqueta: string | RegExp) {
  return page.locator('.alert-form label.field').filter({ has: page.locator('span', { hasText: etiqueta }).first() }).locator('select, input')
}

const REGLA_DIARIA = 'Avisarme si EUR sube más del 2.00% frente a ayer.'

test.describe('Alertas', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard/configuracion/alertas')
  })

  test('sin alertas muestra el estado vacío y el formulario con una regla de ejemplo', async ({ page }) => {
    await expect(page).toHaveTitle(/Alertas/)
    await expect(page.getByRole('heading', { name: 'Tus notificaciones' })).toBeVisible()
    await expect(page.getByText('Aún no tienes alertas.')).toBeVisible()
    await expect(page.getByText('0 activas')).toBeVisible()
    await expect(page.locator('.alert-form__preview')).toHaveText(REGLA_DIARIA)
  })

  test('la vista previa de la regla cambia mientras se completa el formulario', async ({ page }) => {
    await campo(page, /^Moneda$/).selectOption('COP')
    await campo(page, /^Condición$/).selectOption('down')
    await campo(page, /^Porcentaje$/).fill('5')
    await expect(page.locator('.alert-form__preview')).toHaveText('Avisarme si COP baja más del 5.00% frente a ayer.')

    await campo(page, /^Tipo de alerta$/).selectOption('target_rate')
    await campo(page, /^Comparada con$/).selectOption('USD')
    await campo(page, /^Condición$/).selectOption('up')
    await campo(page, /^Valor en COP$/).fill('4200')
    await expect(page.locator('.alert-form__preview')).toHaveText('Avisarme si 1 USD supera 4200.00 COP.')

    await campo(page, /^Tipo de alerta$/).selectOption('low_balance')
    await campo(page, /^Avisar cuando baje de COP$/).fill('10000')
    await expect(page.locator('.alert-form__preview')).toHaveText('Avisarme si mi saldo en COP baja de 10000.00 COP.')

    await campo(page, /^Tipo de alerta$/).selectOption('deposit_received')
    await expect(page.locator('.alert-form__preview')).toHaveText('Avisarme cada vez que reciba una recarga en COP.')
    await expect(page.getByText('Se activará cuando una recarga de COP se registre correctamente en tu wallet.')).toBeVisible()
  })

  test('crea una alerta, la envía al servidor y la muestra activa en la lista', async ({ page, api }) => {
    await page.getByRole('button', { name: 'Crear alerta' }).click()

    const lista = page.locator('.alert-list')
    await expect(lista.getByText(REGLA_DIARIA)).toBeVisible()
    await expect(lista.getByText('Solo campanita')).toBeVisible()
    await expect(page.getByText('1 activas')).toBeVisible()
    expect(api.callsTo('POST', /\/alerts$/)[0].body).toMatchObject({
      kind: 'daily_change',
      currency: 'EUR',
      base_currency: 'USD',
      direction: 'up',
      threshold: 2,
      email_enabled: false,
    })
  })

  test('con "También enviarme un email" la alerta queda con campanita + email', async ({ page }) => {
    await page.getByLabel('También enviarme un email').check()
    await page.getByRole('button', { name: 'Crear alerta' }).click()
    await expect(page.locator('.alert-list').getByText('Campanita + email')).toBeVisible()
  })

  test('un umbral en cero no se envía: el navegador marca el campo como inválido', async ({ page, api }) => {
    await campo(page, /^Porcentaje$/).fill('0')
    await page.getByRole('button', { name: 'Crear alerta' }).click()

    expect(await campo(page, /^Porcentaje$/).evaluate((el: HTMLInputElement) => el.validity.rangeUnderflow)).toBe(true)
    expect(api.callsTo('POST', /\/alerts$/)).toHaveLength(0)
    await expect(page.getByText('Aún no tienes alertas.')).toBeVisible()
  })

  test('después de crear una alerta el formulario vuelve a sus valores iniciales', async ({ page }) => {
    await campo(page, /^Porcentaje$/).fill('7')
    await page.getByRole('button', { name: 'Crear alerta' }).click()
    await expect(page.locator('.alert-list li')).toHaveCount(1)
    await expect(campo(page, /^Porcentaje$/)).toHaveValue('2')
  })

  test('desactivar una alerta la marca como inactiva y actualiza el contador', async ({ page, api }) => {
    await page.getByRole('button', { name: 'Crear alerta' }).click()
    await expect(page.getByText('1 activas')).toBeVisible()

    await page.getByRole('checkbox', { name: /^Desactivar alerta/ }).evaluate((el: HTMLInputElement) => el.click())
    await expect(page.getByText('0 activas')).toBeVisible()
    await expect(page.locator('.alert-list li')).toHaveClass(/is-disabled/)
    expect(api.callsTo('PATCH', /\/alerts\//)[0].body).toEqual({ enabled: false })

    await page.getByRole('checkbox', { name: /^Activar alerta/ }).evaluate((el: HTMLInputElement) => el.click())
    await expect(page.getByText('1 activas')).toBeVisible()
  })

  test('editar una alerta carga sus datos, guarda los cambios y permite cancelar', async ({ page, api }) => {
    await page.getByRole('button', { name: 'Crear alerta' }).click()
    await page.getByRole('button', { name: 'Editar alerta' }).click()

    await expect(page.getByText('Actualiza cuándo avisarte')).toBeVisible()
    await expect(campo(page, /^Porcentaje$/)).toHaveValue('2')
    await campo(page, /^Porcentaje$/).fill('3')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page.locator('.alert-list')).toContainText('Avisarme si EUR sube más del 3.00% frente a ayer.')
    expect(api.alerts[0].threshold).toBe(3)

    await page.getByRole('button', { name: 'Editar alerta' }).click()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText('Elige cuándo avisarte')).toBeVisible()
    await expect(campo(page, /^Porcentaje$/)).toHaveValue('2')
  })

  test('eliminar una alerta la saca de la lista y del servidor', async ({ page, api }) => {
    await page.getByRole('button', { name: 'Crear alerta' }).click()
    await expect(page.locator('.alert-list li')).toHaveCount(1)

    await page.getByRole('button', { name: 'Eliminar alerta' }).click()
    await expect(page.getByText('Aún no tienes alertas.')).toBeVisible()
    expect(api.alerts).toHaveLength(0)
  })

  test('si el servidor falla al crear muestra el error y conserva lo escrito', async ({ page, api }) => {
    api.failNext('POST', /\/alerts$/, 500, 'Error')
    await campo(page, /^Porcentaje$/).fill('9')
    await page.getByRole('button', { name: 'Crear alerta' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos guardar la alerta. Inténtalo de nuevo.' })).toBeVisible()
    await expect(campo(page, /^Porcentaje$/)).toHaveValue('9')
  })

  test('las alertas guardadas en el servidor aparecen al entrar', async ({ page, api }) => {
    const ahora = new Date().toISOString()
    api.alerts.push({ id: 'a-1', kind: 'daily_change', currency: 'COP', base_currency: 'USD', direction: 'down', threshold: 4, enabled: true, email_enabled: false, created_at: ahora, updated_at: ahora })
    await page.reload()
    await expect(page.locator('.alert-list')).toContainText('Avisarme si COP baja más del 4.00% frente a ayer.')
  })
})

test.describe('Alertas con el backend sin módulo de alertas (404)', () => {
  test('crea reglas locales (saldo bajo) que sobreviven a recargar la página', async ({ page, api }) => {
    api.signIn()
    api.alertsBackendAvailable = false
    await visit(page, '/dashboard/configuracion/alertas')

    await campo(page, /^Tipo de alerta$/).selectOption('low_balance')
    await campo(page, /^Avisar cuando baje de/).fill('100')
    await page.getByRole('button', { name: 'Crear alerta' }).click()
    await expect(page.locator('.alert-list')).toContainText('Avisarme si mi saldo en EUR baja de 100.00 EUR.')

    await page.reload()
    await expect(page.locator('.alert-list')).toContainText('Avisarme si mi saldo en EUR baja de 100.00 EUR.')
  })

  test('una regla que necesita al servidor (variación diaria) no se puede guardar', async ({ page, api }) => {
    api.signIn()
    api.alertsBackendAvailable = false
    await visit(page, '/dashboard/configuracion/alertas')

    await page.getByRole('button', { name: 'Crear alerta' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos guardar la alerta' })).toBeVisible()
    await expect(page.getByText('Aún no tienes alertas.')).toBeVisible()
  })
})

test.describe('Alertas con el servidor caído (500)', () => {
  test('avisa del error, desactiva los tipos que dependen del servidor y deja "Saldo bajo"', async ({ page, api }) => {
    api.signIn()
    api.failNext('GET', /\/alerts$/, 500, 'Error', 20)
    await visit(page, '/dashboard/configuracion/alertas')

    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos cargar tus alertas. Inténtalo de nuevo.' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Variación diaria' })).toHaveJSProperty('disabled', true)
    await expect(page.getByRole('option', { name: 'Tasa objetivo' })).toHaveJSProperty('disabled', true)
    await expect(page.getByRole('option', { name: 'Fuente desactualizada' })).toHaveJSProperty('disabled', true)
    await expect(page.getByRole('option', { name: 'Saldo bajo' })).toHaveJSProperty('disabled', false)
    await expect(campo(page, /^Tipo de alerta$/)).toHaveValue('low_balance')
  })
})
