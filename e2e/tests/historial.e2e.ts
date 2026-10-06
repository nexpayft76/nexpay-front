import { expect, test, visit } from '../support/fixtures'

// Operaciones → Historial (HistoryPage + Pagination): movimientos propios, filtros y paginación.

test.describe('Historial', () => {
  test('sin movimientos muestra el estado vacío', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard/operaciones/historial')
    await expect(page).toHaveTitle(/Historial/)
    // (el texto real trae un espacio antes del punto: "movimientos .")
    await expect(page.getByText(/Todavía no tienes movimientos\s*\./)).toBeVisible()
  })

  test('muestra recargas e intercambios con sus datos', async ({ page, api }) => {
    api.signIn()
    api.addTransaction({ type: 'DEPOSIT', to_currency: 'COP', to_amount: '100000.00' })
    api.addTransaction({
      type: 'EXCHANGE',
      from_currency: 'COP',
      to_currency: 'USD',
      from_amount: '400000.00',
      to_amount: '99.50',
      exchange_rate: 0.00025,
      fee_amount: '2000.00',
      fee_currency: 'COP',
      fee_percent: 0.5,
    })
    await visit(page, '/dashboard/operaciones/historial')

    const items = page.locator('.history-item')
    await expect(items).toHaveCount(2)
    await expect(items.filter({ hasText: 'Intercambio de balance' })).toContainText('Pagaste COP 400.000 y recibiste US$ 99,50')
    await expect(items.filter({ hasText: 'Intercambio de balance' })).toContainText('Tasa: 1 COP = 0,00025 USD')
    await expect(items.filter({ hasText: 'Intercambio de balance' })).toContainText('comisión COP 2.000')
    await expect(items.filter({ hasText: 'Recarga' })).toContainText('Recargaste +COP 100.000')
  })

  test('un intercambio con ARS indica qué dólar se usó', async ({ page, api }) => {
    api.signIn()
    api.addTransaction({
      type: 'EXCHANGE',
      from_currency: 'COP',
      to_currency: 'ARS',
      from_amount: '400000.00',
      to_amount: '109450.00',
      exchange_rate: 0.275,
      ars_rate_type: 'mep',
    })
    await visit(page, '/dashboard/operaciones/historial')
    await expect(page.locator('.history-item')).toContainText('(dólar mep)')
  })

  test('los filtros piden al servidor solo ese tipo de movimiento', async ({ page, api }) => {
    api.signIn()
    api.addTransaction({ type: 'DEPOSIT', to_currency: 'COP', to_amount: '100000.00' })
    api.addTransaction({ type: 'EXCHANGE', from_currency: 'COP', to_currency: 'USD', from_amount: '1000.00', to_amount: '0.25' })
    await visit(page, '/dashboard/operaciones/historial')
    await expect(page.locator('.history-item')).toHaveCount(2)

    await page.getByRole('radio', { name: 'Recargas' }).click()
    await expect(page.locator('.history-item')).toHaveCount(1)
    await expect(page.locator('.history-item')).toContainText('Recargaste')
    expect(api.callsTo('GET', /transactions\/me$/).some((r) => r.query.type === 'DEPOSIT')).toBe(true)

    await page.getByRole('radio', { name: 'Intercambios de balance' }).click()
    await expect(page.locator('.history-item')).toHaveCount(1)
    await expect(page.locator('.history-item')).toContainText('Pagaste')

    await page.getByRole('radio', { name: 'Todas' }).click()
    await expect(page.locator('.history-item')).toHaveCount(2)
  })

  test('un filtro sin resultados dice "de este tipo"', async ({ page, api }) => {
    api.signIn()
    api.addTransaction({ type: 'DEPOSIT', to_currency: 'COP', to_amount: '100000.00' })
    await visit(page, '/dashboard/operaciones/historial')
    await page.getByRole('radio', { name: 'Intercambios de balance' }).click()
    await expect(page.getByText('Todavía no tienes movimientos de este tipo.')).toBeVisible()
  })

  test('pagina de a 20 y permite ir a la página siguiente y volver', async ({ page, api }) => {
    api.signIn()
    for (let i = 1; i <= 25; i++) api.addTransaction({ type: 'DEPOSIT', to_currency: 'COP', to_amount: `${i}000.00` })
    await visit(page, '/dashboard/operaciones/historial')

    await expect(page.locator('.history-item')).toHaveCount(20)
    const paginacion = page.getByRole('navigation', { name: 'Paginación' })
    await expect(paginacion).toContainText('Página 1 de 2')
    await expect(paginacion.getByRole('button', { name: 'Anterior' })).toBeDisabled()

    await paginacion.getByRole('button', { name: 'Siguiente' }).click()
    await expect(paginacion).toContainText('Página 2 de 2')
    await expect(page.locator('.history-item')).toHaveCount(5)
    await expect(paginacion.getByRole('button', { name: 'Siguiente' })).toBeDisabled()

    await paginacion.getByRole('button', { name: 'Anterior' }).click()
    await expect(page.locator('.history-item')).toHaveCount(20)
  })

  test('con una sola página no se muestra la paginación', async ({ page, api }) => {
    api.signIn()
    api.addTransaction({ type: 'DEPOSIT', to_currency: 'COP', to_amount: '1000.00' })
    await visit(page, '/dashboard/operaciones/historial')
    await expect(page.locator('.history-item')).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: 'Paginación' })).toHaveCount(0)
  })

  test('si el servidor falla muestra el error', async ({ page, api }) => {
    api.signIn()
    api.failNext('GET', /transactions\/me$/, 500, 'No se pudo cargar la información.', 5)
    await visit(page, '/dashboard/operaciones/historial')
    await expect(page.getByRole('alert')).toContainText('No se pudo cargar la información.')
  })
})

test.describe('Flujo completo: recargar, intercambiar y verlo en el historial', () => {
  test('cada operación hecha desde la app aparece en el historial', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard/operaciones/recarga')
    await page.getByRole('textbox', { name: 'Monto' }).fill('4000000')
    await page.getByRole('button', { name: /^Recargar COP/ }).click()
    await page.getByRole('button', { name: 'Sí, recargar' }).click()
    await expect(page.getByText('Recarga exitosa')).toBeVisible()

    await page.getByRole('link', { name: 'Hacer otra recarga' }).or(page.getByRole('button', { name: 'Hacer otra recarga' })).click()
    await visit(page, '/dashboard/operaciones/intercambio')
    await page.getByLabel('Monto a pagar').fill('400000')
    await page.getByRole('button', { name: /^Confirmar intercambio/ }).click()
    await page.getByRole('button', { name: 'Sí, confirmar' }).click()
    await expect(page.getByText('Intercambio exitoso')).toBeVisible()

    await visit(page, '/dashboard/operaciones/historial')
    await expect(page.locator('.history-item')).toHaveCount(2)
    await expect(page.locator('.history-item').first()).toContainText('Pagaste COP 400.000')
    await expect(page.locator('.history-item').nth(1)).toContainText('Recargaste +COP 4.000.000')
  })
})
