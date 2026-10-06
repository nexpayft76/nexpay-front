import { expect, test, visit } from '../support/fixtures'

// Flujo "Olvidé mi contraseña": pedir el enlace (/forgot-password) y crear la nueva (/reset-password#token=…).

test.describe('Pedir el enlace de recuperación', () => {
  test('desde el login, "¿Olvidaste tu contraseña?" lleva al formulario conservando el email escrito', async ({ page }) => {
    await visit(page, '/login')
    await page.getByLabel('Email').fill('ana@example.com')
    await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click()

    await expect(page).toHaveURL(/\/forgot-password$/)
    await expect(page.getByLabel('Email')).toHaveValue('ana@example.com')
  })

  test('valida el email antes de enviar', async ({ page, api }) => {
    await visit(page, '/forgot-password')
    await page.getByRole('button', { name: 'Enviar enlace' }).click()
    await expect(page.getByText('El email es obligatorio.')).toBeVisible()

    await page.getByLabel('Email').fill('no-es-email')
    await page.getByRole('button', { name: 'Enviar enlace' }).click()
    await expect(page.getByText('Ingresa un email válido.')).toBeVisible()
    expect(api.callsTo('POST', /password-reset\/request/)).toHaveLength(0)
  })

  test('al enviar muestra siempre el mismo aviso (no revela si el email existe)', async ({ page, api }) => {
    await visit(page, '/forgot-password')
    await page.getByLabel('Email').fill('desconocido@example.com')
    await page.getByRole('button', { name: 'Enviar enlace' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Si el correo está registrado, recibirás instrucciones' })).toBeVisible()
    expect(api.callsTo('POST', /password-reset\/request/)[0].body).toEqual({ email: 'desconocido@example.com' })
    await expect(page.getByRole('link', { name: 'Volver a iniciar sesión' })).toBeVisible()
  })

  test('si el servidor falla, muestra el error y deja reintentar', async ({ page, api }) => {
    api.failNext('POST', /password-reset\/request/, 500, 'Error')
    await visit(page, '/forgot-password')
    await page.getByLabel('Email').fill('ana@example.com')
    await page.getByRole('button', { name: 'Enviar enlace' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo procesar la solicitud' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enviar enlace' })).toBeEnabled()
  })
})

test.describe('Crear la nueva contraseña', () => {
  test('un enlace sin token se informa como inválido y ofrece pedir otro', async ({ page }) => {
    await visit(page, '/reset-password')
    await expect(page.getByRole('alert').filter({ hasText: 'El enlace no es válido o está incompleto.' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Solicitar un nuevo enlace' })).toHaveAttribute('href', '/forgot-password')
  })

  test('el botón se habilita solo cuando la contraseña cumple las reglas y coincide', async ({ page }) => {
    await visit(page, '/reset-password#token=token-valido')
    const boton = page.getByRole('button', { name: 'Cambiar contraseña' })
    await expect(boton).toBeDisabled()

    await page.getByLabel('Nueva contraseña', { exact: true }).fill('corta')
    await expect(page.getByText('Debe tener al menos 8 caracteres.')).toBeVisible()

    await page.getByLabel('Nueva contraseña', { exact: true }).fill('SoloLetras')
    await expect(page.getByText('Debe contener al menos una letra y un número.')).toBeVisible()

    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva12345')
    await expect(page.getByText('✓ La contraseña cumple los requisitos.')).toBeVisible()
    await page.getByLabel('Repetir nueva contraseña').fill('Distinta123')
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()
    await expect(boton).toBeDisabled()

    await page.getByLabel('Repetir nueva contraseña').fill('Nueva12345')
    await expect(boton).toBeEnabled()
  })

  test('con un token válido cambia la contraseña y ofrece iniciar sesión', async ({ page, api }) => {
    await visit(page, '/reset-password#token=token-valido')
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva12345')
    await page.getByLabel('Repetir nueva contraseña').fill('Nueva12345')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Tu contraseña se actualizó correctamente.' })).toBeVisible()
    expect(api.callsTo('POST', /password-reset\/confirm/)[0].body).toEqual({ token: 'token-valido', new_password: 'Nueva12345' })
    await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
  })

  test('con un token vencido muestra el error del servidor y no confirma el cambio', async ({ page }) => {
    await visit(page, '/reset-password#token=token-vencido')
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva12345')
    await page.getByLabel('Repetir nueva contraseña').fill('Nueva12345')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'El enlace venció o ya fue usado.' })).toBeVisible()
    await expect(page.getByText('Tu contraseña se actualizó correctamente.')).toHaveCount(0)
  })

  test('después de cambiarla se puede iniciar sesión con la nueva contraseña', async ({ page, api }) => {
    const user = api.addUser({ email: 'ana@example.com', password: 'Vieja12345' })
    await visit(page, '/reset-password#token=token-valido')
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva12345')
    await page.getByLabel('Repetir nueva contraseña').fill('Nueva12345')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(page.getByText('Tu contraseña se actualizó correctamente.')).toBeVisible()
    // El mock de /confirm no sabe de qué usuario es el token: simulamos el efecto en el servidor.
    user.password = 'Nueva12345'

    await page.getByRole('link', { name: 'Iniciar sesión' }).click()
    await page.getByLabel('Email').fill('ana@example.com')
    await page.getByLabel('Contraseña', { exact: true }).fill('Nueva12345')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})
