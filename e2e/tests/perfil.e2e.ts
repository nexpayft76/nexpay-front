import { expect, test, visit } from '../support/fixtures'

// Configuración → Usuario (ProfilePage, ProfileDetails, ProfileEditForm, ChangePasswordSection, CloseAccountSection).

test.describe('Perfil: datos de la cuenta', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn({ full_name: 'Ana Pérez', email: 'ana@example.com', created_at: '2026-03-05T10:00:00.000Z' })
    await visit(page, '/dashboard/configuracion/usuario')
  })

  test('muestra nombre, email, estado y fecha de alta en solo lectura', async ({ page }) => {
    await expect(page).toHaveTitle(/Usuario/)
    await expect(page.getByRole('heading', { name: 'Tu usuario' })).toBeVisible()
    const tarjeta = page.getByRole('region', { name: 'Ana Pérez' })
    await expect(tarjeta.locator('.profile-card__avatar')).toHaveText('AP')
    await expect(tarjeta.locator('.profile-status')).toHaveText('Activa')
    await expect(tarjeta.getByText('5 de marzo de 2026')).toBeVisible()
    await expect(tarjeta.getByText('ana@example.com').first()).toBeVisible()
  })

  test('"Ir a Preferencias" lleva a la pantalla de preferencias', async ({ page }) => {
    await page.getByRole('link', { name: 'Ir a Preferencias' }).click()
    await expect(page).toHaveURL(/\/configuracion\/preferencias$/)
  })

  test('el botón "Cerrar sesión" de la pantalla termina la sesión', async ({ page, api }) => {
    await page.locator('.profile-page__actions').getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/login$/)
    expect(api.sessionUserId).toBeNull()
  })
})

