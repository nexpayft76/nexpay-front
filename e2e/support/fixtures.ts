import { expect, test as base, type Page } from '@playwright/test'
import { MockApi } from './mock-api'

interface Fixtures {
  /** Backend simulado de este test. Arranca sin sesión; `api.signIn()` deja al usuario ya logueado. */
  api: MockApi
}

/**
 * `test` de NexPay: igual al de Playwright, pero cada test recibe `api` (el backend simulado, ya conectado al navegador)
 * y falla si la página lanza un error de JavaScript sin atrapar (una pantalla que se rompe).
 */
export const test = base.extend<Fixtures>({
  api: [
    async ({ context }, provide) => {
    const api = new MockApi()
    await api.install(context)
    // Nada sale a internet: fuentes, videos o analíticas externas se cortan para que los tests sean estables.
    await context.route(
      (url) => !['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol.startsWith('http'),
      (route) => route.abort(),
    )
    await provide(api)
    },
    // Siempre activo: aunque el test no lo pida, el navegador nunca habla con un backend real.
    { auto: true },
  ],

  page: async ({ page }, provide) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await provide(page)
    expect(errors, 'La página lanzó errores de JavaScript sin atrapar').toEqual([])
  },
})

export { expect }

/** Entra a una pantalla y espera a que la app termine de verificar la sesión. */
export async function visit(page: Page, path: string) {
  await page.goto(path)
  await expect(page.getByText('Verificando sesión...')).toHaveCount(0)
}

/** Inicia sesión desde la pantalla de login, como lo haría una persona. */
export async function loginFromForm(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

/** Abre el menú lateral (en desktop arranca contraído) y espera a que muestre los textos. */
export async function openSidebar(page: Page) {
  const toggle = page.getByRole('button', { name: 'Abrir menú' })
  if (await toggle.isVisible()) await toggle.click()
  await expect(page.getByRole('button', { name: 'Cerrar menú' }).first()).toBeVisible()
}
