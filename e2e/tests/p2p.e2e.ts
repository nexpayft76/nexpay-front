import { expect, test, visit } from '../support/fixtures'

// P2P (P2PPage, P2PMarket, P2PPublish, P2PMyOffers, P2PTrades).
// Tasa de prueba: 4000 COP por USD. Comisión P2P 0,5 % para cada parte.

test.describe('P2P: estructura', () => {
  test('muestra el título, las cuatro pestañas y arranca en el Mercado', async ({ page, api }) => {
    api.signIn({}, { USD: 100 })
    await visit(page, '/dashboard/p2p')

    await expect(page).toHaveTitle(/P2P/)
    await expect(page.getByRole('heading', { name: 'Mercado P2P' })).toBeVisible()
    for (const nombre of ['Mercado', 'Publicar', 'Mis ofertas', 'Historial']) {
      await expect(page.getByRole('tab', { name: nombre })).toBeVisible()
    }
    await expect(page.getByRole('tab', { name: 'Mercado' })).toHaveAttribute('aria-selected', 'true')
  })

  test('cambiar de pestaña actualiza la pestaña seleccionada y el panel', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard/p2p')

    await page.getByRole('tab', { name: 'Publicar' }).click()
    await expect(page.getByRole('tab', { name: 'Publicar' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { name: 'Publicar oferta' })).toBeVisible()
    await page.getByRole('tab', { name: 'Mis ofertas' }).click()
    await expect(page.getByText('Todavía no publicaste ofertas.')).toBeVisible()
    await page.getByRole('tab', { name: 'Historial' }).click()
    await expect(page.getByText('Todavía no tienes intercambios P2P aceptados.')).toBeVisible()
  })
})

