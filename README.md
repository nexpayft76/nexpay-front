# NexPay · Front

Interfaz web de **NexPay**, una billetera digital multimoneda (COP, ARS, USD y EUR) con foco en el corredor
**Colombia ↔ Argentina**: ver tus saldos, cotizar, recargar, cambiar monedas dentro de tu cuenta (intercambio de
balance) y cambiar con otros usuarios en un **mercado P2P**, viendo la tasa real y la comisión antes de confirmar.

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

## Funcionalidades

- **Landing** pública:
  - hero con video de la Tierra (intro + loop que se desvanece al bajar; solo la intro en el celular y nada con "reducir movimiento");
  - propuesta del corredor COP ↔ ARS, cotizador rápido e historial del dólar;
  - **Nexa** para visitantes: responde qué es NexPay, las tasas y cómo crear una cuenta.
- **Cuenta:**
  - registro y login con validaciones en tiempo real (email disponible, reglas de la contraseña que se tildan, confirmación) y ojito para ver la contraseña;
  - recuperar la contraseña por email y cambiarla desde Configuración → Usuario;
  - editar nombre y email, y cerrar la cuenta (pide saldos en 0 y enlaza a Intercambio de balance).
- **Sesión en cookie HttpOnly** (el token no se guarda en el navegador): si vence, se cierra sola y el login lo avisa.
- **Dashboard ("Mi billetera"):**
  - total estimado de todos los saldos en la moneda elegida;
  - gráfico del par de monedas (1S, 1M, 3M, 6M, 1A);
  - saldos por moneda y cotizador.
  - El total, la billetera y el gráfico comparten la moneda: cambiarla en uno cambia los otros.
- **Operaciones:**
  - **Recarga:** montos rápidos y límite por moneda.
  - **Intercambio de balance:** cambiar una moneda por otra con la **tasa actual** y una comisión de 0,05%. Muestra el detalle (tasa, comisión, lo que recibes), pide **confirmación** y entrega un comprobante.
  - **Historial:** recargas e intercambios de balance, paginado y con filtro.
- **P2P** (menú P2P, cuatro pestañas):
  - **Mercado:** ofertas de otros usuarios con filtros, la **reputación** del vendedor (número de intercambios), lo que pagas y lo que recibes; al aceptar, el cambio es instantáneo;
  - **Publicar:** tasa actual, rango permitido (±10%), comisión y lo que recibirías, en tiempo real; avisa que el monto queda retenido en garantía;
  - **Mis ofertas:** estado de cada oferta y cancelación de las abiertas;
  - **Historial:** intercambios aceptados con la otra parte (nombre e inicial), lo pagado, lo recibido, la tasa y la comisión.
  - Los saldos se ven en una franja compacta arriba y se actualizan después de cada operación.
- **Superusuario** (sección del menú que solo ve ese rol; si otro usuario escribe la dirección, vuelve a su billetera):
  - **Comisiones:** porcentajes vigentes editables (intercambio de balance y P2P), lo cobrado por moneda, el saldo de la billetera propietaria y el detalle de cada comisión;
  - **Usuarios:** búsqueda por correo, cambio de rol (usuario o superusuario) y suspender o reactivar cuentas, con confirmación;
  - **Transacciones** y **P2P del sistema:** todo lo que pasa en la plataforma, con filtros.
- **Configuración:**
  - **Alertas** de tasa y de saldo;
  - **Preferencias:** tema claro u oscuro y avisos por app o por email;
  - **Usuario:** perfil, contraseña y cierre de cuenta.
- **Notificaciones** en la campana y avisos emergentes (alertas, ofertas P2P aceptadas o vencidas).
- **Nexa con sesión:** te saluda por tu nombre, conoce tus saldos y movimientos (solo lectura), muestra qué modelo de IA respondió y su cupo. **Nunca ejecuta operaciones:** explica cómo hacerlas.
- **Montos:**
  - puntos de miles automáticos mientras escribes (1000 → 1.000) y coma para decimales;
  - validación en tiempo real (formato, máximo 2 decimales, límite, saldo disponible).
- **Cotizador** con dólar oficial, MEP y blue (el blue es solo referencia), y las fuentes de cada tasa.
- **Accesibilidad y SEO:**
  - mobile first, sin scroll horizontal desde 320 px;
  - contraste AA, etiquetas para lectores de pantalla y confirmaciones con `<dialog>` nativo;
  - meta descripción, `robots.txt`, `sitemap.xml` y título por pantalla.

