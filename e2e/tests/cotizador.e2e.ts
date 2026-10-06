import { expect, test, visit } from '../support/fixtures'

// QuoteCard (pantalla /dashboard/cotizador y tarjeta del dashboard) y RateSources: cotizar sin mover saldo.

test.describe('Cotizador', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn({}, { USD: 100 })
    await visit(page, '/dashboard/cotizador')
  })

  test('muestra el título de la pantalla y arranca con 1.000.000 COP → ARS', async ({ page }) => {
    await expect(page).toHaveTitle(/Cotizador/)
    await expect(page.getByRole('heading', { name: '¿Cuánto recibirías?' })).toBeVisible()
    await expect(page.getByLabel('Monto a cambiar')).toHaveValue('1.000.000')
    await expect(page.getByLabel('Moneda que tengo')).toHaveValue('COP')
    await expect(page.getByLabel('Moneda que quiero')).toHaveValue('ARS')
    await expect(page.locator('.quote-card__hint')).toHaveText('No mueve tu saldo')
  })

  test('cotiza con la tasa del servidor y muestra cuánto se recibe', async ({ page }) => {
    // MEP por defecto: COP → ARS = 1100 / 4000 = 0,275 → 1.000.000 COP = 275.000 ARS.
    await expect(page.locator('.quote-result__amount')).toHaveText('$ 275.000,00')
    await expect(page.locator('.quote-result__meta')).toContainText('1 COP = 0,275 ARS')
    await expect(page.locator('.quote-result__meta')).toContainText('dólar MEP, precio de compra')
  })

  test('al escribir un monto nuevo recotiza', async ({ page }) => {
    await page.getByLabel('Monto a cambiar').fill('2000000')
    await expect(page.getByLabel('Monto a cambiar')).toHaveValue('2.000.000')
    await expect(page.locator('.quote-result__amount')).toHaveText('$ 550.000,00')
  })

  test('cotiza entre monedas sin ARS (USD → EUR) y no muestra el selector de tipo de dólar', async ({ page }) => {
    await page.getByLabel('Moneda que tengo').selectOption('USD')
    await page.getByLabel('Moneda que quiero').selectOption('EUR')
    await page.getByLabel('Monto a cambiar').fill('100')

    await expect(page.locator('.quote-result__amount')).toContainText('90,00')
    await expect(page.getByRole('radiogroup', { name: 'Tipo de dólar para el peso argentino' })).toHaveCount(0)
  })

  test('el botón de invertir intercambia las monedas', async ({ page }) => {
    await page.getByRole('button', { name: 'Invertir monedas' }).click()
    await expect(page.getByLabel('Moneda que tengo')).toHaveValue('ARS')
    await expect(page.getByLabel('Moneda que quiero')).toHaveValue('COP')
  })

  test('con la misma moneda de origen y destino pide elegir dos distintas', async ({ page }) => {
    await page.getByLabel('Moneda que quiero').selectOption('COP')
    await expect(page.getByText('Elige dos monedas distintas.')).toBeVisible()
  })

  test('avisa en tiempo real si el monto tiene más de 2 decimales', async ({ page }) => {
    await page.getByLabel('Monto a cambiar').fill('10,555')
    await expect(page.getByText('El monto admite como máximo 2 decimales.')).toBeVisible()
  })

  test('un monto en cero pide un valor mayor que 0 y no cotiza', async ({ page, api }) => {
    const antes = api.callsTo('GET', /rates\/convert/).length
    await page.getByLabel('Monto a cambiar').fill('0')
    await expect(page.getByText('El monto debe ser mayor que 0.')).toBeVisible()
    await expect(page.getByText('Corrige el monto para cotizar.')).toBeVisible()
    expect(api.callsTo('GET', /rates\/convert/).length).toBe(antes)
  })

  test('el campo vacío pide ingresar un monto', async ({ page }) => {
    await page.getByLabel('Monto a cambiar').fill('')
    await expect(page.getByText('Ingresa un monto para cotizar.')).toBeVisible()
  })

  test('muestra el error del servidor si no se puede cotizar', async ({ page, api }) => {
    api.failNext('GET', /rates\/convert/, 503, 'Las tasas no están disponibles.', 3)
    await page.getByLabel('Monto a cambiar').fill('500')
    await expect(page.locator('.quote-card__message--error')).toContainText('Las tasas no están disponibles.')
  })
})