test.describe('P2P: mercado', () => {
  test('sin ofertas invita a publicar la propia', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard/p2p')
    await expect(page.getByText('No hay ofertas abiertas con estos filtros. ¡Publica la tuya!')).toBeVisible()
  })

  test('lista las ofertas abiertas de otros con vendedor, reputación, tasa y neto', async ({ page, api }) => {
    api.signIn()
    api.addMarketOffer({ seller_name: 'Marcos G.', completed_trades: 3 })
    api.addMarketOffer({ seller_name: 'Lucía P.', completed_trades: 0, sell_currency: 'EUR', buy_currency: 'COP', sell_amount: 50 })
    await visit(page, '/dashboard/p2p')

    const ofertas = page.locator('.p2p-offer')
    await expect(ofertas).toHaveCount(2)
    const marcos = ofertas.filter({ hasText: 'Marcos G.' })
    await expect(marcos).toContainText('3 intercambios')
    await expect(marcos).toContainText('Vende US$ 100,00 por COP 400.000')
    await expect(marcos).toContainText('1 USD = 4.000 COP')
    await expect(marcos).toContainText('igual a la tasa actual')
    await expect(marcos).toContainText('Recibes US$ 99,50')
    await expect(ofertas.filter({ hasText: 'Lucía P.' })).toContainText('Sin intercambios aún')
  })

  test('no muestra las ofertas propias en el mercado', async ({ page, api }) => {
    const yo = api.signIn({}, { USD: 100 })
    api.addMarketOffer({ seller_id: yo.id, seller_name: 'Yo' })
    await visit(page, '/dashboard/p2p')
    await expect(page.locator('.p2p-offer')).toHaveCount(0)
  })

  test('los filtros piden al servidor solo las ofertas de esa moneda', async ({ page, api }) => {
    api.signIn()
    api.addMarketOffer({ seller_name: 'Marcos G.', sell_currency: 'USD', buy_currency: 'COP' })
    api.addMarketOffer({ seller_name: 'Lucía P.', sell_currency: 'EUR', buy_currency: 'COP', sell_amount: 50 })
    await visit(page, '/dashboard/p2p')
    await expect(page.locator('.p2p-offer')).toHaveCount(2)

    await page.getByLabel('Se vende').selectOption('EUR')
    await expect(page.locator('.p2p-offer')).toHaveCount(1)
    await expect(page.locator('.p2p-offer')).toContainText('Lucía P.')
    expect(api.callsTo('GET', /p2p\/offers$/).some((r) => r.query.sell_currency === 'EUR')).toBe(true)

    await page.getByLabel('Se vende').selectOption('')
    await page.getByLabel('Pagas con').selectOption('ARS')
    await expect(page.getByText('No hay ofertas abiertas con estos filtros.')).toBeVisible()
  })

  test('"Actualizar" vuelve a pedir las ofertas', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard/p2p')
    await expect(page.getByText('No hay ofertas abiertas')).toBeVisible()

    api.addMarketOffer({ seller_name: 'Nueva O.' })
    await page.getByRole('button', { name: 'Actualizar' }).click()
    await expect(page.locator('.p2p-offer')).toContainText('Nueva O.')
  })

  test('aceptar una oferta pide confirmación con lo que se paga y se recibe', async ({ page, api }) => {
    api.signIn({}, { COP: 500_000 })
    api.addMarketOffer()
    await visit(page, '/dashboard/p2p')
    await page.getByRole('button', { name: 'Aceptar oferta' }).click()

    const dialogo = page.getByRole('dialog', { name: '¿Aceptas la oferta?' })
    await expect(dialogo).toContainText('Pagas COP 400.000 y recibes US$ 99,50')
    await expect(dialogo).toContainText('Tasa de la oferta: 1 USD = 4.000 COP.')
    await expect(dialogo).toContainText('El cambio es instantáneo')
  })

  test('cancelar la confirmación no acepta nada', async ({ page, api }) => {
    api.signIn({}, { COP: 500_000 })
    api.addMarketOffer()
    await visit(page, '/dashboard/p2p')
    await page.getByRole('button', { name: 'Aceptar oferta' }).click()
    await page.getByRole('button', { name: 'Cancelar' }).click()

    expect(api.callsTo('POST', /accept$/)).toHaveLength(0)
    expect(api.balanceOf('COP')).toBe(500_000)
  })

  test('aceptar mueve el dinero, avisa el resultado, saca la oferta del mercado y la suma al historial', async ({ page, api }) => {
    api.signIn({}, { COP: 500_000 })
    api.addMarketOffer()
    await visit(page, '/dashboard/p2p')
    await page.getByRole('button', { name: 'Aceptar oferta' }).click()
    await page.getByRole('button', { name: 'Sí, aceptar' }).click()

    await expect(page.getByRole('status').filter({ hasText: '¡Listo! Pagaste COP 400.000 y recibiste US$ 99,50.' })).toBeVisible()
    await expect(page.locator('.p2p-offer')).toHaveCount(0)
    expect(api.balanceOf('COP')).toBe(100_000)
    expect(api.balanceOf('USD')).toBe(99.5)

    await page.getByRole('tab', { name: 'Historial' }).click()
    const trade = page.locator('.history-item')
    await expect(trade).toContainText('Compraste')
    await expect(trade).toContainText('Oferta de: Marcos G.')
    await expect(trade).toContainText('Pagaste COP 400.000 y recibiste US$ 99,50')
    await expect(trade).toContainText('comisión US$ 0,50 (0,5%)')
  })

  test('sin saldo suficiente muestra el error del servidor y no mueve nada', async ({ page, api }) => {
    api.signIn({}, { COP: 1000 })
    api.addMarketOffer()
    await visit(page, '/dashboard/p2p')
    await page.getByRole('button', { name: 'Aceptar oferta' }).click()
    await page.getByRole('button', { name: 'Sí, aceptar' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'Saldo insuficiente para aceptar la oferta.' })).toBeVisible()
    expect(api.balanceOf('COP')).toBe(1000)
  })

  test('si otra persona la aceptó antes, avisa que ya no está disponible y la quita de la lista', async ({ page, api }) => {
    api.signIn({}, { COP: 500_000 })
    const oferta = api.addMarketOffer()
    await visit(page, '/dashboard/p2p')
    await page.getByRole('button', { name: 'Aceptar oferta' }).click()
    oferta.status = 'completed'
    await page.getByRole('button', { name: 'Sí, aceptar' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'La oferta ya no está disponible.' })).toBeVisible()
    await expect(page.locator('.p2p-offer')).toHaveCount(0)
  })

  test('si el mercado falla muestra el error', async ({ page, api }) => {
    api.signIn()
    api.failNext('GET', /p2p\/offers$/, 500, 'No se pudo cargar el mercado.', 5)
    await visit(page, '/dashboard/p2p')
    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo cargar el mercado.' })).toBeVisible()
  })
})