test.describe('Perfil: editar datos', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn({ full_name: 'Ana Pérez', email: 'ana@example.com' })
    await visit(page, '/dashboard/configuracion/usuario')
    await page.getByRole('button', { name: 'Editar datos' }).click()
  })

  test('abre el formulario con los datos actuales y "Guardar" deshabilitado hasta que algo cambie', async ({ page }) => {
    await expect(page.getByLabel('Nombre completo')).toHaveValue('Ana Pérez')
    await expect(page.getByLabel('Email')).toHaveValue('ana@example.com')
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  test('cancelar vuelve a la vista de solo lectura sin guardar', async ({ page, api }) => {
    await page.getByLabel('Nombre completo').fill('Otro Nombre')
    await page.getByRole('button', { name: 'Cancelar' }).click()

    await expect(page.getByRole('heading', { name: 'Ana Pérez', level: 2 })).toBeVisible()
    expect(api.callsTo('PATCH', /users\/me$/)).toHaveLength(0)
  })

  test('cambiar solo el nombre envía únicamente ese campo y actualiza toda la app', async ({ page, api }) => {
    await page.getByLabel('Nombre completo').fill('  Ana María Pérez ')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page.getByRole('status').filter({ hasText: '✓ Datos actualizados.' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ana María Pérez', level: 2 })).toBeVisible()
    expect(api.callsTo('PATCH', /users\/me$/)[0].body).toEqual({ full_name: 'Ana María Pérez' })
    await visit(page, '/dashboard')
    await expect(page.getByRole('heading', { name: 'Hola, Ana María Pérez' })).toBeVisible()
  })

  test('cambiar el email lo verifica en vivo y lo guarda', async ({ page, api }) => {
    await page.getByLabel('Email').fill('ana.nueva@example.com')
    await expect(page.getByText('✓ Email disponible')).toBeVisible()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page.getByText('✓ Datos actualizados.')).toBeVisible()
    expect(api.callsTo('PATCH', /users\/me$/)[0].body).toEqual({ email: 'ana.nueva@example.com' })
  })

  test('un email que ya tiene otra cuenta se rechaza y bloquea el guardado', async ({ page, api }) => {
    api.addUser({ email: 'ocupado@example.com' })
    await page.getByLabel('Email').fill('ocupado@example.com')

    await expect(page.getByText('Ya existe una cuenta con este email.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  test('el mismo email con otras mayúsculas no cuenta como cambio ni se consulta como ocupado', async ({ page }) => {
    await page.getByLabel('Email').fill('ANA@example.com')
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    await expect(page.getByText('Ya existe una cuenta con este email.')).toHaveCount(0)
  })

  test('valida el nombre (vacío, muy corto, demasiado largo) y el formato del email', async ({ page }) => {
    await page.getByLabel('Nombre completo').fill('')
    await expect(page.getByText('El nombre es obligatorio.')).toBeVisible()
    await page.getByLabel('Nombre completo').fill('A')
    await expect(page.getByText('Ingresa al menos 2 caracteres.')).toBeVisible()
    await page.getByLabel('Nombre completo').fill('A'.repeat(121))
    await expect(page.getByText('Máximo 120 caracteres.')).toBeVisible()

    await page.getByLabel('Email').fill('roto@')
    await page.getByLabel('Email').blur()
    await expect(page.getByText('Ingresa un email válido.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  test('si el servidor rechaza el guardado muestra su mensaje y deja seguir editando', async ({ page, api }) => {
    await page.getByLabel('Nombre completo').fill('Ana María')
    api.failNext('PATCH', /users\/me$/, 409, 'Ya existe una cuenta con este email.')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'Ya existe una cuenta con este email.' })).toBeVisible()
    await expect(page.getByLabel('Nombre completo')).toHaveValue('Ana María')
  })
})

test.describe('Perfil: cambiar la contraseña', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn({ email: 'ana@example.com', password: 'Actual1234' })
    await visit(page, '/dashboard/configuracion/usuario')
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
  })

  test('el formulario está cerrado por defecto y se abre con el botón', async ({ page }) => {
    await expect(page.getByLabel('Contraseña actual')).toBeFocused()
    await expect(page.getByLabel('Nueva contraseña', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Repetir nueva contraseña')).toBeVisible()
  })

  test('"Guardar contraseña" solo se habilita con datos válidos', async ({ page }) => {
    const guardar = page.getByRole('button', { name: 'Guardar contraseña' })
    await expect(guardar).toBeDisabled()

    await page.getByLabel('Contraseña actual').fill('Actual1234')
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Actual1234')
    await expect(guardar).toBeDisabled()

    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva12345')
    await page.getByLabel('Repetir nueva contraseña').fill('Otra123456')
    await expect(guardar).toBeDisabled()

    await page.getByLabel('Repetir nueva contraseña').fill('Nueva12345')
    await expect(guardar).toBeEnabled()
  })

  test('tilda las reglas de la nueva contraseña mientras se escribe', async ({ page }) => {
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('abc')
    const reglas = page.locator('#profile-new-password-rules')
    await expect(reglas.getByText('Entre 8 y 72 caracteres')).toContainText('(falta)')
    await expect(reglas.getByText('Al menos una letra')).toContainText('(cumple)')
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('abcdefg1')
    await expect(reglas.getByText('Al menos un número')).toContainText('(cumple)')
  })

  test('cambia la contraseña, cierra el formulario, avisa y mantiene la sesión', async ({ page, api }) => {
    await page.getByLabel('Contraseña actual').fill('Actual1234')
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva12345')
    await page.getByLabel('Repetir nueva contraseña').fill('Nueva12345')
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()

    await expect(page.getByRole('status').filter({ hasText: '✓ Contraseña actualizada.' })).toBeVisible()
    await expect(page.getByLabel('Contraseña actual')).toHaveCount(0)
    expect(api.callsTo('PATCH', /users\/me\/password/)[0].body).toEqual({ current_password: 'Actual1234', new_password: 'Nueva12345' })
    expect(api.currentUser.password).toBe('Nueva12345')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Tu usuario' })).toBeVisible()
  })

  test('con la contraseña actual incorrecta muestra el error y NO cierra la sesión', async ({ page }) => {
    await page.getByLabel('Contraseña actual').fill('Equivocada1')
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva12345')
    await page.getByLabel('Repetir nueva contraseña').fill('Nueva12345')
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'La contraseña actual es incorrecta.' })).toBeVisible()
    await expect(page).toHaveURL(/\/configuracion\/usuario$/)
    await expect(page.getByLabel('Contraseña actual')).toHaveValue('Equivocada1')
  })

  test('cancelar cierra el formulario y borra lo escrito', async ({ page }) => {
    await page.getByLabel('Contraseña actual').fill('Actual1234')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(page.getByLabel('Contraseña actual')).toHaveValue('')
  })
})

