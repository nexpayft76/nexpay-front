import { expect, test, visit } from '../support/fixtures'

// NotificationBell y NotificationToast: la campana, los avisos flotantes y su relación con las alertas.

function notificacion(extra: Record<string, unknown> = {}) {
  return {
    id: `n-${Math.random().toString(36).slice(2, 8)}`,
    type: 'rate_alert',
    title: 'EUR subió',
    message: 'El euro subió 2,5% frente a ayer.',
    read: false,
    created_at: new Date().toISOString(),
    ...extra,
  }
}

test.describe('Campana de notificaciones', () => {
  test('sin notificaciones no muestra contador y el panel explica cuándo aparecerán', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard')

    await expect(page.getByRole('button', { name: 'Notificaciones', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Notificaciones' }).click()
    await expect(page.getByText('Cuando una tasa cumpla una de tus reglas, aparecerá aquí.')).toBeVisible()
  })

  test('el contador cuenta solo las no leídas', async ({ page, api }) => {
    api.signIn()
    api.notifications.push(notificacion(), notificacion(), notificacion({ read: true }))
    await visit(page, '/dashboard')

    await expect(page.getByRole('button', { name: 'Notificaciones, 2 sin leer' })).toBeVisible()
    await expect(page.locator('.notification-bell__count')).toHaveText('2')
  })

  test('con más de 9 sin leer muestra "9+"', async ({ page, api }) => {
    api.signIn()
    for (let i = 0; i < 11; i++) api.notifications.push(notificacion({ title: `Aviso ${i}` }))
    await visit(page, '/dashboard')
    await expect(page.locator('.notification-bell__count')).toHaveText('9+')
  })

  test('abre el panel con título y mensaje, y se cierra al tocar la campana otra vez', async ({ page, api }) => {
    api.signIn()
    api.notifications.push(notificacion())
    await visit(page, '/dashboard')

    const campana = page.getByRole('button', { name: /^Notificaciones/ })
    await campana.click()
    const panel = page.getByRole('region', { name: 'Notificaciones recientes' })
    await expect(panel).toContainText('EUR subió')
    await expect(panel).toContainText('El euro subió 2,5% frente a ayer.')
    await expect(campana).toHaveAttribute('aria-expanded', 'true')

    await campana.click()
    await expect(panel).toHaveCount(0)
  })

  test('tocar una notificación la marca como leída, baja el contador y cierra el panel', async ({ page, api }) => {
    api.signIn()
    const n = notificacion()
    api.notifications.push(n)
    await visit(page, '/dashboard')

    await page.getByRole('button', { name: 'Notificaciones, 1 sin leer' }).click()
    await page.locator('.notification-panel__item').click()

    await expect(page.getByRole('region', { name: 'Notificaciones recientes' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Notificaciones', exact: true })).toBeVisible()
    expect(api.notifications[0].read).toBe(true)
  })

  test('el tacho elimina una notificación', async ({ page, api }) => {
    api.signIn()
    api.notifications.push(notificacion({ title: 'Se va' }), notificacion({ title: 'Se queda' }))
    await visit(page, '/dashboard')

    await page.getByRole('button', { name: /^Notificaciones/ }).click()
    await page.getByRole('button', { name: 'Eliminar Se va' }).click()

    const panel = page.getByRole('region', { name: 'Notificaciones recientes' })
    await expect(panel).not.toContainText('Se va')
    await expect(panel).toContainText('Se queda')
    expect(api.notifications.map((n) => n.title)).toEqual(['Se queda'])
  })

  test('"Administrar alertas" lleva a la pantalla de alertas', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard')
    await page.getByRole('button', { name: 'Notificaciones' }).click()
    await page.getByRole('link', { name: /Administrar alertas/ }).click()
    await expect(page).toHaveURL(/\/configuracion\/alertas$/)
  })

  test('una notificación nueva del servidor aparece sola (consulta cada 15 s) y muestra el aviso flotante', async ({ page, api }) => {
    api.signIn()
    await page.clock.install()
    await visit(page, '/dashboard')
    await expect(page.getByRole('button', { name: 'Notificaciones', exact: true })).toBeVisible()

    api.notifications.push(notificacion({ title: 'Dólar blue en alza', message: 'Superó tu umbral.' }))
    await page.clock.fastForward(16_000)

    await expect(page.getByRole('button', { name: 'Notificaciones, 1 sin leer' })).toBeVisible()
    const aviso = page.locator('.notification-toast')
    await expect(aviso).toContainText('Dólar blue en alza')
    await expect(aviso).toContainText('Superó tu umbral.')
  })

  test('el aviso flotante se cierra con la X y también solo a los 3 segundos', async ({ page, api }) => {
    api.signIn()
    await page.clock.install()
    await visit(page, '/dashboard')
    await expect(page.getByRole('button', { name: 'Notificaciones', exact: true })).toBeVisible()

    api.notifications.push(notificacion({ title: 'Primero' }))
    await page.clock.fastForward(16_000)
    await expect(page.locator('.notification-toast')).toContainText('Primero')
    await page.getByRole('button', { name: 'Cerrar notificación' }).click()
    await expect(page.locator('.notification-toast')).toHaveCount(0)

    api.notifications.push(notificacion({ title: 'Segundo', created_at: new Date(Date.now() + 1000).toISOString() }))
    await page.clock.fastForward(16_000)
    await expect(page.locator('.notification-toast')).toContainText('Segundo')
    await page.clock.fastForward(3_500)
    await expect(page.locator('.notification-toast')).toHaveCount(0)
  })
})

test.describe('Alertas de recarga y saldo bajo', () => {
  const ahora = () => new Date().toISOString()

  test('con una alerta de "Recarga recibida" activa, recargar genera un aviso y una notificación en la campana', async ({ page, api }) => {
    api.signIn()
    api.alerts.push({ id: 'a-dep', kind: 'deposit_received', currency: 'COP', base_currency: 'USD', direction: 'up', threshold: 1, enabled: true, email_enabled: false, created_at: ahora(), updated_at: ahora() })
    await visit(page, '/dashboard/operaciones/recarga')

    await page.getByRole('textbox', { name: 'Monto' }).fill('100000')
    await page.getByRole('button', { name: /^Recargar COP/ }).click()
    await page.getByRole('button', { name: 'Sí, recargar' }).click()

    await expect(page.locator('.notification-toast')).toContainText('Recarga recibida en COP')
    await expect(page.locator('.notification-toast')).toContainText('Sumaste 100000.00 COP a tu wallet.')
    await expect(page.getByRole('button', { name: 'Notificaciones, 1 sin leer' })).toBeVisible()
    expect(api.notifications).toHaveLength(1)
  })

  test('una alerta desactivada no genera avisos', async ({ page, api }) => {
    api.signIn()
    api.alerts.push({ id: 'a-dep', kind: 'deposit_received', currency: 'COP', base_currency: 'USD', direction: 'up', threshold: 1, enabled: false, email_enabled: false, created_at: ahora(), updated_at: ahora() })
    await visit(page, '/dashboard/operaciones/recarga')
    await page.getByRole('textbox', { name: 'Monto' }).fill('1000')
    await page.getByRole('button', { name: /^Recargar COP/ }).click()
    await page.getByRole('button', { name: 'Sí, recargar' }).click()
    await expect(page.getByText('Recarga exitosa')).toBeVisible()

    await expect(page.locator('.notification-toast')).toHaveCount(0)
    expect(api.notifications).toHaveLength(0)
  })

  test('con una alerta de "Saldo bajo", un intercambio que deja poco saldo avisa', async ({ page, api }) => {
    api.signIn({}, { COP: 1_000_000 })
    api.alerts.push({ id: 'a-low', kind: 'low_balance', currency: 'COP', base_currency: 'USD', direction: 'down', threshold: 700_000, enabled: true, email_enabled: false, created_at: ahora(), updated_at: ahora() })
    await visit(page, '/dashboard/operaciones/intercambio')

    await page.getByLabel('Monto a pagar').fill('400000')
    await page.getByRole('button', { name: /^Confirmar intercambio/ }).click()
    await page.getByRole('button', { name: 'Sí, confirmar' }).click()

    await expect(page.locator('.notification-toast')).toContainText('Saldo bajo en COP')
    await expect(page.locator('.notification-toast')).toContainText('Tu saldo quedó en 600000.00 COP.')
  })

  test('con los avisos en pantalla desactivados en Preferencias no aparece el aviso flotante, pero sí la notificación', async ({ page, api }) => {
    api.signIn()
    api.preferences.in_app_notifications = false
    api.alerts.push({ id: 'a-dep', kind: 'deposit_received', currency: 'COP', base_currency: 'USD', direction: 'up', threshold: 1, enabled: true, email_enabled: false, created_at: ahora(), updated_at: ahora() })
    await visit(page, '/dashboard/operaciones/recarga')
    await page.getByRole('textbox', { name: 'Monto' }).fill('1000')
    await page.getByRole('button', { name: /^Recargar COP/ }).click()
    await page.getByRole('button', { name: 'Sí, recargar' }).click()
    await expect(page.getByText('Recarga exitosa')).toBeVisible()

    await expect(page.locator('.notification-toast')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Notificaciones, 1 sin leer' })).toBeVisible()
  })
})
