import type { BrowserContext, Route } from '@playwright/test'

// Backend simulado para los tests end to end.
//
// Intercepta todo lo que el front pide a /api y responde con datos en memoria que SÍ cambian:
// una recarga suma al saldo, un intercambio mueve dinero entre monedas, cerrar sesión borra la sesión, etc.
// Así los tests recorren flujos completos sin depender de nexpay-back, de la base de datos ni de internet.
// Cada test tiene su propia instancia: no comparten nada.

export type Role = 'user' | 'superuser'

export interface MockUser {
  id: string
  full_name: string
  email: string
  password: string
  status: 'active' | 'suspended' | 'closed'
  role: Role
  is_owner: boolean
  created_at: string
}

export interface RecordedRequest {
  method: string
  path: string
  query: Record<string, string>
  body: unknown
}

interface Reply {
  status?: number
  body?: unknown
}

interface Failure {
  method: string
  pattern: RegExp
  status: number
  message: string
  times: number
}

type Obj = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export const CURRENCY_NAMES: Record<string, string> = {
  COP: 'Peso colombiano',
  ARS: 'Peso argentino',
  USD: 'Dólar estadounidense',
  EUR: 'Euro',
}

export const DEPOSIT_LIMITS: Record<string, number> = { COP: 50_000_000, ARS: 20_000_000, USD: 10_000, EUR: 10_000 }

/** Unidades de cada moneda por 1 USD. */
const PER_USD: Record<string, number> = { USD: 1, EUR: 0.9, COP: 4000 }
/** Dólar en Argentina: compra (lo que recibes al vender dólares) y venta (lo que pagas al comprarlos). */
const ARS_DOLLAR: Record<string, { compra: number; venta: number }> = {
  oficial: { compra: 1000, venta: 1020 },
  mep: { compra: 1100, venta: 1120 },
  blue: { compra: 1200, venta: 1230 },
}
const ARS_LABEL: Record<string, string> = { oficial: 'Oficial', mep: 'MEP', blue: 'Blue' }

/** Comisión del intercambio de balance y del P2P (en %). */
export const EXCHANGE_FEE_PERCENT = 0.5
export const P2P_FEE_PERCENT = 0.5

const round2 = (value: number) => Math.round(value * 100) / 100
const money = (value: number) => round2(value).toFixed(2)

export function rateBetween(from: string, to: string, arsType = 'mep'): number {
  const dollar = ARS_DOLLAR[arsType] ?? ARS_DOLLAR.mep
  const units = (code: string, side: 'from' | 'to') => (code === 'ARS' ? (side === 'to' ? dollar.compra : dollar.venta) : PER_USD[code])
  return units(to, 'to') / units(from, 'from')
}

function arsInfo(from: string, to: string, arsType: string) {
  if (from !== 'ARS' && to !== 'ARS') return null
  const dollar = ARS_DOLLAR[arsType] ?? ARS_DOLLAR.mep
  return {
    type: arsType,
    label: ARS_LABEL[arsType] ?? 'MEP',
    price_used: to === 'ARS' ? 'compra' : 'venta',
    compra: dollar.compra,
    venta: dollar.venta,
    published_at: new Date().toISOString(),
  }
}

let counter = 0
const nextId = (prefix: string) => `${prefix}-${++counter}`

export function makeUser(overrides: Partial<MockUser> = {}): MockUser {
  const n = ++counter
  return {
    id: `user-${n}`,
    full_name: 'Ana Pérez',
    email: `ana${n}@example.com`,
    password: 'Clave1234',
    status: 'active',
    role: 'user',
    is_owner: false,
    created_at: '2026-03-05T10:00:00.000Z',
    ...overrides,
  }
}

const publicUser = (user: MockUser) => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  status: user.status,
  role: user.role,
  is_owner: user.is_owner,
  created_at: user.created_at,
})

export class MockApi {
  users = new Map<string, MockUser>()
  /** Id del usuario con la sesión iniciada (equivale a la cookie HttpOnly del back). */
  sessionUserId: string | null = null
  /** Lo que el front le pidió al back, en orden. Sirve para comprobar qué se envió. */
  requests: RecordedRequest[] = []

  balances = new Map<string, Record<string, number>>()
  transactions: Obj[] = []
  alerts: Obj[] = []
  notifications: Obj[] = []
  p2pOffers: Obj[] = []
  p2pTrades: Obj[] = []
  preferences = { theme: 'dark', in_app_notifications: true, email_notifications: false }
  fees = { exchange_fee_percent: EXCHANGE_FEE_PERCENT, p2p_fee_percent: P2P_FEE_PERCENT }
  /** El token que acepta el restablecimiento de contraseña. */
  validResetToken = 'token-valido'
  /** Para simular que el back no tiene el módulo de alertas (el front usa su respaldo local). */
  alertsBackendAvailable = true

