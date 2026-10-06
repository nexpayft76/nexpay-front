# Cobertura de los tests end to end

**70 tests** en 5 archivos, ejecutados con Playwright (Chromium real) sobre la app levantada con Vite. El backend se simula en `e2e/support/mock-api.ts` (datos en memoria que sí cambian: una recarga suma saldo, un intercambio mueve dinero, cerrar sesión borra la sesión), así que los tests no dependen de `nexpay-back`, de la base de datos ni de internet.

## Cómo correrlos

```bash
npm run test:e2e          # toda la suite (levanta Vite solo)
npm run test:e2e:ui       # modo interactivo de Playwright
npm run test:e2e:report   # abre el último reporte HTML
npx playwright test p2p   # solo los archivos cuyo nombre contenga "p2p"
```

La primera vez hay que descargar el navegador: `npx playwright install chromium`. `npm test` sigue siendo Vitest (los tests de `e2e/` están excluidos).

## Resumen por área

| Archivo | Área | Componentes que valida | Ruta | Tests |
|---|---|---|---|---:|
| `e2e/tests/auth-registro.e2e.ts` | Registro | `Register`, `PasswordInput`, `useEmailAvailability`, `validators` | `/register` | 13 |
| `e2e/tests/auth-login.e2e.ts` | Inicio y cierre de sesión | `Login`, `AuthProvider`, interceptor 401 de `api`, botones de cerrar sesión de `Navbar` y `Sidebar` | `/login` | 14 |
| `e2e/tests/recuperar-contrasena.e2e.ts` | Recuperar contraseña | `ForgotPassword`, `ResetPassword` | `/forgot-password, /reset-password` | 9 |
| `e2e/tests/rutas-protegidas.e2e.ts` | Rutas y permisos | `AppRouter`, `ProtectedRoute`, `SuperuserRoute` | `todas` | 19 |
| `e2e/tests/navegacion-layout.e2e.ts` | Estructura de la app con sesión | `Layout`, `Navbar`, `Sidebar`, `ThemeToggle` | `/dashboard` | 15 |
| | **Total** | | | **70** |

## Detalle de cada test

Cada fila es un test. La columna *Qué valida* es el nombre del test, escrito como una frase que describe el comportamiento esperado.

### Registro — `auth-registro.e2e.ts`

**Componentes:** `Register`, `PasswordInput`, `useEmailAvailability`, `validators`  
**Ruta:** `/register`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Registro | muestra el formulario con sus cuatro campos y el enlace para iniciar sesión |
| 2 | Registro | al enviar el formulario vacío marca todos los campos obligatorios y no llama al servidor |
| 3 | Registro | avisa si el nombre tiene menos de 2 caracteres |
| 4 | Registro | avisa si el email no tiene formato válido |
| 5 | Registro | confirma "Email disponible" cuando el email todavía no tiene cuenta |
| 6 | Registro | avisa que el email ya existe y ofrece iniciar sesión |
| 7 | Registro | no permite registrar un email ocupado aunque lo demás esté bien |
| 8 | Registro | tilda las reglas de la contraseña mientras se escribe |
| 9 | Registro | avisa cuando las contraseñas no coinciden y confirma cuando sí |
| 10 | Registro | el ojito muestra y oculta la contraseña |
| 11 | Registro | crea la cuenta, envía los datos limpios y entra directo al dashboard |
| 12 | Registro | muestra el error del servidor si el registro falla |
| 13 | Registro | si ya hay una sesión iniciada, redirige al dashboard |

### Inicio y cierre de sesión — `auth-login.e2e.ts`

**Componentes:** `Login`, `AuthProvider`, interceptor 401 de `api`, botones de cerrar sesión de `Navbar` y `Sidebar`  
**Ruta:** `/login`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Inicio de sesión | muestra el formulario y los enlaces a registro, recuperar contraseña e inicio |
| 2 | Inicio de sesión | con datos correctos entra al dashboard y saluda por el nombre |
| 3 | Inicio de sesión | manda el email sin espacios y la contraseña tal como se escribió |
| 4 | Inicio de sesión | con la contraseña equivocada muestra el error y se queda en el login |
| 5 | Inicio de sesión | una cuenta suspendida no puede entrar y se informa el motivo |
| 6 | Inicio de sesión | con los campos vacíos pide email y contraseña sin llamar al servidor |
| 7 | Inicio de sesión | avisa si el email tiene un formato inválido |
| 8 | Inicio de sesión | muestra un mensaje claro si el servidor no responde |
| 9 | Inicio de sesión | el botón queda deshabilitado mientras se inicia sesión |
| 10 | Inicio de sesión | si ya hay una sesión iniciada, /login redirige al dashboard |
| 11 | Sesión | sigue iniciada después de recargar la página |
| 12 | Sesión | cerrar sesión desde la barra superior termina la sesión y bloquea el dashboard |
| 13 | Sesión | cerrar sesión desde el menú lateral también funciona |
| 14 | Sesión | si el servidor rechaza la sesión (401), cierra la sesión y el login explica que expiró |

### Recuperar contraseña — `recuperar-contrasena.e2e.ts`

