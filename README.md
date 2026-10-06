# NexPay · Front

Interfaz web de **NexPay**, una billetera digital multimoneda (COP, ARS, USD y EUR) con foco en el corredor
**Colombia ↔ Argentina**: ver tus saldos, cotizar, recargar y comprar, vender o intercambiar monedas viendo
la tasa real y el costo antes de confirmar.

- **Sitio en producción:** https://nexpay-front.vercel.app
- **API:** https://nexpay-back-production.up.railway.app · repo [`nexpay-back`](https://github.com/nexpayft76/nexpay-back)

> Proyecto final del bootcamp de Henry. Las operaciones usan **dinero ficticio** (modo demo).

---

## Stack

| Área | Tecnología |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite |
| Rutas | React Router 7 (pantallas cargadas bajo demanda) |
| HTTP | axios (cliente único con manejo de errores y logger) |
| Gráficos | Recharts (se descarga solo al entrar al dashboard) |
| Tests | Vitest + Testing Library (unitarios y de componentes) · Playwright (end to end) |
| Lint | oxlint |
| Deploy | Vercel |

---

## Tests end to end (Playwright)

**284 tests** en 18 archivos (`e2e/tests/*.e2e.ts`). Corren en un Chromium real contra el front y **simulan el backend**
(`e2e/support/mock-api.ts`, con datos en memoria que sí cambian), así que no necesitan `nexpay-back` ni internet.

```bash
npx playwright install chromium   # solo la primera vez
npm run test:e2e                  # toda la suite (levanta Vite solo)
npm run test:e2e:ui               # modo interactivo
npm run test:e2e:report           # abre el último reporte HTML
npx playwright test p2p           # solo un área
```

| Área | Componentes | Tests |
|---|---|---:|
| Registro | `Register`, `PasswordInput`, email disponible | 13 |
| Inicio y cierre de sesión | `Login`, `AuthProvider`, 401 | 14 |
| Recuperar contraseña | `ForgotPassword`, `ResetPassword` | 9 |
| Rutas y permisos | `AppRouter`, `ProtectedRoute`, `SuperuserRoute` | 19 |
| Navegación | `Layout`, `Navbar`, `Sidebar`, `ThemeToggle` | 15 |
| Mi wallet | `Dashboard`, `TotalEstimate`, `WalletCard`, `RateChart` | 13 |
| Cotizador | `QuoteCard`, `RateSources` | 18 |
| Recarga | `DepositPage`, `ConfirmDialog` | 17 |
| Intercambio de balance | `ExchangePage` | 19 |
| Historial | `HistoryPage`, `Pagination` | 9 |
| P2P | Mercado, Publicar, Mis ofertas, Historial | 25 |
| Alertas | `AlertsPage`, `AlertsContext` | 14 |
| Notificaciones | `NotificationBell`, `NotificationToast` | 13 |
| Preferencias | `PreferencesPage`, `PreferencesContext` | 11 |
| Usuario | editar datos, cambiar contraseña, cerrar cuenta | 22 |
| Superusuario | Comisiones, Usuarios, Transacciones, P2P | 19 |
| Landing | `Landing`, `CurrencyQuote`, `WalletPreview` | 19 |
| Asistente Nexa | `AssistantWidget`, `useAssistantChat` | 15 |

El detalle de cada test (grupo y qué valida) está en [`e2e/COBERTURA.md`](e2e/COBERTURA.md).

---

## Funcionalidades

- **Landing** pública: propuesta del corredor COP ↔ ARS, cotizador rápido e historial del dólar.
- **Registro y login:**
  - validaciones en tiempo real: email disponible, reglas de la contraseña que se tildan mientras escribís, confirmación;
  - ojito para ver la contraseña.
- **Sesión en cookie HttpOnly** (el token no se guarda en el navegador):
  - si la sesión vence, se cierra sola y el login lo avisa.
- **Dashboard ("Mi billetera"):**
  - total estimado de todos los saldos en la moneda elegida;
  - gráfico del par de monedas (1S, 1M, 3M, 6M, 1A);
  - saldos por moneda;
  - cotizador.
  - El total, la billetera y el gráfico comparten la moneda: cambiarla en uno cambia los otros.
- **Operaciones:**
  - **Recarga:** montos rápidos, límite por moneda.
  - **Compra:** comprar, vender o intercambiar con la **tasa actual**. Muestra el detalle (tasa, comisión, lo que recibís), pide **confirmación** y entrega un comprobante.
- **Montos:**
  - puntos de miles automáticos mientras escribís (1000 → 1.000) y coma para decimales;
  - validación en tiempo real (formato, máximo 2 decimales, límite, saldo disponible).