  private failures: Failure[] = []

  // ---- Preparación de datos ----------------------------------------------------------------------

  addUser(overrides: Partial<MockUser> = {}, balances: Record<string, number> = {}): MockUser {
    const user = makeUser(overrides)
    this.users.set(user.id, user)
    this.balances.set(user.id, { COP: 0, ARS: 0, USD: 0, EUR: 0, ...balances })
    return user
  }

  /** Crea el usuario y deja su sesión iniciada: el test arranca "ya logueado". */
  signIn(overrides: Partial<MockUser> = {}, balances: Record<string, number> = {}): MockUser {
    const user = this.addUser(overrides, balances)
    this.sessionUserId = user.id
    return user
  }

  get currentUser(): MockUser {
    const user = this.sessionUserId ? this.users.get(this.sessionUserId) : undefined
    if (!user) throw new Error('No hay sesión iniciada en el mock')
    return user
  }

  balanceOf(currency: string, user: MockUser = this.currentUser): number {
    return this.balances.get(user.id)?.[currency] ?? 0
  }

  setBalance(currency: string, amount: number, user: MockUser = this.currentUser) {
    const wallet = this.balances.get(user.id) ?? { COP: 0, ARS: 0, USD: 0, EUR: 0 }
    wallet[currency] = amount
    this.balances.set(user.id, wallet)
  }

  /** Una oferta abierta de OTRO usuario, lista para aceptar en el mercado. */
  addMarketOffer(overrides: Obj = {}): Obj {
    const sellAmount = overrides.sell_amount ?? 100
    const sell = overrides.sell_currency ?? 'USD'
    const buy = overrides.buy_currency ?? 'COP'
    const rate = overrides.rate ?? rateBetween(sell, buy)
    const offer = this.buildOffer({ sell, buy, sellAmount, rate })
    Object.assign(offer, { seller_name: 'Marcos G.', completed_trades: 3, seller_id: 'other-seller', ...overrides })
    this.p2pOffers.push(offer)
    return offer
  }

  addTransaction(tx: Obj) {
    this.transactions.unshift({
      id: nextId('tx'),
      from_currency: null,
      from_amount: '0.00',
      exchange_rate: 1,
      fee_amount: '0.00',
      fee_currency: null,
      fee_percent: 0,
      ars_rate_type: null,
      created_at: new Date().toISOString(),
      ...tx,
    })
  }

  /** La próxima(s) `times` petición(es) que coincidan responden con este error. */
  failNext(method: string, pattern: RegExp, status: number, message: string, times = 1) {
    this.failures.push({ method: method.toUpperCase(), pattern, status, message, times })
  }

  /** Deja de fallar: las próximas peticiones vuelven a responder bien (para probar "Reintentar"). */
  clearFailures() {
    this.failures = []
  }

  callsTo(method: string, pattern: RegExp): RecordedRequest[] {
    return this.requests.filter((request) => request.method === method.toUpperCase() && pattern.test(request.path))
  }

  // ---- Conexión con Playwright ---------------------------------------------------------------------

  async install(context: BrowserContext) {
    await context.route((url) => url.pathname.startsWith('/api/') || url.pathname === '/health', (route) => this.handle(route))
  }

  private async handle(route: Route) {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method().toUpperCase()
    const path = url.pathname
    const query = Object.fromEntries(url.searchParams.entries())
    let body: unknown = undefined
    try {
      body = request.postDataJSON() ?? undefined
    } catch {
      body = undefined
    }
    this.requests.push({ method, path, query, body })

    const failure = this.failures.find((f) => f.method === method && f.pattern.test(path) && f.times > 0)
    let reply: Reply
    if (failure) {
      failure.times -= 1
      reply = { status: failure.status, body: { message: failure.message } }
    } else {
      try {
        reply = this.respond(method, path, query, (body ?? {}) as Obj)
      } catch (error) {
        reply = { status: 500, body: { message: `Mock sin ruta: ${method} ${path} (${String(error)})` } }
      }
    }
    await route.fulfill({
      status: reply.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(reply.body ?? {}),
    })
  }

  // ---- Rutas ---------------------------------------------------------------------------------------

