# Cobertura de los tests end to end

**284 tests** en 18 archivos, ejecutados con Playwright (Chromium real) sobre la app levantada con Vite. El backend se simula en `e2e/support/mock-api.ts` (datos en memoria que sí cambian: una recarga suma saldo, un intercambio mueve dinero, cerrar sesión borra la sesión), así que los tests no dependen de `nexpay-back`, de la base de datos ni de internet.

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
| `e2e/tests/dashboard.e2e.ts` | Mi wallet | `Dashboard`, `TotalEstimate`, `WalletCard`, `RateChart` | `/dashboard` | 13 |
| `e2e/tests/cotizador.e2e.ts` | Cotizador | `QuoteCard`, `QuotePage`, `RateSources`, `AmountInput`, `useQuote` | `/dashboard/cotizador` | 18 |
| `e2e/tests/recarga.e2e.ts` | Recarga | `DepositPage`, `CurrencyPicker`, `AmountInput`, `ConfirmDialog`, `WalletCard` | `/dashboard/operaciones/recarga` | 17 |
| `e2e/tests/intercambio.e2e.ts` | Intercambio de balance | `ExchangePage`, `CurrencyPicker`, `AmountInput`, `ConfirmDialog`, `useExchangeQuote` | `/dashboard/operaciones/intercambio` | 19 |
| `e2e/tests/historial.e2e.ts` | Historial | `HistoryPage`, `Pagination`, `usePagedList` | `/dashboard/operaciones/historial` | 9 |
| `e2e/tests/p2p.e2e.ts` | P2P | `P2PPage`, `P2PMarket`, `P2PPublish`, `P2PMyOffers`, `P2PTrades`, `useP2PQuote` | `/dashboard/p2p` | 25 |
| `e2e/tests/alertas.e2e.ts` | Alertas | `AlertsPage`, `AlertsContext` (reglas) | `/dashboard/configuracion/alertas` | 14 |
| `e2e/tests/notificaciones.e2e.ts` | Notificaciones | `NotificationBell`, `NotificationToast`, `AlertsContext` (avisos) | `barra superior` | 13 |
| `e2e/tests/preferencias.e2e.ts` | Preferencias | `PreferencesPage`, `PreferencesContext` | `/dashboard/configuracion/preferencias` | 11 |
| `e2e/tests/perfil.e2e.ts` | Usuario | `ProfilePage`, `ProfileDetails`, `ProfileEditForm`, `ChangePasswordSection`, `CloseAccountSection` | `/dashboard/configuracion/usuario` | 22 |
| `e2e/tests/superusuario.e2e.ts` | Superusuario | `SuperuserFeesPage`, `FeeSettingsForm`, `SuperuserUsersPage`, `SuperuserTransactionsPage`, `SuperuserP2PPage` | `/dashboard/superusuario/*` | 19 |
| `e2e/tests/landing.e2e.ts` | Landing pública | `Landing`, `CurrencyQuote`, `WalletPreview` | `/` | 19 |
| `e2e/tests/asistente.e2e.ts` | Asistente Nexa | `AssistantWidget`, `useAssistantChat` | `/ y /dashboard/*` | 15 |
| | **Total** | | | **284** |

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

### Mi wallet — `dashboard.e2e.ts`

**Componentes:** `Dashboard`, `TotalEstimate`, `WalletCard`, `RateChart`  
**Ruta:** `/dashboard`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Dashboard | saluda con el nombre y el email del usuario |
| 2 | Dashboard | muestra las cuatro monedas con su saldo y el equivalente en la moneda elegida |
| 3 | Dashboard | el total estimado suma todos los saldos convertidos a la moneda elegida |
| 4 | Dashboard | una billetera sin saldo invita a hacer la primera recarga |
| 5 | Dashboard | cambiar la moneda del total también cambia la de la billetera y la del gráfico |
| 6 | Dashboard | cambiar la moneda desde la billetera actualiza el total y la preferencia guardada |
| 7 | Dashboard | si la billetera falla muestra el error y "Reintentar" la carga de nuevo |
| 8 | Gráfico de tasas | arranca con COP → USD en 1 mes y muestra el título del par |
| 9 | Gráfico de tasas | cambiar el rango vuelve a pedir el historial con ese rango |
| 10 | Gráfico de tasas | invertir las monedas intercambia origen y destino |
| 11 | Gráfico de tasas | elegir como origen la misma moneda de destino las intercambia (nunca "USD → USD") |
| 12 | Gráfico de tasas | con ARS el gráfico trae las tres series de dólar: oficial, MEP y blue |
| 13 | Gráfico de tasas | si el historial falla muestra el error del gráfico sin romper el resto del dashboard |

