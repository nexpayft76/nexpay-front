import { expect, test, visit } from '../support/fixtures'

// Pantalla /register: validación en tiempo real, email disponible y creación de la cuenta.

test.describe('Registro', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/register')
  })

  test('muestra el formulario con sus cuatro campos y el enlace para iniciar sesión', async ({ page }) => {
    await expect(page).toHaveTitle(/Crear cuenta/)
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
    await expect(page.getByLabel('Nombre completo')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Repetir contraseña')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
  })

  test('al enviar el formulario vacío marca todos los campos obligatorios y no llama al servidor', async ({ page, api }) => {
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    await expect(page.getByText('El nombre es obligatorio.')).toBeVisible()
    await expect(page.getByText('El email es obligatorio.')).toBeVisible()
    await expect(page.getByText('La contraseña es obligatoria.')).toBeVisible()
    await expect(page.getByText('Repite la contraseña.')).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: 'Revisa los campos marcados.' })).toBeVisible()
    expect(api.callsTo('POST', /\/auth\/register/)).toHaveLength(0)
  })

  test('avisa si el nombre tiene menos de 2 caracteres', async ({ page }) => {
    await page.getByLabel('Nombre completo').fill('A')
    await expect(page.getByText('Ingresa al menos 2 caracteres.')).toBeVisible()
  })

  test('avisa si el email no tiene formato válido', async ({ page }) => {
    await page.getByLabel('Email').fill('ana@')
    await expect(page.getByText('Ingresa un email válido.')).toBeVisible()
  })

  test('confirma "Email disponible" cuando el email todavía no tiene cuenta', async ({ page }) => {
    await page.getByLabel('Email').fill('nueva@example.com')
    await expect(page.getByText('✓ Email disponible')).toBeVisible()
  })

  test('avisa que el email ya existe y ofrece iniciar sesión', async ({ page, api }) => {
    api.addUser({ email: 'existente@example.com' })
    await page.getByLabel('Email').fill('existente@example.com')

    await expect(page.getByText('Ya existe una cuenta con este email.')).toBeVisible()
    await expect(page.locator('#register-email-hint').getByRole('link', { name: 'Inicia sesión' })).toBeVisible()
  })

  test('no permite registrar un email ocupado aunque lo demás esté bien', async ({ page, api }) => {
    api.addUser({ email: 'existente@example.com' })
    await page.getByLabel('Nombre completo').fill('Ana Pérez')
    await page.getByLabel('Email').fill('existente@example.com')
    await expect(page.getByText('Ya existe una cuenta con este email.')).toBeVisible()
    await page.getByLabel('Contraseña', { exact: true }).fill('Clave1234')
    await page.getByLabel('Repetir contraseña').fill('Clave1234')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'Revisa los campos marcados.' })).toBeVisible()
    expect(api.callsTo('POST', /\/auth\/register/)).toHaveLength(0)
  })

  test('tilda las reglas de la contraseña mientras se escribe', async ({ page }) => {
    const rules = page.locator('#register-password-rules')
    await page.getByLabel('Contraseña', { exact: true }).fill('abc')
    await expect(rules.getByText('Entre 8 y 72 caracteres')).toContainText('(falta)')
    await expect(rules.getByText('Al menos una letra')).toContainText('(cumple)')
    await expect(rules.getByText('Al menos un número')).toContainText('(falta)')

    await page.getByLabel('Contraseña', { exact: true }).fill('abcdefg1')
    await expect(rules.getByText('Entre 8 y 72 caracteres')).toContainText('(cumple)')
    await expect(rules.getByText('Al menos un número')).toContainText('(cumple)')
  })

  test('avisa cuando las contraseñas no coinciden y confirma cuando sí', async ({ page }) => {
    await page.getByLabel('Contraseña', { exact: true }).fill('Clave1234')
    await page.getByLabel('Repetir contraseña').fill('Otra12345')
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()

    await page.getByLabel('Repetir contraseña').fill('Clave1234')
    await expect(page.getByText('✓ Las contraseñas coinciden')).toBeVisible()
  })

  test('el ojito muestra y oculta la contraseña', async ({ page }) => {
    const password = page.getByLabel('Contraseña', { exact: true })
    await password.fill('Clave1234')
    await expect(password).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: 'Mostrar contraseña' }).first().click()
    await expect(password).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Ocultar contraseña' }).first().click()
    await expect(password).toHaveAttribute('type', 'password')
  })

  test('crea la cuenta, envía los datos limpios y entra directo al dashboard', async ({ page, api }) => {
    await page.getByLabel('Nombre completo').fill('  Lucía Gómez  ')
    await page.getByLabel('Email').fill('lucia@example.com')
    await expect(page.getByText('✓ Email disponible')).toBeVisible()
    await page.getByLabel('Contraseña', { exact: true }).fill('Clave1234')
    await page.getByLabel('Repetir contraseña').fill('Clave1234')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Hola, Lucía Gómez' })).toBeVisible()
    const [request] = api.callsTo('POST', /\/auth\/register/)
    expect(request.body).toEqual({ full_name: 'Lucía Gómez', email: 'lucia@example.com', password: 'Clave1234' })
  })

  test('muestra el error del servidor si el registro falla', async ({ page, api }) => {
    api.failNext('POST', /\/auth\/register/, 409, 'Ya existe una cuenta con este email.')
    await page.getByLabel('Nombre completo').fill('Lucía Gómez')
    await page.getByLabel('Email').fill('lucia@example.com')
    await expect(page.getByText('✓ Email disponible')).toBeVisible()
    await page.getByLabel('Contraseña', { exact: true }).fill('Clave1234')
    await page.getByLabel('Repetir contraseña').fill('Clave1234')
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'Ya existe una cuenta con este email.' })).toBeVisible()
    await expect(page).toHaveURL(/\/register$/)
  })

  test('si ya hay una sesión iniciada, redirige al dashboard', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/register')
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})
