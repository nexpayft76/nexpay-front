import { expect, test, visit } from '../support/fixtures'

// Dashboard "Mi wallet": saludo, total estimado, billetera por moneda y gráfico (TotalEstimate, WalletCard, RateChart).

test.describe('Dashboard', () => {
  test('saluda con el nombre y el email del usuario', async ({ page, api }) => {
    api.signIn({ full_name: 'Ana Pérez', email: 'ana@example.com' })
    await visit(page, '/dashboard')

    await expect(page).toHaveTitle(/Mi billetera/)
    await expect(page.getByRole('heading', { name: 'Hola, Ana Pérez' })).toBeVisible()
    await expect(page.getByText('Tu sesión está iniciada con ana@example.com.')).toBeVisible()
  })

  test('muestra las cuatro monedas con su saldo y el equivalente en la moneda elegida', async ({ page, api }) => {
    api.signIn({}, { COP: 4_000_000, USD: 100, EUR: 90 })
    await visit(page, '/dashboard')

    const billetera = page.getByRole('region', { name: 'Mi billetera' })
    for (const nombre of ['Peso colombiano', 'Peso argentino', 'Dólar estadounidense', 'Euro']) {
      await expect(billetera.getByText(nombre, { exact: true })).toBeVisible()
    }
    await expect(billetera.getByText('COP 4.000.000')).toBeVisible()
    await expect(billetera.getByText('US$ 100,00', { exact: true })).toBeVisible()
    // 4.000.000 COP = 1.000 USD con la tasa de prueba (4000 COP por dólar).
    await expect(billetera.getByText('≈ US$ 1.000,00', { exact: true })).toBeVisible()
  })

  test('el total estimado suma todos los saldos convertidos a la moneda elegida', async ({ page, api }) => {
    api.signIn({}, { COP: 4_000_000, USD: 100 })
    await visit(page, '/dashboard')

    // 1.000 USD (de los COP) + 100 USD = 1.100 USD.
    await expect(page.locator('.total-estimate__amount')).toHaveText('US$ 1.100,00')
    await expect(page.getByText('Tasas en vivo')).toBeVisible()
  })

  test('una billetera sin saldo invita a hacer la primera recarga', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard')
    await expect(page.getByText('Todavía no tienes saldo. Cuando hagas tu primera recarga, lo verás aquí en las 4 monedas.')).toBeVisible()
    await expect(page.locator('.total-estimate__amount')).toHaveText('US$ 0,00')
  })

  test('cambiar la moneda del total también cambia la de la billetera y la del gráfico', async ({ page, api }) => {
    api.signIn({}, { USD: 100 })
    await visit(page, '/dashboard')

    await page.getByLabel('Moneda del total estimado').selectOption('EUR')

    await expect(page.getByRole('region', { name: 'Mi billetera' }).getByLabel('Ver en')).toHaveValue('EUR')
    await expect(page.getByLabel('Moneda de destino')).toHaveValue('EUR')
    // 100 USD × 0,9 = 90 EUR.
    await expect(page.locator('.total-estimate__amount')).toContainText('90,00')
  })

  test('cambiar la moneda desde la billetera actualiza el total y la preferencia guardada', async ({ page, api }) => {
    api.signIn({}, { USD: 100 })
    await visit(page, '/dashboard')

    await page.getByRole('region', { name: 'Mi billetera' }).getByLabel('Ver en').selectOption('COP')

    await expect(page.getByLabel('Moneda del total estimado')).toHaveValue('COP')
    await expect(page.locator('.total-estimate__amount')).toContainText('400.000')
    await page.reload()
    await expect(page.getByLabel('Moneda del total estimado')).toHaveValue('COP')
  })

  test('si la billetera falla muestra el error y "Reintentar" la carga de nuevo', async ({ page, api }) => {
    api.signIn({}, { USD: 100 })
    // React en desarrollo monta dos veces cada pantalla: se deja fallar varias veces y se corta antes de reintentar.
    api.failNext('GET', /\/wallets\/me$/, 500, 'No se pudo cargar tu billetera.', 20)
    await visit(page, '/dashboard')

    const billetera = page.getByRole('region', { name: 'Mi billetera' })
    await expect(billetera.getByRole('alert')).toContainText('No se pudo cargar tu billetera.')
    api.clearFailures()
    await billetera.getByRole('button', { name: 'Reintentar' }).click()
    await expect(billetera.getByText('US$ 100,00', { exact: true })).toBeVisible()
  })
})

test.describe('Gráfico de tasas', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard')
  })

  test('arranca con COP → USD en 1 mes y muestra el título del par', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '1 COP en USD' })).toBeVisible()
    await expect(page.getByLabel('Moneda de origen')).toHaveValue('COP')
    await expect(page.getByLabel('Moneda de destino')).toHaveValue('USD')
    await expect(page.getByRole('radio', { name: 'el último mes' })).toBeChecked()
  })

  test('cambiar el rango vuelve a pedir el historial con ese rango', async ({ page, api }) => {
    await page.getByRole('radio', { name: 'los últimos 3 meses' }).click()

    await expect(page.getByRole('radio', { name: 'los últimos 3 meses' })).toBeChecked()
    await expect.poll(() => api.callsTo('GET', /rates\/history/).some((r) => r.query.range === '3m')).toBe(true)
  })

  test('invertir las monedas intercambia origen y destino', async ({ page }) => {
    // El gráfico se descarga bajo demanda: se apunta a su botón, no al del cotizador que ya está en pantalla.
    await page.locator('.pair-select__swap').click()
    await expect(page.getByLabel('Moneda de origen')).toHaveValue('USD')
    await expect(page.getByLabel('Moneda de destino')).toHaveValue('COP')
    await expect(page.getByRole('heading', { name: '1 USD en COP' })).toBeVisible()
  })

  test('elegir como origen la misma moneda de destino las intercambia (nunca "USD → USD")', async ({ page }) => {
    await page.getByLabel('Moneda de origen').selectOption('USD')
    await expect(page.getByLabel('Moneda de origen')).toHaveValue('USD')
    await expect(page.getByLabel('Moneda de destino')).toHaveValue('COP')
  })

  test('con ARS el gráfico trae las tres series de dólar: oficial, MEP y blue', async ({ page, api }) => {
    await page.getByLabel('Moneda de origen').selectOption('ARS')
    await expect.poll(() => api.callsTo('GET', /rates\/history/).some((r) => r.query.from === 'ARS')).toBe(true)

    const grafico = page.getByRole('region', { name: /1 ARS en/ })
    await expect(grafico.getByText('Oficial').first()).toBeVisible()
    await expect(grafico.getByText('MEP').first()).toBeVisible()
    await expect(grafico.getByText('Blue').first()).toBeVisible()
  })

  test('si el historial falla muestra el error del gráfico sin romper el resto del dashboard', async ({ page, api }) => {
    api.failNext('GET', /rates\/history/, 500, 'No se pudo cargar el historial.', 20)
    await page.reload()

    await expect(page.locator('.rate-chart__error')).toContainText('No se pudo cargar el historial.')
    await expect(page.getByRole('heading', { name: 'Mi billetera' })).toBeVisible()
  })
})