test.describe('P2P: publicar una oferta', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn({}, { USD: 200 })
    await visit(page, '/dashboard/p2p')
    await page.getByRole('tab', { name: 'Publicar' }).click()
  })

  test('arranca vendiendo USD y recibiendo COP, con el saldo disponible', async ({ page }) => {
    await expect(page.getByRole('radiogroup', { name: 'Moneda que vendes' }).getByRole('radio', { name: 'USD' })).toBeChecked()
    await expect(page.getByRole('radiogroup', { name: 'Moneda que quieres recibir' }).getByRole('radio', { name: 'COP' })).toBeChecked()
    await expect(page.locator('#p2p-available')).toContainText('US$ 200,00')
    await expect(page.getByText('Ingresa un monto para ver la tasa actual y cuánto recibirías.')).toBeVisible()
  })

  test('simula la oferta: tasa actual, tasa propia, comisión y lo que recibirías', async ({ page }) => {
    await page.getByLabel('Monto a vender').fill('100')

    const resumen = page.locator('.op-summary dl')
    await expect(resumen).toContainText('1 USD = 4.000 COP')
    await expect(resumen).toContainText('El comprador paga')
    await expect(resumen).toContainText('COP 400.000')
    await expect(resumen).toContainText('COP 2.000 (0,5% de lo que recibes)')
    await expect(resumen.locator('.op-summary__total')).toContainText('COP 398.000')
    await expect(page.locator('#p2p-rate-hint')).toContainText('permitida entre 3.600 y 4.400')
  })

  test('una tasa propia dentro del rango recalcula el resumen', async ({ page }) => {
    await page.getByLabel('Monto a vender').fill('100')
    await expect(page.locator('.op-summary__total')).toContainText('COP 398.000')

    await page.getByLabel(/^Tu tasa/).fill('4200')
    // 100 USD × 4200 = 420.000; comisión 0,5 % = 2.100 → recibe 417.900. Es +5 % sobre la tasa actual.
    await expect(page.locator('.op-summary__total')).toContainText('COP 417.900')
    await expect(page.locator('.op-summary dl')).toContainText('5% sobre la tasa actual')

    await page.getByRole('button', { name: 'Usar tasa actual' }).click()
    await expect(page.getByLabel(/^Tu tasa/)).toHaveValue('')
    await expect(page.locator('.op-summary__total')).toContainText('COP 398.000')
  })

  test('una tasa fuera de ±10 % se rechaza con el mensaje del servidor y no deja publicar', async ({ page }) => {
    await page.getByLabel('Monto a vender').fill('100')
    await page.getByLabel(/^Tu tasa/).fill('9000')

    await expect(page.getByRole('alert').filter({ hasText: 'La tasa debe estar a ±10% de la tasa actual.' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publicar oferta' })).toBeDisabled()
  })

  test('avisa saldo insuficiente al instante', async ({ page }) => {
    await page.getByLabel('Monto a vender').fill('500')
    await expect(page.getByText('Saldo insuficiente: tienes US$ 200,00.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publicar oferta' })).toBeDisabled()
  })

  test('"Usar todo" completa el monto con el saldo disponible', async ({ page }) => {
    await page.getByRole('button', { name: 'Usar todo' }).click()
    await expect(page.getByLabel('Monto a vender')).toHaveValue('200')
  })

  test('elegir como moneda a vender la que se quiere recibir las invierte', async ({ page }) => {
    await page.getByRole('radiogroup', { name: 'Moneda que vendes' }).getByRole('radio', { name: 'COP' }).click()
    await expect(page.getByRole('radiogroup', { name: 'Moneda que quieres recibir' }).getByRole('radio', { name: 'USD' })).toBeChecked()
  })

  test('publicar retiene el monto, lleva a "Mis ofertas" y muestra la oferta abierta', async ({ page, api }) => {
    await page.getByLabel('Monto a vender').fill('100')
    await expect(page.getByRole('button', { name: 'Publicar oferta' })).toBeEnabled()
    await page.getByRole('button', { name: 'Publicar oferta' }).click()

    const dialogo = page.getByRole('dialog', { name: '¿Publicas la oferta?' })
    await expect(dialogo).toContainText('Vendes US$ 100,00 a 4.000 COP por USD')
    await expect(dialogo).toContainText('recibes COP 398.000')
    await expect(dialogo).toContainText('quedan retenidos desde ahora')
    await dialogo.getByRole('button', { name: 'Sí, publicar' }).click()

    await expect(page.getByRole('tab', { name: 'Mis ofertas' })).toHaveAttribute('aria-selected', 'true')
    const oferta = page.locator('.p2p-offer')
    await expect(oferta).toContainText('Abierta')
    await expect(oferta).toContainText('Vendes US$ 100,00 a 4.000 COP por USD')
    await expect(oferta).toContainText('Retenido en garantía')
    expect(api.balanceOf('USD')).toBe(100)
    expect(api.callsTo('POST', /p2p\/offers$/)[0].body).toMatchObject({ sell_currency: 'USD', buy_currency: 'COP', sell_amount: 100, rate: 4000 })
  })

  test('cancelar la confirmación no publica nada', async ({ page, api }) => {
    await page.getByLabel('Monto a vender').fill('100')
    await page.getByRole('button', { name: 'Publicar oferta' }).click()
    await page.getByRole('button', { name: 'Cancelar' }).click()

    expect(api.callsTo('POST', /p2p\/offers$/)).toHaveLength(0)
    expect(api.balanceOf('USD')).toBe(200)
  })
})