### Cotizador — `cotizador.e2e.ts`

**Componentes:** `QuoteCard`, `QuotePage`, `RateSources`, `AmountInput`, `useQuote`  
**Ruta:** `/dashboard/cotizador`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Cotizador | muestra el título de la pantalla y arranca con 1.000.000 COP → ARS |
| 2 | Cotizador | cotiza con la tasa del servidor y muestra cuánto se recibe |
| 3 | Cotizador | al escribir un monto nuevo recotiza |
| 4 | Cotizador | cotiza entre monedas sin ARS (USD → EUR) y no muestra el selector de tipo de dólar |
| 5 | Cotizador | el botón de invertir intercambia las monedas |
| 6 | Cotizador | con la misma moneda de origen y destino pide elegir dos distintas |
| 7 | Cotizador | avisa en tiempo real si el monto tiene más de 2 decimales |
| 8 | Cotizador | un monto en cero pide un valor mayor que 0 y no cotiza |
| 9 | Cotizador | el campo vacío pide ingresar un monto |
| 10 | Cotizador | muestra el error del servidor si no se puede cotizar |
| 11 | Tipo de dólar para ARS | muestra Oficial, MEP y Blue con MEP elegido |
| 12 | Tipo de dólar para ARS | cambiar de tipo de dólar cambia el resultado sin volver a llamar al servidor |
| 13 | Tipo de dólar para ARS | el blue se marca como solo referencia |
| 14 | Tipo de dólar para ARS | compara lo que se recibiría con cada tipo de dólar |
| 15 | Tipo de dólar para ARS | sugiere la mejor opción legal y permite usarla con un clic |
| 16 | Tipo de dólar para ARS | aclara que el blue daría más pero es informal |
| 17 | Fuentes de las tasas | lista Frankfurter y DolarApi con su estado actualizado |
| 18 | Fuentes de las tasas | avisa si no se pudo consultar el estado de las fuentes |

### Recarga — `recarga.e2e.ts`

**Componentes:** `DepositPage`, `CurrencyPicker`, `AmountInput`, `ConfirmDialog`, `WalletCard`  
**Ruta:** `/dashboard/operaciones/recarga`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Recarga | muestra el formulario con COP elegido, el saldo actual y el máximo por recarga |
| 2 | Recarga | muestra la billetera al costado |
| 3 | Recarga | el monto se escribe con puntos de miles automáticos |
| 4 | Recarga | el botón principal muestra el monto a recargar |
| 5 | Recarga | los montos rápidos completan el campo |
| 6 | Recarga | cambiar de moneda limpia el monto, actualiza el máximo y el saldo mostrado |
| 7 | Recarga | avisa al instante si el monto supera el máximo de la moneda |
| 8 | Recarga | avisa si el monto tiene más de 2 decimales |
| 9 | Recarga | un monto en cero se rechaza |
| 10 | Recarga | al enviar sin monto avisa "Ingresa un monto." y no abre la confirmación |
| 11 | Recarga | pide confirmación mostrando el monto y cómo cambia el saldo |
| 12 | Recarga | cancelar la confirmación no recarga nada |
| 13 | Recarga | Escape cierra la confirmación sin recargar |
| 14 | Recarga | confirmar suma el saldo, muestra el comprobante y refresca la billetera |
| 15 | Recarga | el comprobante ofrece volver a la billetera o hacer otra recarga |
| 16 | Recarga | "Ver mi billetera" del comprobante vuelve al dashboard |
| 17 | Recarga | si el servidor rechaza la recarga muestra su mensaje y no muestra comprobante |

