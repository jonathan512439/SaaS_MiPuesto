# SECURITY.md — Seguridad, pruebas y controles de MiPuesto

Este documento define los controles que se aplican en cada fase del proyecto. No son recomendaciones: son parte del criterio de aceptación de cada fase.

## Contexto de riesgo

MiPuesto es multi-tenant: muchos negocios comparten una sola base de datos. Eso concentra el riesgo en un lugar muy específico — **el aislamiento entre negocios**. Un error ahí no es un bug visual, es un negocio leyendo los pedidos, precios y clientes de otro. Es el único fallo de este proyecto que podría costarte la reputación con la que vendés, así que recibe atención desproporcionada respecto a su tamaño en código.

El proyecto **no procesa pagos ni guarda tarjetas**, lo que elimina toda una categoría de riesgo. Pero sí guarda datos personales de terceros (nombre y teléfono de clientes que hacen pedidos), lo cual implica responsabilidades de privacidad reales.

## Estrategia de pruebas para un desarrollador solo

Sin equipo ni QA, escribir pruebas para todo es irreal y te va a frenar. La estrategia es **cobertura desigual y deliberada**: pruebas automáticas donde un error es caro y silencioso, prueba manual donde un error es obvio a simple vista.

| Qué | Cómo se prueba | Por qué |
|---|---|---|
| Políticas RLS (aislamiento entre negocios) | Automática, obligatoria | Un fallo es invisible hasta que es un desastre |
| Cálculo de precios y promociones | Automática, obligatoria | Un error se traduce en plata mal cobrada |
| Expiración de reservas | Automática, obligatoria | Depende del tiempo; no se puede probar a ojo |
| Generación del link de WhatsApp | Automática (formato) + manual (celular real) | El formato se testea; que abra bien WhatsApp, no |
| Lógica de horario abierto/cerrado | Automática | Casos borde de medianoche y zona horaria |
| Interfaz y flujos visuales | Manual, con checklist | Automatizarlo cuesta más de lo que ahorra a esta escala |

Herramienta sugerida: Vitest para la lógica pura (`lib/`), y un script de pruebas contra una base de Supabase local para RLS. Nada de Cypress/Playwright por ahora — el costo de mantenimiento no se justifica todavía.

## Controles por fase

### Fase 0 — Setup
- `.env.local` en `.gitignore` desde el primer commit. Verificá que ninguna clave haya entrado nunca al historial de git.
- `SUPABASE_SERVICE_ROLE_KEY` nunca en código con prefijo `NEXT_PUBLIC_`, nunca importada en un componente de cliente.
- RLS activado en **todas** las tablas en la misma migración que las crea. Una tabla sin RLS en Supabase es pública.
- Configurar el linter para que falle el build si detecta `service_role` en código de cliente.
- **Control de auditoría:** correr `git log -p | grep -i "service_role\|anon_key"` y confirmar que no hay secretos en el historial.

### Fase 1 — Sistema de diseño
- Contraste de color verificado en los tokens: texto normal 4.5:1, texto grande 3:1.
- Los indicadores de estado (disponible/reservado/vendido/oculto) no dependen solo del color.
- Foco de teclado visible en todos los componentes base.

### Fase 2 — Autenticación (fase de máximo riesgo)
- **Pruebas de RLS automatizadas, no negociables.** Escribir un script que: cree dos usuarios con un negocio cada uno, y verifique que el usuario A no puede leer, actualizar ni borrar ninguna fila de las 7 tablas del usuario B. Este script se corre de nuevo al final de **cada** fase posterior, porque una migración nueva puede romper una política vieja.
- Longitud mínima de contraseña y verificación de email activadas en Supabase Auth.
- Límite de intentos de login (Supabase lo trae; confirmá que está habilitado).
- El flujo de recuperación de contraseña no revela si un email existe o no en el sistema.
- Validación de slug también **del lado del servidor**, no solo en el formulario: lista negra de slugs reservados y formato estricto.
- **Control de auditoría:** documentar en el repo qué política RLS protege cada tabla y qué prueba la cubre.

### Fase 3 — Plantillas
- Las plantillas reciben datos por props y no ejecutan HTML crudo. Si en algún momento hace falta renderizar contenido del negocio como HTML, sanitizarlo primero — la descripción de un negocio es entrada de usuario.

### Fase 4 — Catálogo e imágenes
- Validación de tipo de archivo **por contenido, no por extensión**. Un `.jpg` renombrado no es una imagen.
- Peso máximo antes de comprimir (rechazar >5 MB) y después de comprimir.
- Políticas de Storage: un admin solo puede subir y borrar archivos en la carpeta de su propio negocio.
- Los nombres de archivo se generan del lado del sistema (UUID), nunca se usa el nombre que trae el usuario.
- Borrado del archivo en Storage al eliminar o reemplazar una imagen, verificado explícitamente.
- Límite de cantidad de productos por negocio, configurable — protege tu cuota gratuita de un uso desmedido.
- **Control de auditoría:** consulta que liste archivos en Storage sin producto asociado, para correr cada tanto y detectar huérfanos.