- **Cotizador** con dólar oficial, MEP y blue (el blue es solo referencia), y las fuentes de cada tasa.
- **Accesibilidad y SEO:**
  - mobile first, sin scroll horizontal desde 320 px;
  - contraste AA y etiquetas para lectores de pantalla;
  - meta descripción, `robots.txt`, `sitemap.xml` y título por pantalla.

### ¿De dónde salen las tasas?

- **USD, EUR y COP:** tasa oficial del día (Frankfurter).
- **ARS:** dólar en vivo (DolarApi, se actualiza cada 5 minutos).

Cada operación usa la tasa actual al momento de confirmar, y el comprobante muestra la tasa aplicada.

---

## Estructura

```
src/
├── main.tsx               # Arranque, captura de errores globales y recarga tras un deploy
├── routes/AppRouter.tsx   # Rutas (las privadas, bajo /dashboard, exigen sesión)
├── context/               # AuthProvider: sesión, login, registro, logout
├── pages/
│   ├── Landing/           # Página pública
│   ├── Login/, Register/  # Acceso
│   ├── Dashboard/         # Mi billetera
│   ├── Quote/             # Cotizador
│   └── Operations/        # Recarga y compra
├── components/
│   ├── layout/            # Barra superior + menú lateral
│   ├── wallet/            # Total estimado y billetera
│   ├── chart/             # Gráfico de tasas
│   ├── quote/             # Cotizador y fuentes de tasas
│   └── common/            # AmountInput, PasswordInput, ConfirmDialog, ErrorBoundary, Icon…
├── hooks/                 # useMyWallet, useRateHistory, useQuote, useExchangeQuote…
├── services/              # api.ts (axios) + llamadas por dominio + sesión
├── utils/                 # montos, validaciones, monedas, formato, logger
└── styles/theme.css       # Tema negro y dorado
public/                    # favicon, robots.txt, sitemap.xml
tests/                     # Vitest
vercel.json                # Reenvío de /api al back, SPA y cabeceras de seguridad
```

---

## Cómo se conecta con el back

El front llama siempre a **`/api` en su mismo dominio**:

- **Producción:** `vercel.json` reenvía `/api/*` y `/health` a la API de Railway.
- **Desarrollo:** Vite los reenvía al back local (`vite.config.ts`).

Así la cookie de sesión es propia del sitio y funciona también en Safari, Brave y el modo incógnito, que
bloquean cookies de otros dominios. **No hace falta configurar la URL del back.**

---

## Cómo correrlo en local

Requisitos: **Node.js 20+** y el [back](https://github.com/nexpayft76/nexpay-back) corriendo en
`http://localhost:3000` (o apuntar al de Railway, ver abajo).

```bash
git clone https://github.com/nexpayft76/nexpay-front.git
```

```bash
cd nexpay-front
```

```bash
npm install
```

```bash
npm run dev
```

Abre http://localhost:5173

Para usar el back de Railway en vez del local, crea `.env.local` con:

```
API_PROXY_TARGET=https://nexpay-back-production.up.railway.app
```

### Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisa tipos y genera `dist/` |
| `npm run preview` | Sirve el build localmente |
| `npm run lint` | oxlint |
| `npm test` | Tests (Vitest) |
| `npm run test:watch` | Tests en modo observador |

---

## Seguridad

- **Sesión:** cookie HttpOnly con `SameSite=Lax`, la pone el back; el front no guarda tokens.
- **Vercel:**
  - CSP (solo scripts propios; estilos y fuentes de Google);
  - `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`;
  - CORS limitado al propio sitio.
- **API:** las respuestas no se guardan en caché.
- **Consola:** los errores controlados se muestran en pantalla y no la ensucian. En la consola del navegador, `nexpayLogs()` muestra los últimos eventos (cada error de la API trae su `request_id` para buscarlo en los logs de Railway).

---

## Flujo de trabajo del equipo

- `main` está protegida: todo entra por Pull Request con 1 aprobación, sin force push.
- Una rama por cambio (`feat/…`, `fix/…`, `docs/…`), **squash merge** y borrar la rama al mergear.
- Antes de subir: `npm run build`, `npm run lint` y `npm test`.
- Mensajes de commit en español con el formato `tipo(área): descripción`.

## Equipo

| Integrante | Rol |
| --- | --- |
| William Coral | Líder técnico · integración front ↔ back, dashboard, operaciones y revisión |
| Tamara | Diseño visual (landing, tema negro y dorado, tipografía) |
| Raúl Alejandro Carmona (Alejo) | Conexión front ↔ back, sesión, navegación y tests |
| Nelson | Back · CRUD y compra de monedas |