### Intercambio de balance — `intercambio.e2e.ts`

**Componentes:** `ExchangePage`, `CurrencyPicker`, `AmountInput`, `ConfirmDialog`, `useExchangeQuote`  
**Ruta:** `/dashboard/operaciones/intercambio`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Intercambio de balance | arranca pagando con COP y recibiendo USD, con el saldo disponible a la vista |
| 2 | Intercambio de balance | no deja elegir como destino la misma moneda de origen |
| 3 | Intercambio de balance | elegir como origen la moneda de destino las invierte |
| 4 | Intercambio de balance | el botón ⇅ invierte las monedas y limpia el monto |
| 5 | Intercambio de balance | muestra el detalle exacto: tasa, comisión y lo que se recibe |
| 6 | Intercambio de balance | "Usar todo" completa el monto con el saldo disponible |
| 7 | Intercambio de balance | avisa saldo insuficiente al instante y no deja confirmar |
| 8 | Intercambio de balance | avisa si el monto tiene más de 2 decimales |
| 9 | Intercambio de balance | sin monto el botón de confirmar está deshabilitado |
| 10 | Intercambio de balance | al enviar con el campo tocado y vacío avisa "Ingresa un monto." |
| 11 | Intercambio de balance | con ARS aparece el selector del tipo de dólar (MEP u Oficial) y cambia la tasa |
| 12 | Intercambio de balance | sin ARS no se muestra el selector del tipo de dólar |
| 13 | Intercambio de balance | pide confirmación con lo que se paga, lo que se recibe y la tasa |
| 14 | Intercambio de balance | cancelar la confirmación no mueve dinero |
| 15 | Intercambio de balance | confirmar mueve el dinero, muestra el comprobante y actualiza los saldos |
| 16 | Intercambio de balance | el comprobante permite hacer otra operación |
| 17 | Intercambio de balance | si el servidor rechaza la operación (saldo cambió) muestra el error y no el comprobante |
| 18 | Intercambio de balance | si la cotización falla muestra el error y no permite confirmar |
| 19 | — | sin saldo no ofrece "Usar todo" y cualquier monto es saldo insuficiente |

### Historial — `historial.e2e.ts`

**Componentes:** `HistoryPage`, `Pagination`, `usePagedList`  
**Ruta:** `/dashboard/operaciones/historial`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Historial | sin movimientos muestra el estado vacío |
| 2 | Historial | muestra recargas e intercambios con sus datos |
| 3 | Historial | un intercambio con ARS indica qué dólar se usó |
| 4 | Historial | los filtros piden al servidor solo ese tipo de movimiento |
| 5 | Historial | un filtro sin resultados dice "de este tipo" |
| 6 | Historial | pagina de a 20 y permite ir a la página siguiente y volver |
| 7 | Historial | con una sola página no se muestra la paginación |
| 8 | Historial | si el servidor falla muestra el error |
| 9 | Flujo completo: recargar, intercambiar y verlo en el historial | cada operación hecha desde la app aparece en el historial |

### P2P — `p2p.e2e.ts`