### Fase 5 — Modalidades
- La modalidad se valida en el servidor al procesar un pedido: un negocio en modo `catalogo_estatico` debe rechazar un pedido aunque alguien fuerce la petición desde fuera de la interfaz.

### Fase 6 — Carrito y reservas (segunda fase de mayor riesgo)
- **El total del pedido se recalcula en el servidor.** Nunca confíes en el total que manda el cliente — es el vector de abuso más obvio de todo el sistema.
- Los precios se leen de la base al momento de crear el pedido, no del carrito del navegador.
- Límite de pedidos por IP y por ventana de tiempo, para evitar que alguien reserve todo el inventario de un negocio por diversión.
- El teléfono del cliente se valida en formato, y se guarda solo si el cliente lo ingresó.
- La Edge Function de expiración es idempotente: correrla dos veces seguidas no debe producir efectos distintos.
- Confirmar y cancelar un pedido verifica que el pedido pertenezca al negocio del admin que hace la acción.
- **Prueba automática obligatoria:** pedido con `expira_en` en el pasado → tras correr la función, pedido en `expirado` y productos en `disponible`.

### Fase 7 — Panel completo
- Las promociones no pueden generar precios negativos: validación en base (`check`) y en `lib/precios.ts`.
- El QR de cobro que sube el negocio es una imagen y pasa las mismas validaciones que las fotos de producto.
- Los cambios de configuración de un negocio se aplican solo al negocio del admin autenticado, verificado en el servidor.