test.describe('Perfil: cerrar la cuenta', () => {
  test('sin saldo: pide la contraseña, cierra la cuenta y manda al login', async ({ page, api }) => {
    api.signIn({ email: 'ana@example.com', password: 'Clave1234' })
    await visit(page, '/dashboard/configuracion/usuario')
    await page.getByRole('button', { name: 'Cerrar mi cuenta' }).click()

    const dialogo = page.getByRole('dialog', { name: '¿Cerrar tu cuenta?' })
    await expect(dialogo).toBeVisible()
    await dialogo.locator('input[type=password]').fill('Clave1234')
    await dialogo.getByRole('button', { name: 'Cerrar mi cuenta' }).click()

    await expect(page).toHaveURL(/\/login$/)
    expect(api.callsTo('DELETE', /users\/me$/)[0].body).toEqual({ password: 'Clave1234' })
    // La cuenta cerrada ya no puede iniciar sesión.
    await page.getByLabel('Email').fill('ana@example.com')
    await page.getByLabel('Contraseña', { exact: true }).fill('Clave1234')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('sin escribir la contraseña no cierra y lo avisa', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard/configuracion/usuario')
    await page.getByRole('button', { name: 'Cerrar mi cuenta' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar mi cuenta' }).click()

    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Ingresa tu contraseña para confirmar.')
    expect(api.callsTo('DELETE', /users\/me$/)).toHaveLength(0)
  })

  test('con la contraseña incorrecta muestra el error y la cuenta sigue abierta', async ({ page, api }) => {
    api.signIn({ password: 'Clave1234' })
    await visit(page, '/dashboard/configuracion/usuario')
    await page.getByRole('button', { name: 'Cerrar mi cuenta' }).click()
    await page.getByRole('dialog').locator('input[type=password]').fill('Mala12345')
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar mi cuenta' }).click()

    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('La contraseña es incorrecta.')
    expect(api.currentUser.status).toBe('active')
    expect(api.sessionUserId).not.toBeNull()
  })

  test('con saldo pendiente explica el motivo, lista los fondos y enlaza al intercambio', async ({ page, api }) => {
    api.signIn({ password: 'Clave1234' }, { USD: 25.5, COP: 1_000_000 })
    await visit(page, '/dashboard/configuracion/usuario')
    await page.getByRole('button', { name: 'Cerrar mi cuenta' }).click()
    await page.getByRole('dialog').locator('input[type=password]').fill('Clave1234')
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar mi cuenta' }).click()

    const aviso = page.locator('.profile-danger__blocked')
    await expect(aviso).toContainText('No puedes cerrar la cuenta mientras tengas saldo.')
    await expect(aviso.getByRole('list', { name: 'Saldos pendientes' })).toContainText('25,50 USD')
    await expect(aviso.getByRole('list', { name: 'Saldos pendientes' })).toContainText('1.000.000,00 COP')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(api.currentUser.status).toBe('active')

    await aviso.getByRole('link', { name: /Intercambio de balance/ }).click()
    await expect(page).toHaveURL(/\/operaciones\/intercambio$/)
  })

  test('cancelar el diálogo no cierra nada', async ({ page, api }) => {
    api.signIn()
    await visit(page, '/dashboard/configuracion/usuario')
    await page.getByRole('button', { name: 'Cerrar mi cuenta' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(api.callsTo('DELETE', /users\/me$/)).toHaveLength(0)
  })
})