  private respond(method: string, path: string, query: Record<string, string>, body: Obj): Reply {
    const ok = (data: unknown, status = 200): Reply => ({ status, body: { data } })
    const fail = (status: number, message: string): Reply => ({ status, body: { message } })
    const is = (m: string, pattern: string | RegExp) =>
      method === m && (typeof pattern === 'string' ? path === pattern : pattern.test(path))

    if (path === '/health') return { body: { status: 'ok' } }

    // Rutas públicas (sin sesión).
    if (is('GET', '/api/auth/session')) {
      return ok(this.sessionUserId ? { user: publicUser(this.currentUser), expires_at: new Date(Date.now() + 3_600_000).toISOString() } : null)
    }
    if (is('POST', '/api/auth/login')) return this.login(body, ok, fail)
    if (is('POST', '/api/auth/register')) return this.register(body, ok, fail)
    if (is('POST', '/api/auth/logout')) {
      this.sessionUserId = null
      return ok(null)
    }
    if (is('GET', '/api/auth/email-available')) {
      const email = (query.email ?? '').trim().toLowerCase()
      return ok({ available: ![...this.users.values()].some((u) => u.email.toLowerCase() === email) })
    }
    if (is('POST', '/api/auth/password-reset/request')) return ok(null)
    if (is('POST', '/api/auth/password-reset/confirm')) {
      return body.token === this.validResetToken ? ok(null) : fail(400, 'El enlace venció o ya fue usado.')
    }
    if (is('GET', '/api/rates/convert')) return this.convert(query, ok)
    if (is('GET', '/api/rates/history')) return this.history(query, ok)
    if (is('GET', '/api/rates')) return this.ratesTable(query, ok)
    if (is('POST', '/api/assistant/public/chat')) {
      return ok({ reply: `Hola, soy Nexa. Sobre "${body.message}": NexPay es una billetera multimoneda.`, model: 'm1', model_label: 'Modelo 1' })
    }
    if (is('GET', '/api/assistant/models')) {
      return ok([
        { id: 'm1', label: 'Modelo 1', rank: 1, tier: 'Avanzado', available: true, resets_at: null },
        { id: 'm2', label: 'Modelo 2', rank: 2, tier: 'Básico', available: false, resets_at: new Date(Date.now() + 1_800_000).toISOString() },
      ])
    }

    // Desde acá todo exige sesión: sin ella el back responde 401, igual que con la cookie vencida.
    if (!this.sessionUserId) return fail(401, 'Tu sesión no es válida.')
    const me = this.currentUser

    if (is('GET', '/api/auth/me')) return ok(publicUser(me))
    if (is('POST', '/api/assistant/chat')) {
      return ok({ reply: `Tu saldo en USD es ${money(this.balanceOf('USD'))}.`, model: 'm1', model_label: 'Modelo 1' })
    }

    // Usuario
    if (is('PATCH', '/api/users/me')) return this.updateProfile(body, ok, fail)
    if (is('DELETE', '/api/users/me')) return this.closeAccount(body, ok, fail)
    if (is('PATCH', '/api/users/me/password')) {
      if (body.current_password !== me.password) return fail(403, 'La contraseña actual es incorrecta.')
      me.password = String(body.new_password)
      return ok(null)
    }
    if (is('GET', '/api/users/me/theme')) return ok({ theme: this.preferences.theme })
    if (is('PATCH', '/api/users/me/theme')) {
      this.preferences.theme = String(body.theme)
      return ok({ theme: this.preferences.theme })
    }
    if (is('GET', '/api/users/me/preferences')) return ok(this.preferences)
    if (is('PATCH', '/api/users/me/preferences')) {
      for (const key of ['theme', 'in_app_notifications', 'email_notifications'] as const) {
        if (body[key] !== undefined) (this.preferences as Obj)[key] = body[key]
      }
      return ok(this.preferences)
    }

    // Billetera y operaciones
    if (is('GET', '/api/wallets/me')) return ok(this.wallet(query.valued_in ?? 'USD'))
    if (is('POST', '/api/wallets/me/deposits')) return this.deposit(body, ok, fail)
    if (is('GET', '/api/transactions/me/exchange/quote')) return this.exchangeQuote(query, ok, fail)
    if (is('POST', '/api/transactions/me/exchange')) return this.exchange(body, ok, fail)
    if (is('GET', '/api/transactions/me')) return this.paged(this.transactions, query, (tx) => this.matchesFilter(tx, query.type), ok)

    // Alertas y notificaciones
    if (path.startsWith('/api/alerts') && !this.alertsBackendAvailable) return fail(404, 'No existe.')
    if (is('GET', '/api/alerts')) return ok(this.alerts)
    if (is('POST', '/api/alerts')) {
      const now = new Date().toISOString()
      const alert = { id: nextId('alert'), enabled: true, created_at: now, updated_at: now, ...body }
      this.alerts.push(alert)
      return ok(alert, 201)
    }
    const alertId = path.match(/^\/api\/alerts\/([^/]+)$/)?.[1]
    if (alertId && method === 'PATCH') {
      const alert = this.alerts.find((a) => a.id === alertId)
      if (!alert) return fail(404, 'La alerta no existe.')
      Object.assign(alert, body, { updated_at: new Date().toISOString() })
      return ok(alert)
    }
    if (alertId && method === 'DELETE') {
      this.alerts = this.alerts.filter((a) => a.id !== alertId)
      return ok(null)
    }
    if (is('GET', '/api/notifications')) return ok(this.notifications)
    if (is('POST', '/api/notifications')) {
      const notification = { id: nextId('notif'), read: false, created_at: new Date().toISOString(), ...body }
      this.notifications.unshift(notification)
      return ok(notification, 201)
    }
    const notificationId = path.match(/^\/api\/notifications\/([^/]+)$/)?.[1]
    if (notificationId && method === 'PATCH') {
      const notification = this.notifications.find((n) => n.id === notificationId)
      if (notification) Object.assign(notification, body)
      return ok(notification ?? null)
    }
    if (notificationId && method === 'DELETE') {
      this.notifications = this.notifications.filter((n) => n.id !== notificationId)
      return ok(null)
    }

    // P2P
    if (is('GET', '/api/p2p/quote')) return this.p2pQuote(query, ok, fail)
    if (is('GET', '/api/p2p/offers/me')) return ok(this.p2pOffers.filter((o) => o.seller_id === me.id))
    if (is('GET', '/api/p2p/offers')) {
      return ok(
        this.p2pOffers.filter(
          (o) =>
            o.status === 'open' &&
            o.seller_id !== me.id &&
            (!query.sell_currency || o.sell_currency === query.sell_currency) &&
            (!query.buy_currency || o.buy_currency === query.buy_currency),
        ),
      )
    }
    if (is('POST', '/api/p2p/offers')) return this.p2pCreate(body, ok, fail)
    const acceptId = path.match(/^\/api\/p2p\/offers\/([^/]+)\/accept$/)?.[1]
    if (acceptId && method === 'POST') return this.p2pAccept(acceptId, ok, fail)
    const cancelId = path.match(/^\/api\/p2p\/offers\/([^/]+)\/cancel$/)?.[1]
    if (cancelId && method === 'POST') return this.p2pCancel(cancelId, ok, fail)
    if (is('GET', '/api/p2p/trades/me')) return this.paged(this.p2pTrades, query, () => true, ok)

    // Superusuario
    if (path.startsWith('/api/superuser')) {
      if (me.role !== 'superuser') return fail(403, 'Solo el superusuario puede hacer esto.')
      return this.superuser(method, path, query, body, ok, fail)
    }

    return fail(404, `Mock sin ruta: ${method} ${path}`)
  }

