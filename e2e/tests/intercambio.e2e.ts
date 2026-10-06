import { expect, test, visit } from '../support/fixtures'

// Operaciones → Intercambio de balance (ExchangePage): cotización exacta, validaciones, confirmación y comprobante.
// Tasas de prueba: 4000 COP por USD, 0,9 EUR por USD, dólar MEP 1100 (compra) / 1120 (venta). Comisión 0,5 %.

async function escribirMonto(page: import('@playwright/test').Page, texto: string) {
  await page.getByLabel('Monto a pagar').fill(texto)
}

test.describe('Intercambio de balance', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn({}, { COP: 4_000_000, USD: 50 })
    await visit(page, '/dashboard/operaciones/intercambio')
  })

  test('arranca pagando con COP y recibiendo USD, con el saldo disponible a la vista', async ({ page }) => {
    await expect(page).toHaveTitle(/Intercambio de balance/)
    await expect(page.getByRole('radiogroup', { name: 'Moneda con la que pagas' }).getByRole('radio', { name: 'COP' })).toBeChecked()
    await expect(page.getByRole('radiogroup', { name: 'Moneda que recibes' }).getByRole('radio', { name: 'USD' })).toBeChecked()
    await expect(page.locator('#exchange-available')).toContainText('COP 4.000.000')
    await expect(page.getByText('Ingresa un monto para ver cuánto recibes.')).toBeVisible()
  })

  test('no deja elegir como destino la misma moneda de origen', async ({ page }) => {
    await expect(page.getByRole('radiogroup', { name: 'Moneda que recibes' }).getByRole('radio', { name: 'COP' })).toBeDisabled()
  })

  test('elegir como origen la moneda de destino las invierte', async ({ page }) => {
    await page.getByRole('radiogroup', { name: 'Moneda con la que pagas' }).getByRole('radio', { name: 'USD' }).click()
    await expect(page.getByRole('radiogroup', { name: 'Moneda que recibes' }).getByRole('radio', { name: 'COP' })).toBeChecked()
  })

  test('el botón ⇅ invierte las monedas y limpia el monto', async ({ page }) => {
    await escribirMonto(page, '1000')
    await page.getByRole('button', { name: 'Invertir monedas' }).click()

    await expect(page.getByRole('radiogroup', { name: 'Moneda con la que pagas' }).getByRole('radio', { name: 'USD' })).toBeChecked()
    await expect(page.getByRole('radiogroup', { name: 'Moneda que recibes' }).getByRole('radio', { name: 'COP' })).toBeChecked()
    await expect(page.getByLabel('Monto a pagar')).toHaveValue('')
  })

  test('muestra el detalle exacto: tasa, comisión y lo que se recibe', async ({ page }) => {
    await escribirMonto(page, '400000')

    const resumen = page.locator('.op-summary dl')
    await expect(resumen.getByText('Intercambio').first()).toBeVisible()
    await expect(resumen).toContainText('1 COP = 0,00025 USD')
    await expect(resumen).toContainText('Tasa oficial del día (2026-10-06)')
    // 0,5 % de 400.000 = 2.000 de comisión; (400.000 − 2.000) / 4000 = 99,50 USD.
    await expect(resumen).toContainText('COP 2.000 (0.5%)')
    await expect(resumen.locator('.op-summary__total')).toContainText('US$ 99,50')
    await expect(page.getByRole('button', { name: 'Confirmar intercambio: recibir US$ 99,50' })).toBeEnabled()
  })

  test('"Usar todo" completa el monto con el saldo disponible', async ({ page }) => {
    await page.getByRole('button', { name: 'Usar todo' }).click()
    await expect(page.getByLabel('Monto a pagar')).toHaveValue('4.000.000')
  })

  test('avisa saldo insuficiente al instante y no deja confirmar', async ({ page, api }) => {
    await escribirMonto(page, '5000000')
    await expect(page.getByText('Saldo insuficiente: tienes COP 4.000.000.')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Confirmar/ })).toBeDisabled()
    expect(api.callsTo('GET', /exchange\/quote/)).toHaveLength(0)
  })

  test('avisa si el monto tiene más de 2 decimales', async ({ page }) => {
    await escribirMonto(page, '10,123')
    await expect(page.getByText('El monto admite como máximo 2 decimales.')).toBeVisible()
  })

  test('sin monto el botón de confirmar está deshabilitado', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Confirmar', exact: true })).toBeDisabled()
  })

  test('al enviar con el campo tocado y vacío avisa "Ingresa un monto."', async ({ page }) => {
    await page.getByLabel('Monto a pagar').focus()
    await page.getByLabel('Monto a pagar').blur()
    await expect(page.getByText('Ingresa un monto.')).toBeVisible()
  })

  test('con ARS aparece el selector del tipo de dólar (MEP u Oficial) y cambia la tasa', async ({ page }) => {
    await page.getByRole('radiogroup', { name: 'Moneda que recibes' }).getByRole('radio', { name: 'ARS' }).click()
    const tipos = page.getByRole('radiogroup', { name: 'Tipo de dólar' })
    await expect(tipos.getByRole('radio', { name: 'MEP' })).toHaveAttribute('aria-checked', 'true')
    await expect(tipos.getByRole('radio', { name: 'Blue' })).toHaveCount(0)

    await escribirMonto(page, '400000')
    await expect(page.locator('.op-summary dl')).toContainText('Dólar MEP en vivo')
    // (400.000 − 2.000) × 0,275 = 109.450 ARS con MEP.
    await expect(page.locator('.op-summary__total')).toContainText('109.450,00')

    await tipos.getByRole('radio', { name: 'Oficial' }).click()
    // Oficial: 1000/4000 = 0,25 → 398.000 × 0,25 = 99.500 ARS.
    await expect(page.locator('.op-summary__total')).toContainText('99.500,00')
  })

  test('sin ARS no se muestra el selector del tipo de dólar', async ({ page }) => {
    await expect(page.getByRole('radiogroup', { name: 'Tipo de dólar' })).toHaveCount(0)
  })

  test('pide confirmación con lo que se paga, lo que se recibe y la tasa', async ({ page }) => {
    await escribirMonto(page, '400000')
    await page.getByRole('button', { name: /^Confirmar intercambio/ }).click()

    const dialogo = page.getByRole('dialog', { name: '¿Confirmas el intercambio?' })
    await expect(dialogo).toContainText('Vas a pagar COP 400.000 y recibir US$ 99,50.')
    await expect(dialogo).toContainText('1 COP = 0,00025 USD')
    await expect(dialogo).toContainText('comisión COP 2.000')
  })

  test('cancelar la confirmación no mueve dinero', async ({ page, api }) => {
    await escribirMonto(page, '400000')
    await page.getByRole('button', { name: /^Confirmar intercambio/ }).click()
    await page.getByRole('button', { name: 'Cancelar' }).click()

    expect(api.callsTo('POST', /transactions\/me\/exchange$/)).toHaveLength(0)
    expect(api.balanceOf('COP')).toBe(4_000_000)
  })

  test('confirmar mueve el dinero, muestra el comprobante y actualiza los saldos', async ({ page, api }) => {
    await escribirMonto(page, '400000')
    await page.getByRole('button', { name: /^Confirmar intercambio/ }).click()
    await page.getByRole('button', { name: 'Sí, confirmar' }).click()

    const exito = page.getByRole('status').filter({ hasText: 'Intercambio exitoso' })
    await expect(exito).toBeVisible()
    await expect(exito).toContainText('Pagaste COP 400.000 y recibiste US$ 99,50.')
    await expect(exito).toContainText('Tus saldos ahora: COP 3.600.000 y US$ 149,50.')
    expect(api.callsTo('POST', /transactions\/me\/exchange$/)[0].body).toEqual({
      from_currency: 'COP',
      to_currency: 'USD',
      amount: 400_000,
      ars_rate: 'mep',
    })
    expect(api.balanceOf('COP')).toBe(3_600_000)
    expect(api.balanceOf('USD')).toBe(149.5)
  })

  test('el comprobante permite hacer otra operación', async ({ page }) => {
    await escribirMonto(page, '40000')
    await page.getByRole('button', { name: /^Confirmar intercambio/ }).click()
    await page.getByRole('button', { name: 'Sí, confirmar' }).click()
    await page.getByRole('button', { name: 'Hacer otra operación' }).click()

    await expect(page.getByRole('heading', { name: 'Nueva operación' })).toBeVisible()
    await expect(page.getByLabel('Monto a pagar')).toHaveValue('')
  })

  test('si el servidor rechaza la operación (saldo cambió) muestra el error y no el comprobante', async ({ page, api }) => {
    await escribirMonto(page, '400000')
    await expect(page.getByRole('button', { name: /^Confirmar intercambio/ })).toBeEnabled()
    api.failNext('POST', /transactions\/me\/exchange$/, 422, 'Saldo insuficiente para hacer la operación.')
    await page.getByRole('button', { name: /^Confirmar intercambio/ }).click()
    await page.getByRole('button', { name: 'Sí, confirmar' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'Saldo insuficiente para hacer la operación.' })).toBeVisible()
    await expect(page.getByText('Intercambio exitoso')).toHaveCount(0)
  })

  test('si la cotización falla muestra el error y no permite confirmar', async ({ page, api }) => {
    api.failNext('GET', /exchange\/quote/, 503, 'Las tasas no están disponibles.', 5)
    await escribirMonto(page, '400000')
    await expect(page.getByRole('alert').filter({ hasText: 'Las tasas no están disponibles.' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar', exact: true })).toBeDisabled()
  })
})

test('sin saldo no ofrece "Usar todo" y cualquier monto es saldo insuficiente', async ({ page, api }) => {
  api.signIn()
  await visit(page, '/dashboard/operaciones/intercambio')

  await expect(page.getByRole('button', { name: 'Usar todo' })).toHaveCount(0)
  await escribirMonto(page, '10')
  await expect(page.getByText('Saldo insuficiente: tienes COP 0.')).toBeVisible()
})