test.describe('P2P: mis ofertas', () => {
  test('cancelar una oferta abierta devuelve lo retenido', async ({ page, api }) => {
    const yo = api.signIn({}, { USD: 100 })
    api.addMarketOffer({ seller_id: yo.id, seller_name: 'Yo', sell_amount: 100 })
    await visit(page, '/dashboard/p2p')
    await page.getByRole('tab', { name: 'Mis ofertas' }).click()

    await page.getByRole('button', { name: 'Cancelar oferta' }).click()
    const dialogo = page.getByRole('dialog', { name: '¿Cancelas la oferta?' })
    await expect(dialogo).toContainText('Se te devuelven US$ 100,00 a tu saldo')
    await dialogo.getByRole('button', { name: 'Sí, cancelar' }).click()

    await expect(page.locator('.p2p-offer .p2p-status')).toHaveText('Cancelada')
    await expect(page.getByRole('button', { name: 'Cancelar oferta' })).toHaveCount(0)
    expect(api.balanceOf('USD')).toBe(200)
  })

  test('las ofertas cerradas se ven con su estado y sin botón de cancelar', async ({ page, api }) => {
    const yo = api.signIn()
    api.addMarketOffer({ seller_id: yo.id, status: 'completed' })
    api.addMarketOffer({ seller_id: yo.id, status: 'expired' })
    await visit(page, '/dashboard/p2p')
    await page.getByRole('tab', { name: 'Mis ofertas' }).click()

    await expect(page.locator('.p2p-status')).toHaveText(['Completada', 'Vencida'])
    await expect(page.getByRole('button', { name: 'Cancelar oferta' })).toHaveCount(0)
    await expect(page.locator('.p2p-offer').first()).toContainText('Recibiste')
  })

  test('si ya no se puede cancelar muestra el error del servidor', async ({ page, api }) => {
    const yo = api.signIn()
    api.addMarketOffer({ seller_id: yo.id })
    await visit(page, '/dashboard/p2p')
    await page.getByRole('tab', { name: 'Mis ofertas' }).click()
    api.failNext('POST', /cancel$/, 409, 'La oferta ya no se puede cancelar.')
    await page.getByRole('button', { name: 'Cancelar oferta' }).click()
    await page.getByRole('button', { name: 'Sí, cancelar' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'La oferta ya no se puede cancelar.' })).toBeVisible()
  })
})