  // ---- Autenticación ---------------------------------------------------------------------------------

  private login(body: Obj, ok: (d: unknown, s?: number) => Reply, fail: (s: number, m: string) => Reply): Reply {
    const user = [...this.users.values()].find((u) => u.email.toLowerCase() === String(body.email ?? '').trim().toLowerCase())
    if (!user || user.password !== body.password) return fail(401, 'Email o contraseña incorrectos.')
    if (user.status === 'suspended') return fail(403, 'Tu cuenta está suspendida.')
    if (user.status === 'closed') return fail(401, 'Email o contraseña incorrectos.')
    this.sessionUserId = user.id
    return ok({ token: 'token-de-prueba', token_type: 'Bearer', expires_in: 3600, user: publicUser(user) })
  }

  private register(body: Obj, ok: (d: unknown, s?: number) => Reply, fail: (s: number, m: string) => Reply): Reply {
    const email = String(body.email ?? '').trim().toLowerCase()
    if ([...this.users.values()].some((u) => u.email.toLowerCase() === email)) return fail(409, 'Ya existe una cuenta con este email.')
    const user = this.addUser({ full_name: String(body.full_name), email, password: String(body.password), created_at: new Date().toISOString() })
    this.sessionUserId = user.id
    return ok({ token: 'token-de-prueba', token_type: 'Bearer', expires_in: 3600, user: publicUser(user) }, 201)
  }