**Componentes:** `P2PPage`, `P2PMarket`, `P2PPublish`, `P2PMyOffers`, `P2PTrades`, `useP2PQuote`  
**Ruta:** `/dashboard/p2p`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | P2P: estructura | muestra el título, las cuatro pestañas y arranca en el Mercado |
| 2 | P2P: estructura | cambiar de pestaña actualiza la pestaña seleccionada y el panel |
| 3 | P2P: mercado | sin ofertas invita a publicar la propia |
| 4 | P2P: mercado | lista las ofertas abiertas de otros con vendedor, reputación, tasa y neto |
| 5 | P2P: mercado | no muestra las ofertas propias en el mercado |
| 6 | P2P: mercado | los filtros piden al servidor solo las ofertas de esa moneda |
| 7 | P2P: mercado | "Actualizar" vuelve a pedir las ofertas |
| 8 | P2P: mercado | aceptar una oferta pide confirmación con lo que se paga y se recibe |
| 9 | P2P: mercado | cancelar la confirmación no acepta nada |
| 10 | P2P: mercado | aceptar mueve el dinero, avisa el resultado, saca la oferta del mercado y la suma al historial |
| 11 | P2P: mercado | sin saldo suficiente muestra el error del servidor y no mueve nada |
| 12 | P2P: mercado | si otra persona la aceptó antes, avisa que ya no está disponible y la quita de la lista |
| 13 | P2P: mercado | si el mercado falla muestra el error |
| 14 | P2P: publicar una oferta | arranca vendiendo USD y recibiendo COP, con el saldo disponible |
| 15 | P2P: publicar una oferta | simula la oferta: tasa actual, tasa propia, comisión y lo que recibirías |
| 16 | P2P: publicar una oferta | una tasa propia dentro del rango recalcula el resumen |
| 17 | P2P: publicar una oferta | una tasa fuera de ±10 % se rechaza con el mensaje del servidor y no deja publicar |
| 18 | P2P: publicar una oferta | avisa saldo insuficiente al instante |
| 19 | P2P: publicar una oferta | "Usar todo" completa el monto con el saldo disponible |
| 20 | P2P: publicar una oferta | elegir como moneda a vender la que se quiere recibir las invierte |
| 21 | P2P: publicar una oferta | publicar retiene el monto, lleva a "Mis ofertas" y muestra la oferta abierta |
| 22 | P2P: publicar una oferta | cancelar la confirmación no publica nada |
| 23 | P2P: mis ofertas | cancelar una oferta abierta devuelve lo retenido |
| 24 | P2P: mis ofertas | las ofertas cerradas se ven con su estado y sin botón de cancelar |
| 25 | P2P: mis ofertas | si ya no se puede cancelar muestra el error del servidor |

### Alertas — `alertas.e2e.ts`

**Componentes:** `AlertsPage`, `AlertsContext` (reglas)  
**Ruta:** `/dashboard/configuracion/alertas`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Alertas | sin alertas muestra el estado vacío y el formulario con una regla de ejemplo |
| 2 | Alertas | la vista previa de la regla cambia mientras se completa el formulario |
| 3 | Alertas | crea una alerta, la envía al servidor y la muestra activa en la lista |
| 4 | Alertas | con "También enviarme un email" la alerta queda con campanita + email |
| 5 | Alertas | un umbral en cero no se envía: el navegador marca el campo como inválido |
| 6 | Alertas | después de crear una alerta el formulario vuelve a sus valores iniciales |
| 7 | Alertas | desactivar una alerta la marca como inactiva y actualiza el contador |
| 8 | Alertas | editar una alerta carga sus datos, guarda los cambios y permite cancelar |
| 9 | Alertas | eliminar una alerta la saca de la lista y del servidor |
| 10 | Alertas | si el servidor falla al crear muestra el error y conserva lo escrito |
| 11 | Alertas | las alertas guardadas en el servidor aparecen al entrar |
| 12 | Alertas con el backend sin módulo de alertas (404) | crea reglas locales (saldo bajo) que sobreviven a recargar la página |
| 13 | Alertas con el backend sin módulo de alertas (404) | una regla que necesita al servidor (variación diaria) no se puede guardar |
| 14 | Alertas con el servidor caído (500) | avisa del error, desactiva los tipos que dependen del servidor y deja "Saldo bajo" |

### Notificaciones — `notificaciones.e2e.ts`

