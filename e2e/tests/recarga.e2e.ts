import { expect, test, visit } from '../support/fixtures'

// Operaciones → Recarga (DepositPage): validación del monto, confirmación y comprobante.

test.describe('Recarga', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn({}, { COP: 50_000 })
    await visit(page, '/dashboard/operaciones/recarga')
  })

  test('muestra el formulario con COP elegido, el saldo actual y el máximo por recarga', async ({ page }) => {
    await expect(page).toHaveTitle(/Recargar/)
    await expect(page.getByRole('heading', { name: 'Recargar mi billetera' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'COP' })).toBeChecked()
    await expect(page.getByText('Dinero ficticio · modo demo').first()).toBeVisible()
    await expect(page.getByText('Saldo actual en COP:')).toContainText('COP 50.000')
    await expect(page.locator('#deposit-limit')).toContainText('Máximo por recarga: COP 50.000.000')
  })

  test('muestra la billetera al costado', async ({ page }) => {
    await expect(page.getByRole('complementary', { name: 'Tu billetera' }).getByText('COP 50.000')).toBeVisible()
  })

  test('el monto se escribe con puntos de miles automáticos', async ({ page }) => {
    const monto = page.getByRole('textbox', { name: 'Monto' })
    await monto.fill('1500000')
    await expect(monto).toHaveValue('1.500.000')
    await monto.fill('1500,5')
    await expect(monto).toHaveValue('1.500,5')
  })

  test('el botón principal muestra el monto a recargar', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Monto' }).fill('250000')
    await expect(page.getByRole('button', { name: 'Recargar COP 250.000' })).toBeVisible()
  })

  test('los montos rápidos completan el campo', async ({ page }) => {
    await page.locator('.op-quick').getByRole('button', { name: 'COP 500.000' }).click()
    await expect(page.getByRole('textbox', { name: 'Monto' })).toHaveValue('500.000')
  })

  test('cambiar de moneda limpia el monto, actualiza el máximo y el saldo mostrado', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Monto' }).fill('1000')
    await page.getByRole('radio', { name: 'USD' }).click()

    await expect(page.getByRole('textbox', { name: 'Monto' })).toHaveValue('')
    await expect(page.locator('#deposit-limit')).toContainText('Máximo por recarga: US$ 10.000')
    await expect(page.getByText('Saldo actual en USD:')).toContainText('US$ 0,00')
  })

  test('avisa al instante si el monto supera el máximo de la moneda', async ({ page }) => {
    await page.getByRole('radio', { name: 'USD' }).click()
    await page.getByRole('textbox', { name: 'Monto' }).fill('10001')
    await expect(page.getByText('El máximo por recarga es US$ 10.000,00.')).toBeVisible()
  })

  test('avisa si el monto tiene más de 2 decimales', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Monto' }).fill('10,999')
    await expect(page.getByText('El monto admite como máximo 2 decimales.')).toBeVisible()
  })

  test('un monto en cero se rechaza', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Monto' }).fill('0')
    await expect(page.getByText('El monto debe ser mayor que 0.')).toBeVisible()
  })

  test('al enviar sin monto avisa "Ingresa un monto." y no abre la confirmación', async ({ page }) => {
    await page.getByRole('button', { name: 'Recargar', exact: true }).click()
    await expect(page.getByText('Ingresa un monto.')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('pide confirmación mostrando el monto y cómo cambia el saldo', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Monto' }).fill('100000')
    await page.getByRole('button', { name: /^Recargar COP/ }).click()

    const dialogo = page.getByRole('dialog', { name: '¿Confirmas la recarga?' })
    await expect(dialogo).toBeVisible()
    await expect(dialogo).toContainText('Vas a agregar COP 100.000')
    await expect(dialogo).toContainText('pasará de COP 50.000 a COP 150.000')
  })

  test('cancelar la confirmación no recarga nada', async ({ page, api }) => {
    await page.getByRole('textbox', { name: 'Monto' }).fill('100000')
    await page.getByRole('button', { name: /^Recargar COP/ }).click()
    await page.getByRole('button', { name: 'Cancelar' }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(api.callsTo('POST', /wallets\/me\/deposits/)).toHaveLength(0)
    expect(api.balanceOf('COP')).toBe(50_000)
  })

  test('Escape cierra la confirmación sin recargar', async ({ page, api }) => {
    await page.getByRole('textbox', { name: 'Monto' }).fill('100000')
    await page.getByRole('button', { name: /^Recargar COP/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(api.callsTo('POST', /wallets\/me\/deposits/)).toHaveLength(0)
  })

  test('confirmar suma el saldo, muestra el comprobante y refresca la billetera', async ({ page, api }) => {
    await page.getByRole('textbox', { name: 'Monto' }).fill('100000')
    await page.getByRole('button', { name: /^Recargar COP/ }).click()
    await page.getByRole('button', { name: 'Sí, recargar' }).click()

    const exito = page.getByRole('status').filter({ hasText: 'Recarga exitosa' })
    await expect(exito).toBeVisible()
    await expect(exito).toContainText('Recargaste COP 100.000')
    await expect(exito).toContainText('Tu saldo en COP ahora es COP 150.000')
    expect(api.callsTo('POST', /wallets\/me\/deposits/)[0].body).toEqual({ currency: 'COP', amount: 100_000 })
    expect(api.balanceOf('COP')).toBe(150_000)
    await expect(page.getByRole('complementary', { name: 'Tu billetera' }).getByText('COP 150.000')).toBeVisible()
  })

  test('el comprobante ofrece volver a la billetera o hacer otra recarga', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Monto' }).fill('1000')
    await page.getByRole('button', { name: /^Recargar COP/ }).click()
    await page.getByRole('button', { name: 'Sí, recargar' }).click()
    await expect(page.getByText('Recarga exitosa')).toBeVisible()

    await page.getByRole('button', { name: 'Hacer otra recarga' }).click()
    await expect(page.getByRole('heading', { name: 'Nueva recarga' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Monto' })).toHaveValue('')
  })

  test('"Ver mi billetera" del comprobante vuelve al dashboard', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Monto' }).fill('1000')
    await page.getByRole('button', { name: /^Recargar COP/ }).click()
    await page.getByRole('button', { name: 'Sí, recargar' }).click()
    await page.getByRole('link', { name: 'Ver mi billetera' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('si el servidor rechaza la recarga muestra su mensaje y no muestra comprobante', async ({ page, api }) => {
    api.failNext('POST', /wallets\/me\/deposits/, 422, 'El monto supera el límite por recarga.')
    await page.getByRole('textbox', { name: 'Monto' }).fill('1000')
    await page.getByRole('button', { name: /^Recargar COP/ }).click()
    await page.getByRole('button', { name: 'Sí, recargar' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'El monto supera el límite por recarga.' })).toBeVisible()
    await expect(page.getByText('Recarga exitosa')).toHaveCount(0)
    expect(api.balanceOf('COP')).toBe(50_000)
  })
})
