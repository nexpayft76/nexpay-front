import { expect, test, visit } from '../support/fixtures'

// Panel del superusuario: Comisiones (FeeSettingsForm), Usuarios, Transacciones y P2P del sistema.

test.describe('Superusuario: comisiones', () => {
  test.beforeEach(async ({ page, api }) => {
    api.signIn({ role: 'superuser', email: 'admin@nexpay.com' })
    await visit(page, '/dashboard/superusuario/comisiones')
  })

  test('muestra el resumen cobrado por moneda, el saldo propietario y el detalle', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Comisiones', level: 1 })).toBeVisible()
    const resumen = page.locator('.stat-card').first()
    await expect(resumen).toContainText('US$ 15,75')
    await expect(resumen).toContainText('Intercambio de balance US$ 12,50 · P2P US$ 3,25')
    await expect(resumen).toContainText('8 comisiones')
    await expect(page.getByRole('heading', { name: 'Saldo de la billetera propietaria' })).toBeVisible()

    const filas = page.locator('.data-table tbody tr')
    await expect(filas).toHaveCount(2)
    await expect(filas.first()).toContainText('Intercambio de balance')
    await expect(filas.first()).toContainText('cliente@example.com')
    await expect(filas.nth(1)).toContainText('P2P')
  })

  test('el formulario trae las comisiones vigentes y "Guardar" está deshabilitado sin cambios', async ({ page }) => {
    await expect(page.getByLabel('Intercambio de balance (%)')).toHaveValue('0,5')
    await expect(page.getByLabel('P2P, cada parte (%)')).toHaveValue('0,5')
    await expect(page.getByRole('button', { name: 'Guardar comisiones' })).toBeDisabled()
  })

  test('valida el rango (máximo 10 %), el formato y los 4 decimales', async ({ page }) => {
    const campo = page.getByLabel('Intercambio de balance (%)')
    await campo.fill('11')
    await expect(page.getByText('Como máximo 10%')).toBeVisible()
    await campo.fill('abc')
    await expect(page.getByText('Escribe un número, ej. 0,05')).toBeVisible()
    await campo.fill('0,12345')
    await expect(page.getByText('Como máximo 4 decimales')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar comisiones' })).toBeDisabled()
  })

  test('cambiar una comisión pide confirmación mostrando el antes y el después, y la guarda', async ({ page, api }) => {
    await page.getByLabel('Intercambio de balance (%)').fill('0,25')
    await page.getByRole('button', { name: 'Guardar comisiones' }).click()

    const dialogo = page.getByRole('dialog', { name: '¿Cambias las comisiones?' })
    await expect(dialogo).toContainText('Intercambio de balance: 0,5% → 0,25%')
    await expect(dialogo).toContainText('P2P (cada parte): 0,5% → 0,5%')
    await dialogo.getByRole('button', { name: 'Sí, guardar' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Comisiones actualizadas. Rigen desde la próxima operación.' })).toBeVisible()
    await expect(page.getByText('Último cambio:')).toContainText('admin@nexpay.com')
    expect(api.callsTo('PATCH', /settings\/fees/)[0].body).toEqual({ exchange_fee_percent: 0.25, p2p_fee_percent: 0.5 })
    expect(api.fees.exchange_fee_percent).toBe(0.25)
  })

  test('la comisión nueva rige en el siguiente intercambio de cualquier usuario', async ({ page, api }) => {
    await page.getByLabel('Intercambio de balance (%)').fill('1')
    await page.getByRole('button', { name: 'Guardar comisiones' }).click()
    await page.getByRole('button', { name: 'Sí, guardar' }).click()
    await expect(page.getByText('Comisiones actualizadas')).toBeVisible()

    api.setBalance('COP', 400_000)
    await visit(page, '/dashboard/operaciones/intercambio')
    await page.getByLabel('Monto a pagar').fill('400000')
    await expect(page.locator('.op-summary dl')).toContainText('COP 4.000 (1%)')
  })

  test('cancelar la confirmación no cambia nada', async ({ page, api }) => {
    await page.getByLabel('P2P, cada parte (%)').fill('2')
    await page.getByRole('button', { name: 'Guardar comisiones' }).click()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    expect(api.callsTo('PATCH', /settings\/fees/)).toHaveLength(0)
  })

  test('si el servidor rechaza el cambio muestra su mensaje', async ({ page, api }) => {
    await page.getByLabel('Intercambio de balance (%)').fill('2')
    api.failNext('PATCH', /settings\/fees/, 400, 'La comisión debe estar entre 0 y 10.')
    await page.getByRole('button', { name: 'Guardar comisiones' }).click()
    await page.getByRole('button', { name: 'Sí, guardar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'La comisión debe estar entre 0 y 10.' })).toBeVisible()
  })
})

test.describe('Superusuario: usuarios', () => {
  test.beforeEach(async ({ api }) => {
    api.signIn({ role: 'superuser', email: 'admin@nexpay.com', full_name: 'Admin Nex' })
    api.addUser({ email: 'ana@example.com', full_name: 'Ana Pérez' })
    api.addUser({ email: 'beto@example.com', full_name: 'Beto Ruiz' })
    api.addUser({ email: 'dueno@nexpay.com', full_name: 'Propietario', role: 'superuser', is_owner: true })
  })

  test('lista todos los usuarios; la propia cuenta y la propietaria no se pueden modificar', async ({ page }) => {
    await visit(page, '/dashboard/superusuario/usuarios')
    await expect(page.getByRole('heading', { name: 'Usuarios', level: 1 })).toBeVisible()

    const filas = page.locator('.data-table tbody tr')
    await expect(filas).toHaveCount(4)
    const propietario = filas.filter({ hasText: 'dueno@nexpay.com' })
    await expect(propietario).toContainText('Propietario')
    await expect(propietario.getByRole('button')).toHaveCount(0)
    const yo = filas.filter({ hasText: 'admin@nexpay.com' })
    await expect(yo.getByRole('combobox')).toHaveCount(0)
    await expect(yo.getByRole('button')).toHaveCount(0)
  })

  test('buscar por correo filtra la lista', async ({ page, api }) => {
    await visit(page, '/dashboard/superusuario/usuarios')
    await page.getByLabel('Buscar por correo').fill('beto')

    await expect(page.locator('.data-table tbody tr')).toHaveCount(1)
    await expect(page.locator('.data-table tbody tr')).toContainText('beto@example.com')
    expect(api.callsTo('GET', /superuser\/users$/).some((r) => r.query.email === 'beto')).toBe(true)

    await page.getByLabel('Buscar por correo').fill('nadie')
    await expect(page.getByText('No hay usuarios con ese correo.')).toBeVisible()
  })

  test('asignar el rol de superusuario pide confirmación y lo guarda', async ({ page, api }) => {
    await visit(page, '/dashboard/superusuario/usuarios')
    await page.getByLabel('Rol de ana@example.com').selectOption('superuser')

    const dialogo = page.getByRole('dialog', { name: '¿Cambias el rol?' })
    await expect(dialogo).toContainText('ana@example.com pasa a ser superusuario.')
    await expect(dialogo).toContainText('Podrá ver a todos los usuarios')
    await dialogo.getByRole('button', { name: 'Sí, confirmar' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'ana@example.com ahora es superusuario.' })).toBeVisible()
    expect([...api.users.values()].find((u) => u.email === 'ana@example.com')?.role).toBe('superuser')
  })

  test('cancelar el cambio de rol deja todo igual', async ({ page, api }) => {
    await visit(page, '/dashboard/superusuario/usuarios')
    await page.getByLabel('Rol de ana@example.com').selectOption('superuser')
    await page.getByRole('button', { name: 'Cancelar' }).click()

    expect(api.callsTo('PATCH', /users\/.*\/role/)).toHaveLength(0)
    await expect(page.getByLabel('Rol de ana@example.com')).toHaveValue('user')
  })

  test('suspender una cuenta pide confirmación; después se puede reactivar', async ({ page, api }) => {
    await visit(page, '/dashboard/superusuario/usuarios')
    const fila = page.locator('.data-table tbody tr').filter({ hasText: 'beto@example.com' })

    await fila.getByRole('button', { name: 'Suspender' }).click()
    await expect(page.getByRole('dialog', { name: '¿Suspendes la cuenta?' })).toContainText('no podrá iniciar sesión')
    await page.getByRole('button', { name: 'Sí, confirmar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'La cuenta de beto@example.com quedó suspendida.' })).toBeVisible()
    await expect(fila).toContainText('Suspendida')
    expect([...api.users.values()].find((u) => u.email === 'beto@example.com')?.status).toBe('suspended')

    await fila.getByRole('button', { name: 'Reactivar' }).click()
    await expect(page.getByRole('dialog', { name: '¿Reactivas la cuenta?' })).toBeVisible()
    await page.getByRole('button', { name: 'Sí, confirmar' }).click()
    await expect(fila).toContainText('Activa')
  })

  test('una cuenta suspendida no puede iniciar sesión', async ({ page, api }) => {
    const beto = [...api.users.values()].find((u) => u.email === 'beto@example.com')!
    beto.status = 'suspended'
    api.sessionUserId = null
    await visit(page, '/login')
    await page.getByLabel('Email').fill('beto@example.com')
    await page.getByLabel('Contraseña', { exact: true }).fill(beto.password)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Tu cuenta está suspendida.' })).toBeVisible()
  })

  test('si el servidor rechaza el cambio muestra el error', async ({ page, api }) => {
    await visit(page, '/dashboard/superusuario/usuarios')
    api.failNext('PATCH', /users\/.*\/role/, 409, 'No se pudo guardar el cambio.')
    await page.getByLabel('Rol de ana@example.com').selectOption('superuser')
    await page.getByRole('button', { name: 'Sí, confirmar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'No se pudo guardar el cambio.' })).toBeVisible()
  })
})

test.describe('Superusuario: transacciones y P2P del sistema', () => {
  test.beforeEach(({ api }) => {
    api.signIn({ role: 'superuser' })
  })

  test('Transacciones lista las de todos los usuarios con sus montos y comisión', async ({ page }) => {
    await visit(page, '/dashboard/superusuario/transacciones')
    await expect(page.getByRole('heading', { name: 'Transacciones', level: 1 })).toBeVisible()

    const filas = page.locator('.data-table tbody tr')
    await expect(filas).toHaveCount(2)
    await expect(filas.filter({ hasText: 'Recarga' })).toContainText('cliente@example.com')
    await expect(filas.filter({ hasText: 'Recarga' })).toContainText('US$ 100,00')
    const intercambio = filas.filter({ hasText: 'Intercambio de balance' })
    await expect(intercambio).toContainText('otro@example.com')
    await expect(intercambio).toContainText('US$ 50,00')
    await expect(intercambio).toContainText('COP 199.000')
    await expect(intercambio).toContainText('US$ 0,25')
  })

  test('filtra por tipo y por correo del usuario', async ({ page, api }) => {
    await visit(page, '/dashboard/superusuario/transacciones')

    await page.getByLabel('Tipo').selectOption('DEPOSIT')
    await expect(page.locator('.data-table tbody tr')).toHaveCount(1)
    expect(api.callsTo('GET', /superuser\/transactions/).some((r) => r.query.type === 'DEPOSIT')).toBe(true)

    await page.getByLabel('Tipo').selectOption('')
    await page.getByLabel('Correo del usuario').fill('otro@')
    await expect(page.locator('.data-table tbody tr')).toHaveCount(1)
    await expect(page.locator('.data-table tbody tr')).toContainText('otro@example.com')

    await page.getByLabel('Correo del usuario').fill('nadie@')
    await expect(page.getByText('No hay transacciones con estos filtros.')).toBeVisible()
  })

  test('P2P del sistema muestra las ofertas con vendedor, comprador y estado', async ({ page }) => {
    await visit(page, '/dashboard/superusuario/p2p')
    await expect(page.getByRole('heading', { name: 'P2P del sistema', level: 1 })).toBeVisible()

    const fila = page.locator('.data-table tbody tr')
    await expect(fila).toHaveCount(1)
    await expect(fila).toContainText('Abierta')
    await expect(fila).toContainText('vendedor@example.com')
    await expect(fila).toContainText('US$ 100,00')
    await expect(fila).toContainText('COP 400.000')
  })

  test('el filtro de estado pide al servidor solo ese estado', async ({ page, api }) => {
    await visit(page, '/dashboard/superusuario/p2p')
    await page.getByRole('radio', { name: 'Aceptadas' }).click()

    await expect(page.getByText('No hay ofertas con este estado.')).toBeVisible()
    expect(api.callsTo('GET', /superuser\/p2p\/offers/).some((r) => r.query.status === 'completed')).toBe(true)
  })
})

test.describe('Superusuario: el back también lo exige', () => {
  test('si el servidor responde 403 la pantalla muestra el error', async ({ page, api }) => {
    api.signIn({ role: 'superuser' })
    api.failNext('GET', /superuser\/fees\/summary/, 403, 'Solo el superusuario puede hacer esto.', 5)
    await visit(page, '/dashboard/superusuario/comisiones')
    await expect(page.getByRole('alert').filter({ hasText: 'Solo el superusuario puede hacer esto.' })).toBeVisible()
  })
})
