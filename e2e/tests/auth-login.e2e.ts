import { expect, loginFromForm, openSidebar, test, visit } from '../support/fixtures'

// Pantalla /login y ciclo de la sesión: entrar, mantenerse logueado, cerrar sesión y sesión vencida.

test.describe('Inicio de sesión', () => {
  test('muestra el formulario y los enlaces a registro, recuperar contraseña e inicio', async ({ page }) => {
    await visit(page, '/login')
    await expect(page).toHaveTitle(/Iniciar sesión/)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register')
    await expect(page.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('href', '/forgot-password')
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  test('con datos correctos entra al dashboard y saluda por el nombre', async ({ page, api }) => {
    const user = api.addUser({ full_name: 'Ana Pérez', email: 'ana@example.com', password: 'Clave1234' })
    await loginFromForm(page, user.email, 'Clave1234')

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Hola, Ana Pérez' })).toBeVisible()
    await expect(page.getByText('Tu sesión está iniciada con ana@example.com.')).toBeVisible()
  })

  test('manda el email sin espacios y la contraseña tal como se escribió', async ({ page, api }) => {
    api.addUser({ email: 'ana@example.com', password: 'Clave1234' })
    await loginFromForm(page, '  ana@example.com  ', 'Clave1234')

    await expect(page).toHaveURL(/\/dashboard$/)
    const [request] = api.callsTo('POST', /\/auth\/login/)
    expect(request.body).toEqual({ email: 'ana@example.com', password: 'Clave1234' })
  })

  test('con la contraseña equivocada muestra el error y se queda en el login', async ({ page, api }) => {
    api.addUser({ email: 'ana@example.com', password: 'Clave1234' })
    await loginFromForm(page, 'ana@example.com', 'Incorrecta1')

    await expect(page.getByRole('alert').filter({ hasText: 'Email o contraseña incorrectos.' })).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('una cuenta suspendida no puede entrar y se informa el motivo', async ({ page, api }) => {
    api.addUser({ email: 'susp@example.com', password: 'Clave1234', status: 'suspended' })
    await loginFromForm(page, 'susp@example.com', 'Clave1234')

    await expect(page.getByRole('alert').filter({ hasText: 'Tu cuenta está suspendida.' })).toBeVisible()
  })

  test('con los campos vacíos pide email y contraseña sin llamar al servidor', async ({ page, api }) => {
    await visit(page, '/login')
    await page.getByRole('button', { name: 'Ingresar' }).click()

    await expect(page.getByText('El email es obligatorio.')).toBeVisible()
    await expect(page.getByText('La contraseña es obligatoria.')).toBeVisible()
    expect(api.callsTo('POST', /\/auth\/login/)).toHaveLength(0)
  })

  test('avisa si el email tiene un formato inválido', async ({ page }) => {
    await visit(page, '/login')
    await page.getByLabel('Email').fill('sin-arroba')
    await expect(page.getByText('Ingresa un email válido.')).toBeVisible()
  })

  test('muestra un mensaje claro si el servidor no responde', async ({ page, api }) => {
    api.failNext('POST', /\/auth\/login/, 500, 'Error del servidor. Inténtalo más tarde.')
    api.addUser({ email: 'ana@example.com', password: 'Clave1234' })
    await loginFromForm(page, 'ana@example.com', 'Clave1234')

    await expect(page.getByRole('alert').filter({ hasText: 'Error del servidor' })).toBeVisible()
  })

  test('el botón queda deshabilitado mientras se inicia sesión', async ({ page, api }) => {
    api.addUser({ email: 'ana@example.com', password: 'Clave1234' })
    await page.route('**/api/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600))
      await route.fallback()
    })
    await visit(page, '/login')
    await page.getByLabel('Email').fill('ana@example.com')
    await page.getByLabel('Contraseña', { exact: true }).fill('Clave1234')
    await page.getByRole('button', { name: 'Ingresar' }).click()

    await expect(page.getByRole('button', { name: 'Ingresando...' })).toBeDisabled()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('si ya hay una sesión iniciada, /login redirige al dashboard', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/login')
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})

test.describe('Sesión', () => {
  test('sigue iniciada después de recargar la página', async ({ page, api }) => {
    api.signIn({ full_name: 'Ana Pérez' })
    await visit(page, '/dashboard')
    await page.reload()

    await expect(page.getByRole('heading', { name: 'Hola, Ana Pérez' })).toBeVisible()
  })

  test('cerrar sesión desde la barra superior termina la sesión y bloquea el dashboard', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard')
    await page.getByRole('button', { name: 'Cerrar sesión' }).first().click()

    // Al quedar sin usuario, la ruta protegida redirige sola al login.
    await expect(page).toHaveURL(/\/login$/)
    expect(api.sessionUserId).toBeNull()
    await visit(page, '/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('cerrar sesión desde el menú lateral también funciona', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard')
    await openSidebar(page)
    await page.locator('.sidebar__logout').click()

    await expect(page).toHaveURL(/\/login$/)
    expect(api.callsTo('POST', /\/auth\/logout/)).toHaveLength(1)
  })

  test('si el servidor rechaza la sesión (401), cierra la sesión y el login explica que expiró', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard/operaciones/recarga')
    await expect(page.getByRole('heading', { name: 'Recargar mi billetera' })).toBeVisible()

    // La cookie venció en el servidor: la próxima petición protegida responde 401.
    api.sessionUserId = null
    await page.getByRole('link', { name: 'Ver mi billetera' }).or(page.getByRole('link', { name: 'Mi wallet' })).first().click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('status').filter({ hasText: 'Tu sesión expiró' })).toBeVisible()
  })
})