**Componentes:** `NotificationBell`, `NotificationToast`, `AlertsContext` (avisos)  
**Ruta:** `barra superior`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Campana de notificaciones | sin notificaciones no muestra contador y el panel explica cuándo aparecerán |
| 2 | Campana de notificaciones | el contador cuenta solo las no leídas |
| 3 | Campana de notificaciones | con más de 9 sin leer muestra "9+" |
| 4 | Campana de notificaciones | abre el panel con título y mensaje, y se cierra al tocar la campana otra vez |
| 5 | Campana de notificaciones | tocar una notificación la marca como leída, baja el contador y cierra el panel |
| 6 | Campana de notificaciones | el tacho elimina una notificación |
| 7 | Campana de notificaciones | "Administrar alertas" lleva a la pantalla de alertas |
| 8 | Campana de notificaciones | una notificación nueva del servidor aparece sola (consulta cada 15 s) y muestra el aviso flotante |
| 9 | Campana de notificaciones | el aviso flotante se cierra con la X y también solo a los 3 segundos |
| 10 | Alertas de recarga y saldo bajo | con una alerta de "Recarga recibida" activa, recargar genera un aviso y una notificación en la campana |
| 11 | Alertas de recarga y saldo bajo | una alerta desactivada no genera avisos |
| 12 | Alertas de recarga y saldo bajo | con una alerta de "Saldo bajo", un intercambio que deja poco saldo avisa |
| 13 | Alertas de recarga y saldo bajo | con los avisos en pantalla desactivados en Preferencias no aparece el aviso flotante, pero sí la notificación |

### Preferencias — `preferencias.e2e.ts`

**Componentes:** `PreferencesPage`, `PreferencesContext`  
**Ruta:** `/dashboard/configuracion/preferencias`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Preferencias | muestra las cuatro secciones con los valores por defecto |
| 2 | Preferencias | cambiar una preferencia muestra "Preferencia guardada" y luego desaparece |
| 3 | Preferencias | la moneda principal se usa como moneda inicial del dashboard |
| 4 | Preferencias | el tipo de dólar elegido es la selección inicial del cotizador |
| 5 | Preferencias | las preferencias se guardan por usuario y sobreviven a recargar |
| 6 | Preferencias | elegir modo claro cambia la interfaz y se guarda en el servidor |
| 7 | Preferencias | el interruptor de la barra superior y el de Preferencias están sincronizados |
| 8 | Preferencias | desactivar los avisos y el email se guarda en el servidor |
| 9 | Preferencias | el email activado por defecto marca la casilla de email en el formulario de alertas |
| 10 | Preferencias | las preferencias que guardó el servidor se aplican al entrar |
| 11 | Preferencias | si el servidor no guarda la preferencia, igual se aplica en esta sesión |

### Usuario — `perfil.e2e.ts`

**Componentes:** `ProfilePage`, `ProfileDetails`, `ProfileEditForm`, `ChangePasswordSection`, `CloseAccountSection`  
**Ruta:** `/dashboard/configuracion/usuario`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Perfil: datos de la cuenta | muestra nombre, email, estado y fecha de alta en solo lectura |
| 2 | Perfil: datos de la cuenta | "Ir a Preferencias" lleva a la pantalla de preferencias |
| 3 | Perfil: datos de la cuenta | el botón "Cerrar sesión" de la pantalla termina la sesión |
| 4 | Perfil: editar datos | abre el formulario con los datos actuales y "Guardar" deshabilitado hasta que algo cambie |
| 5 | Perfil: editar datos | cancelar vuelve a la vista de solo lectura sin guardar |
| 6 | Perfil: editar datos | cambiar solo el nombre envía únicamente ese campo y actualiza toda la app |
| 7 | Perfil: editar datos | cambiar el email lo verifica en vivo y lo guarda |
| 8 | Perfil: editar datos | un email que ya tiene otra cuenta se rechaza y bloquea el guardado |
| 9 | Perfil: editar datos | el mismo email con otras mayúsculas no cuenta como cambio ni se consulta como ocupado |
| 10 | Perfil: editar datos | valida el nombre (vacío, muy corto, demasiado largo) y el formato del email |
| 11 | Perfil: editar datos | si el servidor rechaza el guardado muestra su mensaje y deja seguir editando |
| 12 | Perfil: cambiar la contraseña | el formulario está cerrado por defecto y se abre con el botón |
| 13 | Perfil: cambiar la contraseña | "Guardar contraseña" solo se habilita con datos válidos |
| 14 | Perfil: cambiar la contraseña | tilda las reglas de la nueva contraseña mientras se escribe |
| 15 | Perfil: cambiar la contraseña | cambia la contraseña, cierra el formulario, avisa y mantiene la sesión |
| 16 | Perfil: cambiar la contraseña | con la contraseña actual incorrecta muestra el error y NO cierra la sesión |
| 17 | Perfil: cambiar la contraseña | cancelar cierra el formulario y borra lo escrito |
| 18 | Perfil: cerrar la cuenta | sin saldo: pide la contraseña, cierra la cuenta y manda al login |
| 19 | Perfil: cerrar la cuenta | sin escribir la contraseña no cierra y lo avisa |
| 20 | Perfil: cerrar la cuenta | con la contraseña incorrecta muestra el error y la cuenta sigue abierta |
| 21 | Perfil: cerrar la cuenta | con saldo pendiente explica el motivo, lista los fondos y enlaza al intercambio |
| 22 | Perfil: cerrar la cuenta | cancelar el diálogo no cierra nada |