**Componentes:** `ForgotPassword`, `ResetPassword`  
**Ruta:** `/forgot-password, /reset-password`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Pedir el enlace de recuperación | desde el login, "¿Olvidaste tu contraseña?" lleva al formulario conservando el email escrito |
| 2 | Pedir el enlace de recuperación | valida el email antes de enviar |
| 3 | Pedir el enlace de recuperación | al enviar muestra siempre el mismo aviso (no revela si el email existe) |
| 4 | Pedir el enlace de recuperación | si el servidor falla, muestra el error y deja reintentar |
| 5 | Crear la nueva contraseña | un enlace sin token se informa como inválido y ofrece pedir otro |
| 6 | Crear la nueva contraseña | el botón se habilita solo cuando la contraseña cumple las reglas y coincide |
| 7 | Crear la nueva contraseña | con un token válido cambia la contraseña y ofrece iniciar sesión |
| 8 | Crear la nueva contraseña | con un token vencido muestra el error del servidor y no confirma el cambio |
| 9 | Crear la nueva contraseña | después de cambiarla se puede iniciar sesión con la nueva contraseña |

### Rutas y permisos — `rutas-protegidas.e2e.ts`

**Componentes:** `AppRouter`, `ProtectedRoute`, `SuperuserRoute`  
**Ruta:** `todas`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Sin sesión | /dashboard redirige al login |
| 2 | Sin sesión | /dashboard/cotizador redirige al login |
| 3 | Sin sesión | /dashboard/operaciones/recarga redirige al login |
| 4 | Sin sesión | /dashboard/operaciones/intercambio redirige al login |
| 5 | Sin sesión | /dashboard/operaciones/historial redirige al login |
| 6 | Sin sesión | /dashboard/p2p redirige al login |
| 7 | Sin sesión | /dashboard/configuracion/alertas redirige al login |
| 8 | Sin sesión | /dashboard/configuracion/preferencias redirige al login |
| 9 | Sin sesión | /dashboard/configuracion/usuario redirige al login |
| 10 | Sin sesión | las pantallas públicas (landing, login, registro, recuperar contraseña) son accesibles |
| 11 | Sin sesión | una ruta que no existe vuelve a la landing |
| 12 | Con sesión | /dashboard/operaciones redirige a la recarga |
| 13 | Con sesión | /dashboard/configuracion redirige a las alertas |
| 14 | Con sesión | el enlace viejo /operaciones/compra sigue funcionando y lleva al intercambio |
| 15 | Con sesión | una ruta inexistente vuelve a la landing |
| 16 | Con sesión | un usuario común que entra a una pantalla de superusuario vuelve a su billetera |
| 17 | Con sesión | un usuario común no ve el menú de Superusuario |
| 18 | Superusuario | /dashboard/superusuario redirige a Comisiones |
| 19 | Superusuario | el menú lateral incluye el grupo Superusuario |

### Estructura de la app con sesión — `navegacion-layout.e2e.ts`

**Componentes:** `Layout`, `Navbar`, `Sidebar`, `ThemeToggle`  
**Ruta:** `/dashboard`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Menú lateral en desktop | arranca contraído (solo íconos) y se expande con la hamburguesa |
| 2 | Menú lateral en desktop | marca como activa la pantalla actual |
| 3 | Menú lateral en desktop | el grupo Operaciones se abre y muestra Recarga, Intercambio de balance e Historial |
| 4 | Menú lateral en desktop | el grupo Configuración lleva a Alertas, Preferencias y Usuario |
| 5 | Menú lateral en desktop | entrar directo a una subpantalla deja abierto su grupo |
| 6 | Menú lateral en desktop | con el menú contraído, tocar un grupo expande la barra y abre sus opciones |
| 7 | Menú lateral en desktop | el logo de la barra superior lleva a la landing |
| 8 | Menú lateral en celular | arranca cerrado y no se puede navegar con el teclado |
| 9 | Menú lateral en celular | se abre como panel, enfoca "Cerrar menú" y se cierra con Escape devolviendo el foco |
| 10 | Menú lateral en celular | tocar un enlace navega y cierra el panel |
| 11 | Menú lateral en celular | tocar el fondo oscuro cierra el panel |
| 12 | Menú lateral en celular | no hay scroll horizontal en 390 px de ancho |
| 13 | Modo claro / oscuro | el botón de la barra alterna el tema, cambia su etiqueta y lo guarda en el servidor |
| 14 | Modo claro / oscuro | el modo elegido se mantiene al recargar |
| 15 | Modo claro / oscuro | si el servidor guardó "claro" para el usuario, se aplica al entrar |

## Qué no cubren (a propósito)

- **Backend real**: estos tests prueban el front. Que el back calcule bien tasas, comisiones y saldos lo cubren los tests de `nexpay-back`. Como el backend es simulado, si el back cambia un contrato (campos, mensajes de error), estos tests no se enteran.
- **Proveedores externos** (Frankfurter, DolarApi, el video del hero): se cortan para que los tests sean estables.
- **Un solo navegador** (Chromium en desktop; la navegación móvil se prueba con un viewport de 390 px).
- **Componentes de presentación sin lógica** (`Icon`, `NexpayLogo`, `HeroVideo`, `ErrorBoundary`): se ejercitan indirectamente dentro de las pantallas.
