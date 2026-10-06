import { expect, test, visit } from '../support/fixtures'

// AppRouter, ProtectedRoute y SuperuserRoute: quién puede entrar a cada ruta y adónde lo manda.

const PANTALLAS_PRIVADAS = [
  '/dashboard',
  '/dashboard/cotizador',
  '/dashboard/operaciones/recarga',
  '/dashboard/operaciones/intercambio',
  '/dashboard/operaciones/historial',
  '/dashboard/p2p',
  '/dashboard/configuracion/alertas',
  '/dashboard/configuracion/preferencias',
  '/dashboard/configuracion/usuario',
]

test.describe('Sin sesión', () => {
  for (const ruta of PANTALLAS_PRIVADAS) {
    test(`${ruta} redirige al login`, async ({ page }) => {
      await visit(page, ruta)
      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    })
  }

  test('las pantallas públicas (landing, login, registro, recuperar contraseña) son accesibles', async ({ page }) => {
    for (const ruta of ['/', '/login', '/register', '/forgot-password']) {
      await visit(page, ruta)
      await expect(page).toHaveURL(new RegExp(`${ruta === '/' ? '/$' : ruta}$`))
    }
  })

  test('una ruta que no existe vuelve a la landing', async ({ page }) => {
    await visit(page, '/esta-ruta-no-existe')
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe('Con sesión', () => {
  test.beforeEach(({ api }) => {
    api.signIn({ full_name: 'Ana Pérez' })
  })

  test('/dashboard/operaciones redirige a la recarga', async ({ page }) => {
    await visit(page, '/dashboard/operaciones')
    await expect(page).toHaveURL(/\/dashboard\/operaciones\/recarga$/)
  })

  test('/dashboard/configuracion redirige a las alertas', async ({ page }) => {
    await visit(page, '/dashboard/configuracion')
    await expect(page).toHaveURL(/\/dashboard\/configuracion\/alertas$/)
  })

  test('el enlace viejo /operaciones/compra sigue funcionando y lleva al intercambio', async ({ page }) => {
    await visit(page, '/dashboard/operaciones/compra')
    await expect(page).toHaveURL(/\/dashboard\/operaciones\/intercambio$/)
    await expect(page.getByRole('heading', { name: 'Intercambio de balance' })).toBeVisible()
  })

  test('una ruta inexistente vuelve a la landing', async ({ page }) => {
    await visit(page, '/dashboard/no-existe')
    await expect(page).toHaveURL(/\/$/)
  })

  test('un usuario común que entra a una pantalla de superusuario vuelve a su billetera', async ({ page }) => {
    await visit(page, '/dashboard/superusuario/comisiones')
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Hola, Ana Pérez' })).toBeVisible()
  })

  test('un usuario común no ve el menú de Superusuario', async ({ page }) => {
    await visit(page, '/dashboard')
    await expect(page.getByRole('navigation', { name: 'Menú principal' }).getByRole('button', { name: 'Superusuario' })).toHaveCount(0)
  })
})

test.describe('Superusuario', () => {
  test('/dashboard/superusuario redirige a Comisiones', async ({ page, api }) => {
    api.signIn({ role: 'superuser', full_name: 'Admin Nex' })
    await visit(page, '/dashboard/superusuario')
    await expect(page).toHaveURL(/\/dashboard\/superusuario\/comisiones$/)
    await expect(page.getByRole('heading', { name: 'Comisiones', level: 1 })).toBeVisible()
  })

  test('el menú lateral incluye el grupo Superusuario', async ({ page, api }) => {
    api.signIn({ role: 'superuser' })
    await visit(page, '/dashboard')
    await expect(page.getByRole('button', { name: 'Superusuario' })).toBeVisible()
  })
})