### Superusuario — `superusuario.e2e.ts`

**Componentes:** `SuperuserFeesPage`, `FeeSettingsForm`, `SuperuserUsersPage`, `SuperuserTransactionsPage`, `SuperuserP2PPage`  
**Ruta:** `/dashboard/superusuario/*`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Superusuario: comisiones | muestra el resumen cobrado por moneda, el saldo propietario y el detalle |
| 2 | Superusuario: comisiones | el formulario trae las comisiones vigentes y "Guardar" está deshabilitado sin cambios |
| 3 | Superusuario: comisiones | valida el rango (máximo 10 %), el formato y los 4 decimales |
| 4 | Superusuario: comisiones | cambiar una comisión pide confirmación mostrando el antes y el después, y la guarda |
| 5 | Superusuario: comisiones | la comisión nueva rige en el siguiente intercambio de cualquier usuario |
| 6 | Superusuario: comisiones | cancelar la confirmación no cambia nada |
| 7 | Superusuario: comisiones | si el servidor rechaza el cambio muestra su mensaje |
| 8 | Superusuario: usuarios | lista todos los usuarios; la propia cuenta y la propietaria no se pueden modificar |
| 9 | Superusuario: usuarios | buscar por correo filtra la lista |
| 10 | Superusuario: usuarios | asignar el rol de superusuario pide confirmación y lo guarda |
| 11 | Superusuario: usuarios | cancelar el cambio de rol deja todo igual |
| 12 | Superusuario: usuarios | suspender una cuenta pide confirmación; después se puede reactivar |
| 13 | Superusuario: usuarios | una cuenta suspendida no puede iniciar sesión |
| 14 | Superusuario: usuarios | si el servidor rechaza el cambio muestra el error |
| 15 | Superusuario: transacciones y P2P del sistema | Transacciones lista las de todos los usuarios con sus montos y comisión |
| 16 | Superusuario: transacciones y P2P del sistema | filtra por tipo y por correo del usuario |
| 17 | Superusuario: transacciones y P2P del sistema | P2P del sistema muestra las ofertas con vendedor, comprador y estado |
| 18 | Superusuario: transacciones y P2P del sistema | el filtro de estado pide al servidor solo ese estado |
| 19 | Superusuario: el back también lo exige | si el servidor responde 403 la pantalla muestra el error |

### Landing pública — `landing.e2e.ts`

