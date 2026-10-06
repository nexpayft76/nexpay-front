import { expect, test, visit } from '../support/fixtures'

// Landing pública (Landing, CurrencyQuote, WalletPreview): lo que ve cualquier visitante.
// Tasas de prueba: 4000 COP por USD, 0,9 EUR por USD; dólar oficial 1000, MEP 1100, blue 1200.

test.describe('Landing: encabezado y navegación', () => {
  test('un visitante ve "Iniciar sesión" y "Crear cuenta" y el mensaje principal', async ({ page }) => {
    await visit(page, '/')
    await expect(page).toHaveTitle(/NexPay/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cada cambio de moneda esconde un costo.')
    const cuenta = page.getByRole('navigation', { name: 'Cuenta' })
    await expect(cuenta.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    await expect(cuenta.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register')
    await expect(page.getByRole('link', { name: 'Crear cuenta gratis' })).toHaveAttribute('href', '/register')
    await expect(page.getByRole('link', { name: 'Ya tengo cuenta' })).toHaveAttribute('href', '/login')
  })

  test('los botones del encabezado llevan a login y registro', async ({ page }) => {
    await visit(page, '/')
    await page.getByRole('navigation', { name: 'Cuenta' }).getByRole('link', { name: 'Iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.getByRole('link', { name: 'Volver al inicio' }).click()
    await page.getByRole('navigation', { name: 'Cuenta' }).getByRole('link', { name: 'Crear cuenta' }).click()
    await expect(page).toHaveURL(/\/register$/)
  })

  test('los enlaces de sección apuntan a las secciones de la página', async ({ page }) => {
    await visit(page, '/')
    const secciones = page.getByRole('navigation', { name: 'Secciones' })
    for (const [nombre, ancla] of [['Billetera', '#billetera'], ['Cotizador', '#cotizador'], ['Nuestro diferencial', '#mercado-p2p'], ['Seguridad', '#seguridad']]) {
      await expect(secciones.getByRole('link', { name: nombre })).toHaveAttribute('href', ancla)
      await expect(page.locator(ancla)).toBeAttached()
    }
  })

  test('"Probar el cotizador" lleva a la sección del cotizador', async ({ page }) => {
    await visit(page, '/')
    await page.getByRole('link', { name: 'Probar el cotizador' }).click()
    await expect(page).toHaveURL(/#cotizador$/)
    await expect(page.locator('#cotizador')).toBeInViewport()
  })

  test('un usuario con sesión ve "Mi dashboard" y el botón de cerrar sesión, sin los botones de registro', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/')
    const cuenta = page.getByRole('navigation', { name: 'Cuenta' })
    await expect(cuenta.getByRole('link', { name: 'Mi dashboard' })).toHaveAttribute('href', '/dashboard')
    await expect(cuenta.getByRole('link', { name: 'Iniciar sesión' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Crear cuenta gratis' })).toHaveCount(0)

    await cuenta.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(cuenta.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible()
    expect(api.sessionUserId).toBeNull()
  })

  test('el botón de tema alterna entre claro y oscuro (parte del tema del sistema del visitante)', async ({ page }) => {
    await visit(page, '/')
    const html = page.locator('html')
    const inicial = (await html.getAttribute('data-theme')) === 'light' ? 'light' : 'dark'
    const otro = inicial === 'light' ? 'dark' : 'light'

    await page.getByRole('button', { name: `Cambiar a modo ${otro === 'light' ? 'claro' : 'oscuro'}` }).click()
    await expect(html).toHaveAttribute('data-theme', otro)
    await page.getByRole('button', { name: `Cambiar a modo ${inicial === 'light' ? 'claro' : 'oscuro'}` }).click()
    await expect(html).toHaveAttribute('data-theme', inicial)
  })

  test('muestra las secciones de contenido (problema, solución, P2P, seguridad y llamado final)', async ({ page }) => {
    await visit(page, '/')
    for (const id of ['wallet-title', 'problem-title', 'features-title', 'steps-title', 'budget-title', 'security-title', 'cta-title']) {
      await expect(page.locator(`#${id}`)).toBeAttached()
    }
    await expect(page.locator('#seguridad')).toContainText('Operaciones simuladas')
  })
})

test.describe('Landing: cotizador', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/')
    await expect(page.locator('.quote-card__value')).toBeVisible()
  })

  test('arranca con 1.000.000 COP → ARS y muestra lo que se recibe con el dólar MEP', async ({ page }) => {
    await expect(page.locator('#quote-amount')).toHaveValue('1.000.000')
    await expect(page.locator('.quote-card__value')).toHaveText('275.000 ARS')
    await expect(page.locator('.quote-card__rate')).toContainText('1 COP = 0,275 ARS · dólar MEP')
    await expect(page.locator('.quote__fine')).toContainText('Tasa de mercado, sin comisiones')
  })

  test('compara el mismo monto con los tres dólares argentinos y la diferencia entre ellos', async ({ page }) => {
    const tipos = page.locator('.quote__types')
    await expect(tipos.locator('li')).toHaveCount(3)
    await expect(tipos.locator('li').filter({ hasText: 'Oficial' })).toContainText('250.000 ARS')
    await expect(tipos.locator('li').filter({ hasText: 'MEP' })).toContainText('275.000 ARS')
    await expect(tipos.locator('li').filter({ hasText: 'Blue' })).toContainText('300.000 ARS')
    await expect(tipos.locator('li.is-main')).toContainText('MEP')
    await expect(tipos).toContainText('la diferencia llega a 50.000 ARS')
  })

  test('escribir un monto recotiza y formatea con puntos de miles', async ({ page }) => {
    await page.locator('#quote-amount').fill('2000000')
    await expect(page.locator('#quote-amount')).toHaveValue('2.000.000')
    await expect(page.locator('.quote-card__value')).toHaveText('550.000 ARS')
  })

  test('el deslizador cambia el monto', async ({ page }) => {
    await page.getByRole('slider', { name: 'Monto a convertir en COP' }).fill('2000000')
    await expect(page.locator('#quote-amount')).toHaveValue('2.000.000')
    await expect(page.locator('.quote-card__value')).toHaveText('550.000 ARS')
  })

  test('el botón ⇄ invierte las monedas y usa el monto inicial de la nueva moneda de origen', async ({ page }) => {
    await page.getByRole('button', { name: 'Invertir monedas' }).click()
    await expect(page.locator('#quote-amount')).toHaveValue('500.000')
    await expect(page.locator('.quote__amount-code')).toHaveText('ARS')
    await expect(page.locator('.quote-card__rate')).toContainText('1 ARS = ')
  })

  test('sin ARS (USD → EUR) no se muestran los tres dólares y la tasa es la oficial', async ({ page }) => {
    await page.getByLabel('Tienes').selectOption('USD')
    await page.getByLabel('Recibes en').selectOption('EUR')

    await expect(page.locator('#quote-amount')).toHaveValue('250')
    await expect(page.locator('.quote-card__value')).toHaveText('225,00 EUR')
    await expect(page.locator('.quote__types')).toHaveCount(0)
  })

  test('elegir como origen la moneda de destino las intercambia', async ({ page }) => {
    await page.getByLabel('Tienes').selectOption('ARS')
    await expect(page.getByLabel('Recibes en')).toHaveValue('COP')
  })

  test('con el monto vacío pide ingresar un monto', async ({ page }) => {
    await page.locator('#quote-amount').fill('')
    await expect(page.getByText('Ingresa un monto en COP.')).toBeVisible()
  })

  test('si no hay tasas muestra el error y "Reintentar" vuelve a cotizar', async ({ page, api }) => {
    api.failNext('GET', /rates\/convert/, 503, 'Las tasas no están disponibles.', 30)
    await page.locator('#quote-amount').fill('3000000')
    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos traer las tasas en vivo.' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('Las tasas no están disponibles.')

    api.clearFailures()
    await page.getByRole('button', { name: 'Reintentar' }).first().click()
    await expect(page.locator('.quote-card__value')).toHaveText('825.000 ARS')
  })
})

test.describe('Landing: ejemplo de billetera', () => {
  test('muestra los cuatro saldos de ejemplo y el total en USD', async ({ page }) => {
    await visit(page, '/')
    const billetera = page.locator('.wallet')
    await expect(billetera.locator('.wallet__list li')).toHaveCount(4)
    await expect(billetera.locator('.wallet__balance').first()).toBeVisible()
    // 1.250 USD + 830 EUR/0,9 + 452.300 ARS/1100 + 2.180.000 COP/4000.
    await expect(billetera.locator('.wallet__total')).toHaveText('3.128,40 USD')
  })

  test('cambiar la moneda del total recalcula todo', async ({ page }) => {
    await visit(page, '/')
    await expect(page.locator('.wallet__total')).toHaveText('3.128,40 USD')

    await page.getByRole('group', { name: 'Moneda del total' }).getByRole('button', { name: 'EUR' }).click()
    await expect(page.getByRole('group', { name: 'Moneda del total' }).getByRole('button', { name: 'EUR' })).toHaveAttribute('aria-pressed', 'true')
    // 3.128,40 USD × 0,9 = 2.815,56 EUR.
    await expect(page.locator('.wallet__total')).toHaveText('2.815,56 EUR')
  })

  test('si las tasas fallan muestra el error y permite reintentar', async ({ page, api }) => {
    api.failNext('GET', /\/rates$/, 500, 'No se pudieron obtener las tasas.', 30)
    await visit(page, '/')
    const error = page.locator('.wallet__error')
    await expect(error).toContainText('No se pudieron obtener las tasas.')
    await expect(page.locator('.wallet__total')).toHaveText('—')

    api.clearFailures()
    await error.getByRole('button', { name: 'Reintentar' }).click()
    await expect(page.locator('.wallet__total')).toHaveText('3.128,40 USD')
  })
})