### ¿De dónde salen las tasas?

- **USD, EUR y COP:** tasa oficial del día (Frankfurter).
- **ARS:** dólar en vivo (DolarApi, se actualiza cada 5 minutos).

Cada operación usa la tasa actual al momento de confirmar, y el comprobante muestra la tasa aplicada.

---

## Tests

- **Vitest + Testing Library:** 114 tests de componentes, hooks y servicios (`tests/`).
- **Playwright (end to end):** 27 tests en 2 archivos (`e2e/tests/*.e2e.ts`). Corren en un Chromium real contra el front y **simulan el backend** (`e2e/support/mock-api.ts`, con datos en memoria que sí cambian), así que no necesitan `nexpay-back` ni internet. También corren en GitHub Actions (`.github/workflows/ci.yml`) en cada PR.

```bash
npx playwright install chromium   # solo la primera vez
npm run test:e2e                  # toda la suite (levanta Vite solo)
npm run test:e2e:ui               # modo interactivo
npm run test:e2e:report           # abre el último reporte HTML
```

| Área | Componentes | Tests |
|---|---|---:|
| Registro | `Register`, `PasswordInput`, `useEmailAvailability`, `validators` | 13 |
| Inicio y cierre de sesión | `Login`, `AuthProvider`, interceptor 401 de `api`, botones de cerrar sesión de `Navbar` y `Sidebar` | 14 |

El detalle de cada test end to end (grupo y qué valida) está en [`e2e/COBERTURA.md`](e2e/COBERTURA.md).

---

## Estructura

```
src/
├── main.tsx               # Arranque, captura de errores globales y recarga tras un deploy
├── routes/                # AppRouter (las privadas, bajo /dashboard, exigen sesión) y SuperuserRoute
├── context/               # AuthProvider: sesión, login, registro, logout
├── contexts/              # Alertas y preferencias
├── pages/
│   ├── Landing/           # Página pública (hero con video, cotizador, gráfico)
│   ├── Login/, Register/, Auth/   # Acceso y recuperación de contraseña
│   ├── Dashboard/         # Mi billetera
│   ├── Quote/             # Cotizador
│   ├── Operations/        # Recarga e intercambio de balance
│   ├── History/           # Historial de la cuenta
│   ├── P2P/               # Mercado, publicar, mis ofertas e historial P2P
│   ├── Superuser/         # Comisiones, usuarios, transacciones y P2P del sistema
│   └── Alerts/, Preferences/, Profile/   # Configuración
├── components/
│   ├── layout/            # Barra superior + menú lateral
│   ├── assistant/         # Nexa
│   ├── notifications/     # Campana y avisos emergentes
│   ├── wallet/            # Total estimado y billetera
│   ├── chart/             # Gráfico de tasas
│   ├── quote/             # Cotizador y fuentes de tasas
│   └── common/            # AmountInput, PasswordInput, ConfirmDialog, Pagination, ErrorBoundary, Icon…
├── hooks/                 # useMyWallet, useExchangeQuote, useP2PQuote, usePagedList…
├── services/              # api.ts (axios) + llamadas por dominio + sesión
├── utils/                 # montos, validaciones, monedas, formato, tiempo, logger
└── styles/theme.css       # Tema negro y dorado (claro y oscuro)
public/                    # favicon, robots.txt, sitemap.xml, videos del hero
tests/                     # Vitest
e2e/                       # Playwright
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
| `npm run test:e2e` | Tests end to end (Playwright) |

---

## Seguridad

- **Sesión:** cookie HttpOnly con `SameSite=Lax`, la pone el back; el front no guarda tokens.
- **Permisos:** el menú del superusuario se oculta a los demás, pero quien decide es el back (responde 403).
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
| William Coral | Líder técnico · integración front ↔ back, dashboard, operaciones, P2P, panel del superusuario, Nexa y video del hero; revisión |
| Tamara | Diseño visual (landing, tema negro y dorado, tipografía), perfil de usuario y tests end to end |
| Raúl Alejandro Carmona (Alejo) | Conexión front ↔ back, sesión, navegación, responsive y tests |
| Nelson Arzuza | Back · emails, notificaciones y recuperación de contraseña (también en el front) |