  private updateProfile(body: Obj, ok: (d: unknown, s?: number) => Reply, fail: (s: number, m: string) => Reply): Reply {
    const me = this.currentUser
    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase()
      if ([...this.users.values()].some((u) => u.id !== me.id && u.email.toLowerCase() === email)) {
        return fail(409, 'Ya existe una cuenta con este email.')
      }
      me.email = email
    }
    if (body.full_name !== undefined) me.full_name = String(body.full_name)
    return ok(publicUser(me))
  }

  private closeAccount(body: Obj, ok: (d: unknown, s?: number) => Reply, fail: (s: number, m: string) => Reply): Reply {
    const me = this.currentUser
    if (body.password !== me.password) return fail(403, 'La contraseña es incorrecta.')
    if (Object.values(this.balances.get(me.id) ?? {}).some((amount) => amount > 0)) {
      return fail(409, 'No puedes cerrar la cuenta mientras tengas saldo.')
    }
    me.status = 'closed'
    this.sessionUserId = null
    return ok(null)
  }

  // ---- Tasas -----------------------------------------------------------------------------------------

  private convert(query: Record<string, string>, ok: (d: unknown) => Reply): Reply {
    const { from, to } = query
    const amount = Number(query.amount)
    const arsType = query.ars_rate ?? 'mep'
    const rate = rateBetween(from, to, arsType)
    return ok({
      from,
      to,
      amount,
      rate,
      result: round2(amount * rate),
      ars_rate: arsInfo(from, to, arsType),
      date: '2026-10-06',
      source: 'live',
      warnings: [],
    })
  }

  private history(query: Record<string, string>, ok: (d: unknown) => Reply): Reply {
    const { from, to } = query
    const involvesArs = from === 'ARS' || to === 'ARS'
    const keys = involvesArs ? ['oficial', 'mep', 'blue'] : [`${from}-${to}`]
    const days = { '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365 }[query.range as '1w'] ?? 30
    const series = keys.map((key) => {
      const base = rateBetween(from, to, involvesArs ? key : 'mep')
      const points = Array.from({ length: Math.min(days, 30) }, (_, i) => ({
        date: new Date(Date.UTC(2026, 9, 6) - (Math.min(days, 30) - 1 - i) * 86_400_000).toISOString().slice(0, 10),
        value: Number((base * (1 + i * 0.001)).toPrecision(6)),
      }))
      const first = points[0].value
      const last = points[points.length - 1].value
      return {
        key,
        label: involvesArs ? `Dólar ${ARS_LABEL[key]}` : `${from} → ${to}`,
        points,
        stats: { first, last, change_pct: Number((((last - first) / first) * 100).toFixed(2)), min: first, max: last },
      }
    })
    return ok({
      from,
      to,
      range: query.range,
      start: series[0].points[0].date,
      end: series[0].points[series[0].points.length - 1].date,
      providers: involvesArs ? ['argentinadatos'] : ['frankfurter'],
      source: 'live',
      stale: false,
      fetched_at: new Date().toISOString(),
      series,
      warnings: [],
    })
  }

  private ratesTable(query: Record<string, string>, ok: (d: unknown) => Reply): Reply {
    const base = query.base ?? 'USD'
    const rates = Object.fromEntries(['USD', 'EUR', 'ARS', 'COP'].map((code) => [code, rateBetween(base, code)]))
    const now = new Date().toISOString()
    return ok({
      base,
      date: '2026-10-06',
      source: 'live',
      fetched_at: now,
      rates,
      unavailable: [],
      warnings: [],
      providers: [
        { provider: 'frankfurter', label: 'Frankfurter', currencies: ['USD', 'EUR', 'COP'], source: 'live', stale: false, fetched_at: now, published_at: '2026-10-06' },
        { provider: 'dolarapi', label: 'DolarApi', currencies: ['ARS'], source: 'live', stale: false, fetched_at: now, published_at: now },
      ],
    })
  }

  // ---- Billetera -------------------------------------------------------------------------------------

  private wallet(valuedIn: string) {
    const wallet = this.balances.get(this.currentUser.id) ?? {}
    const balances = ['COP', 'ARS', 'USD', 'EUR'].map((currency) => {
      const amount = wallet[currency] ?? 0
      return {
        currency,
        name: CURRENCY_NAMES[currency],
        decimals: 2,
        amount: money(amount),
        value_in_target: round2(amount * rateBetween(currency, valuedIn)),
        updated_at: new Date().toISOString(),
      }
    })
    return {
      wallet_id: `wallet-${this.currentUser.id}`,
      created_at: this.currentUser.created_at,
      balances,
      valuation: {
        currency: valuedIn,
        total: round2(balances.reduce((sum, b) => sum + (b.value_in_target ?? 0), 0)),
        rates_date: '2026-10-06',
        rates_source: 'live',
        missing_currencies: [],
        warnings: [],
      },
    }
  }

  private deposit(body: Obj, ok: (d: unknown, s?: number) => Reply, fail: (s: number, m: string) => Reply): Reply {
    const currency = String(body.currency)
    const amount = Number(body.amount)
    if (!(amount > 0)) return fail(400, 'El monto debe ser mayor que 0.')
    if (amount > (DEPOSIT_LIMITS[currency] ?? 0)) return fail(422, 'El monto supera el límite por recarga.')
    this.setBalance(currency, round2(this.balanceOf(currency) + amount))
    const id = nextId('tx')
    this.addTransaction({ id, type: 'DEPOSIT', to_currency: currency, to_amount: money(amount) })
    return ok({ transaction_id: id, type: 'DEPOSIT', currency, amount: money(amount), new_balance: money(this.balanceOf(currency)), created_at: new Date().toISOString() }, 201)
  }

  private buildExchange(query: Obj) {
    const from = String(query.from_currency)
    const to = String(query.to_currency)
    const amount = Number(query.amount)
    const arsType = String(query.ars_rate ?? 'mep')
    const rate = rateBetween(from, to, arsType)
    const fee = round2((amount * this.fees.exchange_fee_percent) / 100)
    const converted = round2((amount - fee) * rate)
    return {
      type: 'EXCHANGE',
      from_currency: from,
      to_currency: to,
      from_amount: money(amount),
      fee_percent: this.fees.exchange_fee_percent,
      fee_amount: money(fee),
      converted_amount: money(converted),
      rate,
      to_amount: money(converted),
      ars_rate: arsInfo(from, to, arsType),
      rates_date: '2026-10-06',
      rates_source: 'live',
      warnings: [] as string[],
    }
  }

  private exchangeQuote(query: Record<string, string>, ok: (d: unknown) => Reply, fail: (s: number, m: string) => Reply): Reply {
    if (!(Number(query.amount) > 0) || query.from_currency === query.to_currency) return fail(400, 'Datos de la operación inválidos.')
    return ok(this.buildExchange(query))
  }

  private exchange(body: Obj, ok: (d: unknown, s?: number) => Reply, fail: (s: number, m: string) => Reply): Reply {
    const quote = this.buildExchange(body)
    const from = quote.from_currency
    const to = quote.to_currency
    if (this.balanceOf(from) < Number(quote.from_amount)) return fail(422, 'Saldo insuficiente para hacer la operación.')
    this.setBalance(from, round2(this.balanceOf(from) - Number(quote.from_amount)))
    this.setBalance(to, round2(this.balanceOf(to) + Number(quote.to_amount)))
    const id = nextId('tx')
    this.addTransaction({
      id,
      type: 'EXCHANGE',
      from_currency: from,
      to_currency: to,
      from_amount: quote.from_amount,
      to_amount: quote.to_amount,
      exchange_rate: quote.rate,
      fee_amount: quote.fee_amount,
      fee_currency: from,
      fee_percent: quote.fee_percent,
      ars_rate_type: quote.ars_rate?.type ?? null,
    })
    return ok(
      { ...quote, transaction_id: id, created_at: new Date().toISOString(), balances: { from: money(this.balanceOf(from)), to: money(this.balanceOf(to)) } },
      201,
    )
  }

  private matchesFilter(tx: Obj, type?: string) {
    if (!type) return true
    if (type === 'EXCHANGE') return ['BUY', 'SELL', 'EXCHANGE'].includes(tx.type)
    return tx.type === type
  }

  private paged(list: Obj[], query: Record<string, string>, filter: (item: Obj) => boolean, ok: (d: unknown) => Reply): Reply {
    const page = Number(query.page ?? 1)
    const limit = Number(query.limit ?? 20)
    const filtered = list.filter(filter)
    return ok({ items: filtered.slice((page - 1) * limit, page * limit), page, limit, total: filtered.length })
  }

  // ---- P2P -------------------------------------------------------------------------------------------

  private buildOffer({ sell, buy, sellAmount, rate }: { sell: string; buy: string; sellAmount: number; rate: number }) {
    const buyAmount = round2(sellAmount * rate)
    const feeRatio = this.fees.p2p_fee_percent / 100
    const buyerFee = round2(sellAmount * feeRatio)
    const sellerFee = round2(buyAmount * feeRatio)
    return {
      id: nextId('offer'),
      status: 'open',
      sell_currency: sell,
      buy_currency: buy,
      sell_amount: money(sellAmount),
      rate,
      market_rate: rateBetween(sell, buy),
      buy_amount: money(buyAmount),
      fee_percent: this.fees.p2p_fee_percent,
      seller_fee: money(sellerFee),
      seller_receives: money(buyAmount - sellerFee),
      buyer_fee: money(buyerFee),
      buyer_receives: money(sellAmount - buyerFee),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      closed_at: null,
    }
  }

  private p2pQuote(query: Record<string, string>, ok: (d: unknown) => Reply, fail: (s: number, m: string) => Reply): Reply {
    const sell = query.sell_currency
    const buy = query.buy_currency
    const market = rateBetween(sell, buy)
    const rate = query.rate ? Number(query.rate) : market
    const min = market * 0.9
    const max = market * 1.1
    if (rate < min || rate > max) return fail(422, 'La tasa debe estar a ±10% de la tasa actual.')
    const offer = this.buildOffer({ sell, buy, sellAmount: Number(query.sell_amount), rate })
    return ok({
      sell_currency: sell,
      buy_currency: buy,
      sell_amount: offer.sell_amount,
      rate,
      market_rate: market,
      deviation_percent: Number((((rate / market) - 1) * 100).toFixed(2)),
      min_rate: min,
      max_rate: max,
      fee_percent: offer.fee_percent,
      buy_amount: offer.buy_amount,
      seller_fee: offer.seller_fee,
      seller_receives: offer.seller_receives,
      buyer_fee: offer.buyer_fee,
      buyer_receives: offer.buyer_receives,
      market_reference: 'tasa oficial del día',
      rates_date: '2026-10-06',
      warnings: [],
    })
  }

  private p2pCreate(body: Obj, ok: (d: unknown, s?: number) => Reply, fail: (s: number, m: string) => Reply): Reply {
    const me = this.currentUser
    const sell = String(body.sell_currency)
    const amount = Number(body.sell_amount)
    if (this.balanceOf(sell) < amount) return fail(422, 'Saldo insuficiente para publicar la oferta.')
    this.setBalance(sell, round2(this.balanceOf(sell) - amount))
    const offer = Object.assign(this.buildOffer({ sell, buy: String(body.buy_currency), sellAmount: amount, rate: Number(body.rate) }), {
      seller_id: me.id,
    })
    this.p2pOffers.unshift(offer)
    return ok({ offer, balance: money(this.balanceOf(sell)) }, 201)
  }

  private p2pAccept(id: string, ok: (d: unknown, s?: number) => Reply, fail: (s: number, m: string) => Reply): Reply {
    const offer = this.p2pOffers.find((o) => o.id === id)
    if (!offer || offer.status !== 'open') return fail(409, 'La oferta ya no está disponible.')
    const pay = Number(offer.buy_amount)
    if (this.balanceOf(offer.buy_currency) < pay) return fail(422, 'Saldo insuficiente para aceptar la oferta.')
    this.setBalance(offer.buy_currency, round2(this.balanceOf(offer.buy_currency) - pay))
    this.setBalance(offer.sell_currency, round2(this.balanceOf(offer.sell_currency) + Number(offer.buyer_receives)))
    offer.status = 'completed'
    offer.closed_at = new Date().toISOString()
    this.p2pTrades.unshift({
      offer_id: offer.id,
      role: 'buyer',
      counterpart_name: offer.seller_name ?? 'Marcos G.',
      paid_amount: offer.buy_amount,
      paid_currency: offer.buy_currency,
      received_amount: offer.buyer_receives,
      received_currency: offer.sell_currency,
      fee_amount: offer.buyer_fee,
      fee_currency: offer.sell_currency,
      fee_percent: offer.fee_percent,
      rate: offer.rate,
      sell_currency: offer.sell_currency,
      buy_currency: offer.buy_currency,
      transaction_id: nextId('tx'),
      completed_at: offer.closed_at,
    })
    return ok({ offer, balances: { paid: money(this.balanceOf(offer.buy_currency)), received: money(this.balanceOf(offer.sell_currency)) } })
  }

  private p2pCancel(id: string, ok: (d: unknown, s?: number) => Reply, fail: (s: number, m: string) => Reply): Reply {
    const offer = this.p2pOffers.find((o) => o.id === id && o.seller_id === this.currentUser.id)
    if (!offer || offer.status !== 'open') return fail(409, 'La oferta ya no se puede cancelar.')
    offer.status = 'cancelled'
    offer.closed_at = new Date().toISOString()
    this.setBalance(offer.sell_currency, round2(this.balanceOf(offer.sell_currency) + Number(offer.sell_amount)))
    return ok({ offer, balance: money(this.balanceOf(offer.sell_currency)) })
  }

  // ---- Superusuario ----------------------------------------------------------------------------------

  private superuser(
    method: string,
    path: string,
    query: Record<string, string>,
    body: Obj,
    ok: (d: unknown, s?: number) => Reply,
    fail: (s: number, m: string) => Reply,
  ): Reply {
    const allUsers = () => [...this.users.values()].map(publicUser)
    if (method === 'GET' && path === '/api/superuser/users') {
      const email = (query.email ?? '').toLowerCase()
      return this.paged(allUsers(), query, (u) => !email || u.email.toLowerCase().includes(email), ok)
    }
    const userAction = path.match(/^\/api\/superuser\/users\/([^/]+)\/(role|status)$/)
    if (method === 'PATCH' && userAction) {
      const user = this.users.get(decodeURIComponent(userAction[1]))
      if (!user) return fail(404, 'El usuario no existe.')
      if (user.is_owner) return fail(409, 'No se puede modificar la cuenta propietaria.')
      if (userAction[2] === 'role') user.role = body.role
      else user.status = body.status
      return ok(publicUser(user))
    }
    if (method === 'GET' && path === '/api/superuser/fees/summary') {
      return ok({
        totals: [{ currency: 'USD', exchange: '12.50', p2p: '3.25', total: '15.75', count: 8 }],
        owner_balances: [{ currency: 'USD', amount: '15.75' }],
        owner_exists: true,
      })
    }
    if (method === 'GET' && path === '/api/superuser/settings/fees') {
      return ok({ ...this.fees, updated_at: null, updated_by_email: null })
    }
    if (method === 'PATCH' && path === '/api/superuser/settings/fees') {
      const pct = (value: unknown) => Number(value)
      if (body.exchange_fee_percent !== undefined && !(pct(body.exchange_fee_percent) >= 0 && pct(body.exchange_fee_percent) <= 10)) {
        return fail(400, 'La comisión debe estar entre 0 y 10.')
      }
      Object.assign(this.fees, body)
      return ok({ ...this.fees, updated_at: new Date().toISOString(), updated_by_email: this.currentUser.email })
    }
    if (method === 'GET' && path === '/api/superuser/fees') {
      return this.paged(
        [
          { id: 'fee-1', source: 'exchange', currency_code: 'USD', amount: '0.50', transaction_id: 'tx-90', offer_id: null, payer_email: 'cliente@example.com', payer_name: 'Cliente Uno', created_at: new Date().toISOString() },
          { id: 'fee-2', source: 'p2p', currency_code: 'COP', amount: '2000.00', transaction_id: 'tx-91', offer_id: 'offer-90', payer_email: 'otro@example.com', payer_name: 'Otro Cliente', created_at: new Date().toISOString() },
        ],
        query,
        () => true,
        ok,
      )
    }
    if (method === 'GET' && path === '/api/superuser/transactions') {
      const all = [
        { id: 'sys-1', type: 'DEPOSIT', from_currency: null, to_currency: 'USD', from_amount: '0.00', to_amount: '100.00', exchange_rate: 1, fee_amount: '0.00', fee_currency: null, created_at: new Date().toISOString(), user_email: 'cliente@example.com', user_name: 'Cliente Uno' },
        { id: 'sys-2', type: 'EXCHANGE', from_currency: 'USD', to_currency: 'COP', from_amount: '50.00', to_amount: '199000.00', exchange_rate: 4000, fee_amount: '0.25', fee_currency: 'USD', created_at: new Date().toISOString(), user_email: 'otro@example.com', user_name: 'Otro Cliente' },
      ]
      const email = (query.email ?? '').toLowerCase()
      return this.paged(all, query, (tx) => (!query.type || tx.type === query.type) && (!email || tx.user_email.includes(email)), ok)
    }
    if (method === 'GET' && path === '/api/superuser/p2p/offers') {
      return this.paged(
        [
          { id: 'so-1', status: 'open', sell_currency: 'USD', buy_currency: 'COP', sell_amount: '100.00', buy_amount: '400000.00', rate: 4000, seller_fee: '2000.00', buyer_fee: '0.50', seller_email: 'vendedor@example.com', seller_name: 'Vendedor Uno', buyer_email: null, buyer_name: null, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86_400_000).toISOString(), closed_at: null },
        ],
        query,
        (offer) => !query.status || offer.status === query.status,
        ok,
      )
    }
    return fail(404, `Mock sin ruta: ${method} ${path}`)
  }
}
