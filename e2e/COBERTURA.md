# Cobertura de los tests end to end

**27 tests** en 2 archivos, ejecutados con Playwright (Chromium real) sobre la app levantada con Vite. El backend se simula en `e2e/support/mock-api.ts` (datos en memoria que sí cambian: una recarga suma saldo, un intercambio mueve dinero, cerrar sesión borra la sesión), así que los tests no dependen de `nexpay-back`, de la base de datos ni de internet.

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
| | **Total** | | | **27** |

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

## Qué no cubren (a propósito)

- **Backend real**: estos tests prueban el front. Que el back calcule bien tasas, comisiones y saldos lo cubren los tests de `nexpay-back`. Como el backend es simulado, si el back cambia un contrato (campos, mensajes de error), estos tests no se enteran.
- **Proveedores externos** (Frankfurter, DolarApi, el video del hero): se cortan para que los tests sean estables.
- **Un solo navegador** (Chromium en desktop; la navegación móvil se prueba con un viewport de 390 px).
- **Componentes de presentación sin lógica** (`Icon`, `NexpayLogo`, `HeroVideo`, `ErrorBoundary`): se ejercitan indirectamente dentro de las pantallas.