**Componentes:** `Landing`, `CurrencyQuote`, `WalletPreview`  
**Ruta:** `/`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Landing: encabezado y navegación | un visitante ve "Iniciar sesión" y "Crear cuenta" y el mensaje principal |
| 2 | Landing: encabezado y navegación | los botones del encabezado llevan a login y registro |
| 3 | Landing: encabezado y navegación | los enlaces de sección apuntan a las secciones de la página |
| 4 | Landing: encabezado y navegación | "Probar el cotizador" lleva a la sección del cotizador |
| 5 | Landing: encabezado y navegación | un usuario con sesión ve "Mi dashboard" y el botón de cerrar sesión, sin los botones de registro |
| 6 | Landing: encabezado y navegación | el botón de tema alterna entre claro y oscuro (parte del tema del sistema del visitante) |
| 7 | Landing: encabezado y navegación | muestra las secciones de contenido (problema, solución, P2P, seguridad y llamado final) |
| 8 | Landing: cotizador | arranca con 1.000.000 COP → ARS y muestra lo que se recibe con el dólar MEP |
| 9 | Landing: cotizador | compara el mismo monto con los tres dólares argentinos y la diferencia entre ellos |
| 10 | Landing: cotizador | escribir un monto recotiza y formatea con puntos de miles |
| 11 | Landing: cotizador | el deslizador cambia el monto |
| 12 | Landing: cotizador | el botón ⇄ invierte las monedas y usa el monto inicial de la nueva moneda de origen |
| 13 | Landing: cotizador | sin ARS (USD → EUR) no se muestran los tres dólares y la tasa es la oficial |
| 14 | Landing: cotizador | elegir como origen la moneda de destino las intercambia |
| 15 | Landing: cotizador | con el monto vacío pide ingresar un monto |
| 16 | Landing: cotizador | si no hay tasas muestra el error y "Reintentar" vuelve a cotizar |
| 17 | Landing: ejemplo de billetera | muestra los cuatro saldos de ejemplo y el total en USD |
| 18 | Landing: ejemplo de billetera | cambiar la moneda del total recalcula todo |
| 19 | Landing: ejemplo de billetera | si las tasas fallan muestra el error y permite reintentar |

### Asistente Nexa — `asistente.e2e.ts`

**Componentes:** `AssistantWidget`, `useAssistantChat`  
**Ruta:** `/ y /dashboard/*`

| # | Grupo | Qué valida |
|---:|---|---|
| 1 | Asistente para visitantes (landing) | el botón flotante abre el chat con el saludo y las preguntas sugeridas de un visitante |
| 2 | Asistente para visitantes (landing) | escribir una pregunta y enviarla muestra la respuesta y qué modelo respondió |
| 3 | Asistente para visitantes (landing) | una pregunta sugerida se envía con un clic |
| 4 | Asistente para visitantes (landing) | Enter envía y Shift+Enter agrega una línea |
| 5 | Asistente para visitantes (landing) | el botón Enviar está deshabilitado con el campo vacío |
| 6 | Asistente para visitantes (landing) | envía el historial de la conversación en cada mensaje nuevo |
| 7 | Asistente para visitantes (landing) | el selector de modelo lista los modelos con su estado y cupo |
| 8 | Asistente para visitantes (landing) | elegir un modelo lo envía en la petición |
| 9 | Asistente para visitantes (landing) | "Nueva conversación" borra los mensajes |
| 10 | Asistente para visitantes (landing) | Escape y el botón de cerrar cierran el chat devolviendo el foco al botón flotante |
| 11 | Asistente para visitantes (landing) | la conversación sobrevive a recargar la página (misma pestaña) |
| 12 | Asistente para visitantes (landing) | si falla muestra el error, devuelve el texto al campo y "Reintentar" lo vuelve a enviar sin duplicarlo |
| 13 | Asistente para usuarios con sesión | aparece en las pantallas privadas, saluda por el primer nombre y usa el chat de la cuenta |
| 14 | Asistente para usuarios con sesión | el asistente está disponible en todas las pantallas del dashboard |
| 15 | Asistente para usuarios con sesión | la conversación de un usuario no se ve en otra cuenta |

## Qué no cubren (a propósito)

- **Backend real**: estos tests prueban el front. Que el back calcule bien tasas, comisiones y saldos lo cubren los tests de `nexpay-back`.
- **Proveedores externos** (Frankfurter, DolarApi, el video del hero): se cortan para que los tests sean estables.
- **Un solo navegador** (Chromium en desktop; la navegación móvil se prueba con un viewport de 390 px).
- **Componentes de presentación sin lógica** (`Icon`, `NexpayLogo`, `HeroVideo`, `ErrorBoundary`): se ejercitan indirectamente dentro de las pantallas.
