import { expect, test, visit } from '../support/fixtures'

// Asistente "Nexa" (AssistantWidget + useAssistantChat): chat de visitante en la landing y de usuario con sesión.

const ABRIR = { name: 'Abrir asistente de NexPay' }

test.describe('Asistente para visitantes (landing)', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/')
    await page.getByRole('button', ABRIR).click()
  })

  test('el botón flotante abre el chat con el saludo y las preguntas sugeridas de un visitante', async ({ page }) => {
    const panel = page.getByRole('dialog', { name: 'Nexa' })
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Soy Nexa, la asistente de NexPay')
    await expect(panel.getByRole('button', { name: '¿Qué es NexPay?' })).toBeVisible()
    await expect(panel.getByRole('button', { name: '¿Cómo creo una cuenta?' })).toBeVisible()
    await expect(panel).toContainText('Respuestas generadas con IA')
    await expect(page.getByLabel('Escribe tu pregunta')).toBeFocused()
  })

  test('escribir una pregunta y enviarla muestra la respuesta y qué modelo respondió', async ({ page, api }) => {
    await page.getByLabel('Escribe tu pregunta').fill('¿Qué es NexPay?')
    await page.getByRole('button', { name: 'Enviar' }).click()

    const panel = page.getByRole('dialog', { name: 'Nexa' })
    await expect(panel.locator('.assistant__bubble--user')).toContainText('¿Qué es NexPay?')
    await expect(panel.locator('.assistant__bubble--assistant')).toContainText('NexPay es una billetera multimoneda')
    await expect(panel.getByText('Respondió: Modelo 1')).toBeVisible()
    // Un visitante usa el chat público, no el de la cuenta.
    expect(api.callsTo('POST', /assistant\/public\/chat/)).toHaveLength(1)
    expect(api.callsTo('POST', /assistant\/chat$/)).toHaveLength(0)
  })

  test('una pregunta sugerida se envía con un clic', async ({ page }) => {
    await page.getByRole('button', { name: '¿Cómo inicio sesión?' }).click()
    await expect(page.locator('.assistant__bubble--user')).toContainText('¿Cómo inicio sesión?')
    await expect(page.locator('.assistant__bubble--assistant')).toBeVisible()
  })

  test('Enter envía y Shift+Enter agrega una línea', async ({ page, api }) => {
    const campo = page.getByLabel('Escribe tu pregunta')
    await campo.fill('línea uno')
    await campo.press('Shift+Enter')
    await campo.pressSequentially('línea dos')
    expect(api.callsTo('POST', /assistant/)).toHaveLength(0)
    await expect(campo).toHaveValue('línea uno\nlínea dos')

    await campo.press('Enter')
    await expect(page.locator('.assistant__bubble--user')).toContainText('línea uno')
    await expect(campo).toHaveValue('')
  })

  test('el botón Enviar está deshabilitado con el campo vacío', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    await page.getByLabel('Escribe tu pregunta').fill('hola')
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeEnabled()
  })

  test('envía el historial de la conversación en cada mensaje nuevo', async ({ page, api }) => {
    const campo = page.getByLabel('Escribe tu pregunta')
    await campo.fill('Primera')
    await campo.press('Enter')
    await expect(page.locator('.assistant__bubble--assistant')).toHaveCount(1)
    await campo.fill('Segunda')
    await campo.press('Enter')
    await expect(page.locator('.assistant__bubble--assistant')).toHaveCount(2)

    const [, segunda] = api.callsTo('POST', /assistant\/public\/chat/)
    expect((segunda.body as { history: unknown[] }).history).toHaveLength(2)
    expect((segunda.body as { message: string }).message).toBe('Segunda')
  })

  test('el selector de modelo lista los modelos con su estado y cupo', async ({ page }) => {
    const selector = page.getByLabel('Modelo')
    await expect(selector.locator('option').first()).toHaveText('Automático (el primero disponible)')
    await expect(selector.locator('option', { hasText: 'Modelo 1' })).toHaveText('1. Modelo 1 · Avanzado · ● disponible')
    await expect(selector.locator('option', { hasText: 'Modelo 2' })).toContainText('○ sin cupo, vuelve en')
  })

  test('elegir un modelo lo envía en la petición', async ({ page, api }) => {
    await page.getByLabel('Modelo').selectOption('m1')
    await page.getByLabel('Escribe tu pregunta').fill('hola')
    await page.getByLabel('Escribe tu pregunta').press('Enter')
    await expect(page.locator('.assistant__bubble--assistant')).toBeVisible()
    expect((api.callsTo('POST', /assistant\/public\/chat/)[0].body as { model: string }).model).toBe('m1')
  })

  test('"Nueva conversación" borra los mensajes', async ({ page }) => {
    await page.getByRole('button', { name: '¿Qué es NexPay?' }).click()
    await expect(page.locator('.assistant__bubble--assistant')).toBeVisible()

    await page.getByRole('button', { name: 'Nueva conversación' }).click()
    await expect(page.locator('.assistant__bubble')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '¿Qué es NexPay?' })).toBeVisible()
  })

  test('Escape y el botón de cerrar cierran el chat devolviendo el foco al botón flotante', async ({ page }) => {
    await page.getByLabel('Escribe tu pregunta').press('Escape')
    await expect(page.getByRole('dialog', { name: 'Nexa' })).toHaveCount(0)
    await expect(page.getByRole('button', ABRIR)).toBeFocused()

    await page.getByRole('button', ABRIR).click()
    await page.getByRole('button', { name: 'Cerrar asistente' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Nexa' })).toHaveCount(0)
  })

  test('la conversación sobrevive a recargar la página (misma pestaña)', async ({ page }) => {
    await page.getByRole('button', { name: '¿Qué es NexPay?' }).click()
    await expect(page.locator('.assistant__bubble--assistant')).toBeVisible()

    await page.reload()
    await page.getByRole('button', ABRIR).click()
    await expect(page.locator('.assistant__bubble--user')).toContainText('¿Qué es NexPay?')
    await expect(page.locator('.assistant__bubble--assistant')).toBeVisible()
  })

  test('si falla muestra el error, devuelve el texto al campo y "Reintentar" lo vuelve a enviar sin duplicarlo', async ({ page, api }) => {
    api.failNext('POST', /assistant\/public\/chat/, 503, 'El asistente no está disponible.')
    await page.getByLabel('Escribe tu pregunta').fill('¿Hay tasas hoy?')
    await page.getByLabel('Escribe tu pregunta').press('Enter')

    const error = page.locator('.assistant__error')
    await expect(error).toContainText('El asistente no está disponible.')
    await expect(page.getByLabel('Escribe tu pregunta')).toHaveValue('¿Hay tasas hoy?')
    await expect(page.locator('.assistant__bubble--user')).toHaveCount(0)

    await error.getByRole('button', { name: 'Reintentar' }).click()
    await expect(page.locator('.assistant__bubble--user')).toHaveCount(1)
    await expect(page.locator('.assistant__bubble--assistant')).toHaveCount(1)
    await expect(error).toHaveCount(0)
  })
})