test.describe('Tipo de dólar para ARS', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard/cotizador')
    await expect(page.locator('.quote-result__amount')).toBeVisible()
  })

  test('muestra Oficial, MEP y Blue con MEP elegido', async ({ page }) => {
    const grupo = page.getByRole('radiogroup', { name: 'Tipo de dólar para el peso argentino' })
    await expect(grupo.getByRole('radio', { name: 'MEP' })).toHaveAttribute('aria-checked', 'true')
    await expect(grupo.getByRole('radio', { name: 'Oficial' })).toHaveAttribute('aria-checked', 'false')
    await expect(grupo.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'false')
  })

  test('cambiar de tipo de dólar cambia el resultado sin volver a llamar al servidor', async ({ page, api }) => {
    const llamadas = api.callsTo('GET', /rates\/convert/).length
    await page.getByRole('radio', { name: 'Oficial' }).click()

    // Oficial: 1000 / 4000 = 0,25 → 250.000 ARS.
    await expect(page.locator('.quote-result__amount')).toHaveText('$ 250.000,00')
    expect(api.callsTo('GET', /rates\/convert/).length).toBe(llamadas)
  })

  test('el blue se marca como solo referencia', async ({ page }) => {
    await page.getByRole('radio', { name: 'Blue' }).click()
    await expect(page.getByText('El blue es mercado informal: solo como referencia.')).toBeVisible()
  })

  test('compara lo que se recibiría con cada tipo de dólar', async ({ page }) => {
    const comparacion = page.locator('.quote-compare')
    await expect(comparacion.getByRole('heading', { name: '¿Cuánto recibirías con cada tipo de dólar?' })).toBeVisible()
    await expect(comparacion.locator('li')).toHaveCount(3)
    await expect(comparacion.locator('.quote-compare__row--selected')).toContainText('MEP')
    await expect(comparacion.locator('.quote-compare__row--selected')).toContainText('elegido')
  })

  test('sugiere la mejor opción legal y permite usarla con un clic', async ({ page }) => {
    // Recibiendo ARS conviene el MEP (más pesos). Con Oficial elegido se sugiere cambiar.
    await page.getByRole('radio', { name: 'Oficial' }).click()
    const sugerencia = page.locator('.quote-suggestion')
    await expect(sugerencia).toContainText('Te conviene el dólar MEP')

    await sugerencia.getByRole('button', { name: 'Usar MEP' }).click()
    await expect(page.getByRole('radio', { name: 'MEP' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.quote-suggestion')).toContainText('Estás usando la mejor opción legal: el dólar MEP.')
  })

  test('aclara que el blue daría más pero es informal', async ({ page }) => {
    await expect(page.locator('.quote-suggestion__extra')).toContainText('El blue daría')
    await expect(page.locator('.quote-suggestion__extra')).toContainText('mercado informal')
  })
})

test.describe('Fuentes de las tasas', () => {
  test('lista Frankfurter y DolarApi con su estado actualizado', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard/cotizador')

    const fuentes = page.locator('.rate-sources')
    await expect(fuentes.getByRole('heading', { name: 'Fuentes de las tasas' })).toBeVisible()
    await expect(fuentes.getByText('✓ Actualizadas')).toBeVisible()
    await expect(fuentes.getByText('Frankfurter')).toBeVisible()
    await expect(fuentes.getByText('DolarApi')).toBeVisible()
    await expect(fuentes.getByText('Publica una vez por día hábil')).toBeVisible()
  })

  test('avisa si no se pudo consultar el estado de las fuentes', async ({ page, api }) => {
    api.signIn()
    api.failNext('GET', /\/rates$/, 500, 'Error', 5)
    await visit(page, '/dashboard/cotizador')
    await expect(page.getByText('No se pudo consultar el estado de las fuentes de tasas.')).toBeVisible()
  })
})