### Fase 8 — Plataforma
- `eventos_analitica` permite inserción anónima pero **no** lectura anónima. Sin esto, cualquiera puede leer las métricas de todos los negocios.
- Límite de escritura de eventos por sesión, para que la tabla de analítica no sea un vector para llenar tu base de datos gratuita.
- El directorio público expone solo campos pensados para ser públicos — revisá la consulta columna por columna, no uses `select *`.
- Cabeceras de seguridad configuradas en Cloudflare Pages: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`.

### Fase 9 — Cierre
- Correr la suite completa de pruebas de RLS por última vez.
- Revisar que ninguna variable de entorno de producción esté en el repo.
- Verificar SSL y redirección de HTTP a HTTPS.
- Probar el flujo completo en un celular real con datos móviles, no en el navegador de escritorio.
- **Auditoría final:** recorrer este documento entero y marcar cada control como cumplido o justificadamente omitido.

## Privacidad de datos de clientes finales

Los negocios afiliados van a tener nombres y teléfonos de sus clientes en tu base de datos. Eso implica:

- No guardar más datos de los necesarios para procesar el pedido.
- El negocio ve solo los datos de sus propios pedidos (cubierto por RLS).
- Definir y aplicar un plazo de retención: los pedidos confirmados o expirados con más de X meses se pueden anonimizar (borrar nombre y teléfono, conservar el resto para estadística).
- Tener una respuesta preparada si un cliente final pide que borres sus datos.

## Registro de auditoría mínimo

No hace falta un sistema de logs completo, pero sí dejar rastro de las acciones que cambian dinero o estado:

- Quién confirmó o canceló cada pedido y cuándo
- Cambios de precio de productos (fecha y valor anterior)
- Activaciones y desactivaciones de negocios

Con guardar esto en columnas de la tabla correspondiente alcanza en esta etapa. Sirve para resolver disputas con un negocio sin depender de tu memoria.

## Cosas que NO hay que hacer todavía

Parte de gestionar el riesgo es no gastar esfuerzo donde no hace falta:

- No construyas roles y permisos múltiples por negocio. Un admin por negocio hasta que alguien lo pida.
- No hagas pruebas end-to-end automatizadas. El costo de mantenimiento supera el beneficio a esta escala.
- No implementes autenticación de dos factores todavía. Sí, cuando manejes negocios con volumen real.
- No construyas un panel de super-admin para vos mismo en las primeras fases. Usá la consola de Supabase directamente; construilo cuando administrar a mano te empiece a doler.

## Recorrido de seguridad del 2026-09-06

Verificado contra producción, no sobre el código. Lo que estaba bien: las siete
cabeceras vivas, HTTPS forzado con 308, las siete APIs de panel y plataforma en
401 sin sesión, `/plataforma` en 404 para quien no administra, permisos por
columna ocultando `admin_user_id` y `suscripcion_vence_en` a `anon`, datos de
compradores cerrados, y la propiedad del pedido comprobada dentro de la función
de la base y no en la ruta.

Cinco correcciones aplicadas el mismo día.

### 1. La analítica se podía inundar

El tope de sesenta eventos por hora era **por sesión**, y la sesión la elige el
navegador. Se comprobó: diez eventos desde una sola IP rotando el UUID, los diez
aceptados. Cualquiera con un bucle escribía filas sin fin —cuota de la base— y
envenenaba las estadísticas que el dueño usa para decidir qué reponer.

Ahora cuenta por huella de IP, como los pedidos. **La huella solo vale si el
cliente no puede elegirla**, así que el registro dejó de estar abierto a `anon`:
pasa por `registrar_evento_analitica`, revocada de `anon` y `authenticated`, y se
revocó el `insert` directo sobre la tabla. Mientras esa puerta estuviera abierta,
el límite era decorativo.

Trescientos eventos por IP y negocio cada quince minutos: una casa o una oficina
enteras detrás de una sola salida a internet generan muchos eventos legítimos, y
cortarles la medición sería peor que el problema.

**Verificado contra producción después del cambio.** Con el contador por debajo
del tope, un evento se guarda; con el contador en 300, dos eventos seguidos no
guardan ninguno. Y la escritura directa desde la clave pública responde 42501.

Al crear la tabla del conteo se olvidó devolverle los permisos a `service_role`
—el mismo descuido que hubo con `plataforma_admins`—. La función definer escribía
igual porque corre como su dueña, así que el límite funcionaba; lo que no se podía
era mirarlo, ni para verificarlo ni para atender una queja de «no me registra
las visitas».

### 2. Faltaban tres slugs reservados

`plataforma`, `privacidad` y `terminos`. Una ruta estática le gana al slug, así
que un negocio con uno de esos nombres pagaba, cargaba su catálogo y su dirección
nunca abría.

### 3. La analítica aceptaba productos en la papelera

Su política comprobaba `visible = true`, y un producto borrado lo conserva —el
mismo agujero que se cerró en la creación de pedidos, en otra tabla—. La función
nueva exige `eliminado_en is null`.

### 4. `/plataforma` no renovaba la sesión

El proxy solo cubría `/dashboard`. Justo la ruta más sensible era la única cuya
sesión no se renovaba, así que al administrador lo echaba al ingreso en medio del
trabajo.

### 5. La prueba de aislamiento se había quedado atrás

Cubría ocho tablas y no las columnas ni la tabla agregadas después. Ahora
comprueba también que un dueño común no lea ni cree etiquetas, no mande a la
papelera ni ponga en la carta del día un producto ajeno, no cambie rubro, ciudad
ni reseñas de otro negocio, no escriba analítica salteándose la ruta y no lea el
conteo de límites por IP — y que sí pueda guardar lo suyo.

### Lo que quedó pendiente a propósito

| Pendiente | Por qué no ahora |
|---|---|
| `/api/salud` sin límite y con clave de servicio | No filtra nada; el riesgo es de cuota. Se resuelve cacheando la respuesta unos segundos |
| `'unsafe-inline'` en `script-src` | Quitarlo exige nonces y hay que ver si vinext los soporta. No renderizamos HTML de usuario |
| Sin tope de almacenamiento por negocio | El techo existe —2 MB por foto, 4 por producto, 300 productos— pero nadie avisa al acercarse |
| Invitaciones sin límite | Exige una cuenta con segundo factor ya comprometida |

## Recuperación de contraseña — corregido el 2026-09-07

Reportado en producción: se pide restablecer la contraseña, se abre el enlace del
correo, al guardar la contraseña nueva aparece «enlace no válido», y **al tocar
«Solicitar otro enlace» el sistema abre la aplicación**. Después, la contraseña
nueva no funciona con ninguna de las dos.

### Qué pasaba

El enlace del correo **abre una sesión** —así funciona la recuperación en
Supabase: probar que controlás el buzón es la prueba—. El error al guardar dejaba
esa sesión abierta. Y el proxy tenía un atajo de comodidad:

> si hay sesión y estás en `/login` o `/recuperar-clave`, te llevo al panel.

Ese atajo convertía un clic en el correo en acceso a la aplicación **sin haber
cambiado la contraseña**. El dueño quedaba adentro creyendo que ya la había
cambiado, y después no podía entrar con ninguna.

No es una elevación de privilegios —quien tiene el buzón puede restablecer la
contraseña de todas formas— pero sí deja el sistema en un estado que nadie pidió
y que el usuario interpreta, con razón, como que algo está roto.

### Qué se hizo

- **La sesión de recuperación queda confinada.** Se lee `amr` del token, que
  viene firmado y no se puede falsear desde el navegador. Si la sesión se abrió
  solo con el enlace del correo, cualquier ruta del panel devuelve a
  `/actualizar-clave` explicando por qué. Si `amr` no viene, **se asume sesión
  completa**: equivocarse para el otro lado dejaría gente afuera de su panel.
- **El atajo de comodidad ya no aplica** a una sesión de recuperación.
- **Cambiar la contraseña ahora cierra las demás sesiones** (`scope: "others"`).
  Antes, alguien que hubiera entrado con la contraseña vieja se quedaba adentro:
  un restablecimiento que no echa a nadie no sirve para recuperar una cuenta
  comprometida.
- **Los mensajes dejaron de mentir.** Cualquier fallo decía «el enlace no es
  válido», incluso con el enlace perfecto: repetir la contraseña anterior, elegir
  una débil o quedarse sin conexión daban el mismo texto, que mandaba a pedir
  otro enlace y a fallar de nuevo. Ahora se distinguen, y solo se culpa al enlace
  cuando de verdad no hay sesión.
- **Si no hay sesión, no se muestra el formulario.** Escribir dos veces una
  contraseña para que después falle es hacerle perder el tiempo a alguien que ya
  viene peleando con un enlace que no anduvo.

### La causa real del «enlace caducado» — corregida el 2026-09-07

No era la configuración ni el enlace: **el cliente del navegador tiraba la sesión
que el enlace traía.**

`createBrowserClient` de `@supabase/ssr` fija `flowType: "pkce"` a mano, sin
opción de cambiarlo. Y dentro de auth-js hay esta comprobación:

```js
case "implicit":
  if (this.flowType === "pkce") throw new Error("Not a valid PKCE flow url");