test.describe('Asistente para usuarios con sesión', () => {
  test('aparece en las pantallas privadas, saluda por el primer nombre y usa el chat de la cuenta', async ({ page, api }) => {
    api.signIn({ full_name: 'Ana María Pérez' }, { USD: 150 })
    await visit(page, '/dashboard')
    await page.getByRole('button', ABRIR).click()

    const panel = page.getByRole('dialog', { name: 'Nexa' })
    await expect(panel).toContainText('¡Hola, Ana!')
    await expect(panel.getByRole('button', { name: '¿Cuál es mi saldo total?' })).toBeVisible()

    await panel.getByRole('button', { name: '¿Cuál es mi saldo total?' }).click()
    await expect(panel.locator('.assistant__bubble--assistant')).toContainText('Tu saldo en USD es 150.00.')
    expect(api.callsTo('POST', /assistant\/chat$/)).toHaveLength(1)
    expect(api.callsTo('POST', /assistant\/public/)).toHaveLength(0)
  })

  test('el asistente está disponible en todas las pantallas del dashboard', async ({ page, api }) => {
    api.signIn()
    for (const ruta of ['/dashboard', '/dashboard/cotizador', '/dashboard/operaciones/recarga', '/dashboard/p2p', '/dashboard/configuracion/usuario']) {
      await visit(page, ruta)
      await expect(page.getByRole('button', ABRIR)).toBeVisible()
    }
  })

  test('la conversación de un usuario no se ve en otra cuenta', async ({ page, api }) => {
    api.signIn({ full_name: 'Ana Pérez', email: 'ana@example.com', password: 'Clave1234' })
    api.addUser({ full_name: 'Beto Ruiz', email: 'beto@example.com', password: 'Clave1234' })
    await visit(page, '/dashboard')
    await page.getByRole('button', ABRIR).click()
    await page.getByRole('button', { name: '¿Cuál es mi saldo total?' }).click()
    await expect(page.locator('.assistant__bubble--assistant')).toBeVisible()

    api.sessionUserId = [...api.users.values()].find((u) => u.email === 'beto@example.com')!.id
    await page.reload()
    await page.getByRole('button', ABRIR).click()
    await expect(page.locator('.assistant__bubble')).toHaveCount(0)
    await expect(page.getByRole('dialog', { name: 'Nexa' })).toContainText('¡Hola, Beto!')
  })
})