```

El enlace de recuperación llega como `#access_token=...&type=recovery`, que es
justamente un callback implícito. El cliente lo ve, decide que no corresponde a
su flujo y lo descarta **sin decir nada**. Nunca se abre la sesión, `updateUser`
falla por falta de sesión, y el mensaje culpaba al enlace —que estaba perfecto—.

Comprobado contra la API: se generó un enlace, se siguió la redirección, y el
`access_token` del fragmento devolvió 200 en `/auth/v1/user` con el correo
correcto. El token siempre estuvo bien.

**La corrección toma la sesión a mano** en `/actualizar-clave`, aceptando las dos
formas en que Supabase puede mandarla —tokens en el fragmento o `code` en la
consulta— sin depender de qué flujo cree el cliente que está usando. Después
limpia la dirección: los tokens no deben quedar en el historial del teléfono.

**Esto también arreglaba las invitaciones**, que usan la misma página de destino
y fallaban por lo mismo.

### Un supuesto equivocado, corregido con la medición

El control de «sesión de recuperación» exigía que `amr` contuviera `recovery`.
El token real de Supabase trae **`[{"method":"otp"}]`**, así que el control
quedaba apagado justo en el caso para el que se escribió. Ahora se consideran las
dos, y como el ingreso normal de la aplicación es con contraseña, nadie llega con
`otp` salvo desde un enlace del correo.

### Lo que hay que verificar en la consola de Supabase

La causa del «enlace no válido» original puede estar en la configuración, no en
el código: **Authentication → URL Configuration → Redirect URLs** tiene que
incluir la dirección de `/actualizar-clave` del entorno que se está usando. Si no
está en la lista, Supabase ignora el `redirectTo` y el token nunca llega a la
página. Las otras dos causas habituales son abrir el correo en un navegador
distinto del que pidió el enlace, y los antivirus de correo que visitan los
enlaces antes que la persona y los consumen.

### El paso que sobraba — 2026-09-07

Con la plantilla ya corregida, el circuito seguía fallando en el último paso: el
enlace se verificaba bien, aparecía el formulario, y al guardar la sesión ya no
estaba. Medido con el dueño, en Chrome normal y sin modo incógnito. Algo la
borraba entre un clic y el siguiente.

**En vez de seguir buscando qué, se quitó la dependencia.** El canje del enlace y
el cambio de contraseña ocurren ahora **en el mismo gesto**: la persona escribe
su contraseña, toca guardar, y recién ahí se canjea el enlace y se escribe la
contraseña, seguidos, sin nada en el medio. La sesión solo tiene que vivir
milisegundos y en memoria.

Se conserva lo que se buscaba con la plantilla nueva: **el enlace no se consume
al abrirse**, así que un antivirus de correo que lo visite no lo quema.

Verificado de punta a punta sobre un usuario descartable: canje del enlace (200,
sesión abierta), cambio de contraseña (200) e ingreso con la nueva (funciona).
El usuario se borró al terminar.
