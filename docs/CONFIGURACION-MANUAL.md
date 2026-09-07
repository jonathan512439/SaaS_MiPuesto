# Configuración manual de Fase 0

Estos pasos requieren acceso a cuentas, credenciales o software del equipo y no deben automatizarse sin supervisión.

## 1. Instalar Docker Desktop (opcional y diferido)

Supabase local necesita Docker Desktop o Podman. En Windows:

1. Instalá Docker Desktop desde <https://docs.docker.com/desktop/setup/install/windows-install/>.
2. Usá el motor WSL 2 cuando el instalador lo ofrezca.
3. Reiniciá la terminal y abrí Docker Desktop.
4. Verificá con `docker --version` y `docker info`.
5. Desde la raíz de MiPuesto, ejecutá:

```powershell
npm run supabase:start
npm run supabase:reset
npm run db:lint
npm run test:rls
```

`supabase:reset` elimina y reconstruye únicamente la base local. No uses `--linked` para esta comprobación.

Esta ruta no es necesaria por ahora: el desarrollo usa el proyecto remoto independiente `mipuesto-dev` para ahorrar espacio en C:.

## 2. Completar el entorno local con `mipuesto-dev`

Estado: **completado el 2026-09-01**. La ruta `/api/salud/supabase` respondió HTTP 200 y confirmó la conexión.

`.env.local` ya fue creado, está ignorado por Git y tiene la URL de `mipuesto-dev`. Desde **Connect** en el panel de Supabase, copiá únicamente la clave Publishable y pegala en:

```dotenv
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_BWDMcD9WG335E-Rq7Qsftg_2bVIPjn-
```

Dejá `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` vacías en esta fase. No compartás ni commiteés `.env.local`.

Luego ejecutá `npm run dev` y abrí <http://localhost:3000/api/salud/supabase>. Debe responder `{"estado":"ok","servicio":"supabase"}`.

Si más adelante se activa Supabase local, ejecutá `npx supabase status -o env` y reemplazá temporalmente:

- `NEXT_PUBLIC_SUPABASE_URL`: URL local mostrada por la CLI.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública/publishable. Si la salida local solo muestra una clave `anon`, podés usar temporalmente `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`: clave local de servicio, solo para código servidor futuro.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

## 3. Crear y vincular Supabase remoto

Estado: **completado el 2026-09-01**. El proyecto vinculado es `mipuesto-dev` (`afhnxjdqaruwccgsdxzb`) en `sa-east-1`.

1. Creá un proyecto desde <https://supabase.com/dashboard> con estos datos:
   - Organización: `JC-Dev`.
   - Nombre: `mipuesto-dev`.
   - Región: **South America (São Paulo)** / `sa-east-1`.
   - Plan: Free.
   - Contraseña de base: generá una nueva y guardala en un gestor seguro. No la compartás por chat ni la guardés en el repositorio.
   - Si aparece “Automatically expose new tables”, dejalo desactivado; la migración declara cada permiso explícitamente.
   - Si aparece “Enable RLS by default”, dejalo activado.
2. Ejecutá `npx supabase login` y completá el flujo del navegador.
3. Copiá el identificador del proyecto y ejecutá `npx supabase link --project-ref ID_DEL_PROYECTO`.
4. Previsualizá las migraciones con `npm run supabase:push:dry`.
5. Si el resultado es correcto, aplicá las migraciones con `npm run supabase:push`. El seed **solo** se aplica contra la base local, con `npm run supabase:seed:local`: contra la base enlazada reejecutaría `seed.sql` sobre los datos reales.
6. Ejecutá `npm run db:lint:linked` y `npm run test:rls:linked`.
7. Obtené la clave Publishable desde **Connect** en Supabase y completá `.env.local` según la sección 2.

La verificación de email, contraseña mínima y recuperación se configurarán y auditarán en la Fase 2.

El asesor de seguridad muestra `Leaked Password Protection Disabled`. No es un error del esquema: esa función requiere el plan Pro. En Free se mantiene registrada como limitación aceptada y en Fase 2 se configurará una contraseña mínima robusta.

## 4. Publicar el repositorio Git

Estado: **completado el 2026-09-01**. El remoto es `https://github.com/jonathan512439/SaaS_MiPuesto.git`; `main` y `fase-1-sistema-diseno` están publicadas.

1. Creá un repositorio privado vacío en GitHub o GitLab.
2. Agregá el remoto: `git remote add origin URL_DEL_REPOSITORIO`.
3. Verificá: `git remote -v`.
4. Publicá: `git push -u origin main`.

No agregués `.env.local`, claves de Supabase ni tokens de Cloudflare al repositorio.

## 5. Decidir y conectar Cloudflare

Cloudflare Pages solo admite Next.js mediante exportación estática. MiPuesto necesita servidor para Auth, validaciones y pedidos, por lo que la ruta vigente es **Cloudflare Workers**.

Estado: **completado el 2026-09-01**. El Worker está publicado en la cuenta exclusiva de MiPuesto (`a558c055e89f45ad66d4de1ec1e31a2a`) en `https://mipuesto-dev.mipuesto-app.workers.dev`; la portada y la conexión con Supabase respondieron HTTP 200. `wrangler.jsonc` fija ese `account_id` para impedir despliegues accidentales en otra cuenta. El repositorio quedó conectado y Workers Builds verificó un despliegue automático exitoso desde `main`.

La configuración aplicada queda documentada como referencia:

1. Entrá a <https://dash.cloudflare.com/> y abrí **Workers & Pages**.
2. Abrí el Worker existente **mipuesto-dev**, entrá a **Settings → Build** y elegí la opción para conectar un repositorio. Autorizá GitHub si lo solicita.
3. Seleccioná `jonathan512439/SaaS_MiPuesto` y configurá:
   - Rama de producción: `main`.
   - Directorio raíz: `/` o vacío.
   - Comando de build: `npm run build:vinext`.
   - Comando de deploy: `npm run deploy:vinext`.
4. En **Settings → Build → Build variables and secrets**, agregá:
   - `NEXT_PUBLIC_SUPABASE_URL`: la URL de `mipuesto-dev`.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: la clave Publishable de `mipuesto-dev`.
   - `NEXT_PUBLIC_SITE_URL`: `https://mipuesto-dev.mipuesto-app.workers.dev`.
5. Las dos variables de Supabase ya están cargadas en **Settings → Variables & Secrets** del Worker. Agregá allí únicamente `NEXT_PUBLIC_SITE_URL` con la URL anterior. La clave administrativa no se usaba en la Fase 0; su incorporación controlada comienza recién en la Fase 6, según la sección 12.
6. Guardá y ejecutá **Retry deployment** para probar el flujo automático desde GitHub. Esta prueba quedó aprobada con el build `2f82476f-5794-4a79-bd59-b22807cb40b4`.
7. Abrí la URL asignada y comprobá:
   - `/` carga MiPuesto sin errores visibles.
   - `/api/salud/supabase` devuelve `{"estado":"ok","servicio":"supabase"}`.
   - En **Observability → Logs** no aparecen errores durante ambas visitas.
8. La URL y la evidencia se registran en `docs/AVANCE.md`; la Fase 0 quedó cerrada.

El Worker anterior `https://mipuesto-dev.tienda-blanco.workers.dev` permanece temporalmente disponible como respaldo. Se eliminará de la cuenta Tienda Blanco únicamente después de verificar el despliegue automático en la cuenta MiPuesto y recibir autorización explícita.

`.node-version` fija Node.js `22.23.1`. El deploy usa `--keep-vars` para conservar las variables de runtime administradas desde el panel.

Referencias vigentes:

- <https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/>
- <https://developers.cloudflare.com/workers/ci-cd/builds/>

## 6. Revisar visualmente la Fase 1

Estado: **completado automáticamente el 2026-09-01 con Chromium Headless real**. La siguiente lista queda como procedimiento reproducible, no como pendiente:

1. Ejecutá `npm run dev` y abrí <http://localhost:3000/estilos>.
2. En las herramientas del navegador, fijá el ancho en **360 px**.
3. Confirmá que no exista desplazamiento horizontal y que todos los textos, colores y controles sean legibles.
4. Recorré la página usando solo `Tab` y `Shift + Tab`; cada control debe mostrar un doble anillo de foco distinguible tanto en fondos claros como oscuros.
5. Probá los botones normal, deshabilitado y cargando; los cuatro estados de producto deben distinguirse también por símbolo y texto.
6. Abrí **Revisar producto**. El foco debe quedar dentro del diálogo; `Escape` y el botón de cierre deben cerrarlo.
7. Cerrá el aviso **Producto publicado** y volvé a mostrarlo con el botón correspondiente.
8. Activá **Reducir movimiento** en Windows y recargá la página; los esqueletos y la hoja no deben animarse de forma perceptible.
9. Repetí una revisión breve a un ancho de escritorio de al menos 1280 px.

La auditoría aprobó todos estos controles a 360 px y 1440 px, sin desplazamiento horizontal. La Fase 1 quedó cerrada y no resta ninguna acción manual para su criterio de aceptación.

## 7. Configurar Supabase Auth para la Fase 2

Estado: **parcialmente completado el 2026-09-01**. La aplicación ya implementa login, invitación y recuperación; estos controles requieren modificar opciones de la cuenta y no se automatizan con secretos del navegador.

1. Entrá a <https://supabase.com/dashboard/project/afhnxjdqaruwccgsdxzb/auth/providers> y abrí el proveedor **Email**.
2. Confirmá estas opciones:
   - **Allow new users to sign up**: desactivado. Confirmado manualmente.
   - **Confirm email**: activado. Confirmado manualmente.
   - **Minimum password length**: `10`. Confirmado manualmente.
   - Si el panel ofrece requisitos adicionales, mantenelos simples por ahora; la longitud de 10 caracteres es obligatoria.
3. En **Authentication → URL Configuration**, configurá:
   - **Site URL**: `https://mipuesto-dev.mipuesto-app.workers.dev`.
   - **Redirect URLs**: `https://mipuesto-dev.mipuesto-app.workers.dev/actualizar-clave` y `http://localhost:3000/actualizar-clave`.
4. En **Authentication → Rate Limits**, dejá habilitados los límites de inicio de sesión y envío de correos. El valor por persona para recuperación debe ser como mínimo 60 segundos.
5. Configurá un SMTP propio en **Authentication → SMTP Settings** antes de invitar un negocio real. **Completado temporalmente el 2026-09-02 con `app.mipuesto@gmail.com` y contraseña de aplicación**, sin incorporar credenciales al proyecto. El primer intento devolvió `Gateway Timeout` por un dígito incorrecto en la contraseña; al corregirlo, la invitación llegó al correo de prueba. Para producción se migrará a Resend Free con un dominio propio. El SMTP gratuito predeterminado de Supabase solo entrega a miembros del equipo y limita los correos, por lo que no es suficiente para administradores externos.
6. Después de guardar, desde la raíz del proyecto ejecutá:

```powershell
npm run auth:invitar -- correo-del-negocio@ejemplo.com
```

La CLI ya enlazada solicita la clave administrativa solo en memoria. No copies `SUPABASE_SERVICE_ROLE_KEY` a Git, al código ni a una variable con prefijo `NEXT_PUBLIC_`. Su uso servidor en la Fase 6 se documenta en la sección 12.

7. Abrí el correo recibido, definí una contraseña en el enlace y comprobá que podés ingresar y crear el negocio. La verificación del enlace ocurre en Supabase antes de la redirección: si alguna vez el enlace apunta a una URL incorrecta (por ejemplo, `localhost` desde otro dispositivo), la cuenta puede quedar creada aunque la página no cargue. En ese caso, después de corregir la URL, pedí recuperación de contraseña para ese correo y usá el enlace nuevo; no es necesario reenviar otra invitación.

   Para reducir spam antes de producción, se personalizará la plantilla de invitación y se sustituirá Gmail por un proveedor con dominio propio y registros SPF, DKIM y DMARC. No modifiques aún la plantilla mientras se completa esta validación funcional.

   Luego ejecutá:

```powershell
npm run test:rls:linked
```

Si el correo no llega, revisá el log de Auth y la carpeta de spam. No desactives confirmación de correo para resolverlo.

## 8. Revisión visual manual de la Fase 2

Estado: **completado manualmente el 2026-09-02**. El administrador confirmó navegación y funcionamiento correctos en móvil y escritorio.

1. Iniciá `npm run dev` y abrí `http://localhost:3000/login`.
2. Con las herramientas de desarrollo, revisá `/login`, `/recuperar-clave`, `/actualizar-clave` y `/dashboard/configuracion` a **360 px** y a al menos **1280 px**.
3. Confirmá que no existe desplazamiento horizontal, que cada control se puede alcanzar con `Tab` y que el foco se distingue con claridad.
4. Ingresá con una cuenta invitada: el panel debe abrir y permitir guardar los datos del negocio.
5. Probá un slug válido, uno reservado (`admin`) y uno ya tomado. Los mensajes deben ser claros y el guardado debe bloquearse cuando corresponda.
6. Abrí una ventana privada e intentá entrar a `/dashboard/configuracion`; debe redirigir a `/login`.
7. Pedí recuperación con un correo existente y con uno inexistente: el mensaje visible debe ser idéntico en ambos casos. Comprobá que el enlace de un correo real termina en `/actualizar-clave`.

## 9. Revisión visual manual de la Fase 3

Estado: **completado manualmente el 2026-09-02**. La implementación, pruebas, compilaciones, auditoría RLS y revisión de las 12 combinaciones están aprobadas.

1. Con `npm run dev` abierto, ingresá a `http://localhost:3000/dashboard/plantilla`.
2. Revisá la pantalla a **360 px** y a al menos **1280 px**. No debe aparecer desplazamiento horizontal.
3. Elegí sucesivamente Clásica, Moderna y Mínima. Deben cambiar composición, tipografía, navegación, botones y recorrido, manteniendo los mismos productos y fotografías.
4. En cada plantilla probá Mercado, Tierra, Océano y Noche. Las 12 combinaciones deben conservar texto y controles legibles.
5. Guardá una combinación distinta de la inicial, recargá la página y confirmá que ambas selecciones permanecen.
6. Volvé a cambiarla y guardala otra vez. Los productos, el nombre, la descripción y WhatsApp no deben alterarse.
7. Navegá con `Tab`: los radios, botones de demostración y botón de guardado deben mostrar foco visible.

## 10. Validación manual de la Fase 4

Estado: **completado manualmente el 2026-09-02**. Las pruebas, compilaciones, RLS, Storage y verificación HTTP local y pública aprobaron; el usuario confirmó que el flujo es funcional y navegable.

1. Esperá a que Cloudflare termine el despliegue de `main` y abrí `https://mipuesto-dev.mipuesto-app.workers.dev/login`.
2. Ingresá con tu cuenta y abrí **Catálogo**. En las herramientas del navegador fijá un ancho de **360 px** y comprobá que la marca MiPuesto, las tres opciones de navegación y **Salir** sean legibles, y que no exista desplazamiento horizontal.
3. Creá al menos seis categorías y una subcategoría. Comprobá que la lista muestre cinco categorías por página, que **Anterior** y **Siguiente** funcionen, y probá **Cambiar nombre** y **Eliminar categoría**.
4. Usá **Crear producto** y después **Crear el primer producto** si la lista está vacía. Ambos accesos deben llevarte al formulario y enfocar el nombre. Creá un producto con nombre, descripción, precio, categoría, subcategoría y **Controlar existencias**. Probá primero una cantidad mayor a cero y luego cero; el estado debe cambiar a **Agotado**.
5. Agregá cuatro fotografías JPEG, PNG o WebP menores de 5 MB. Deben verse las cuatro miniaturas y el indicador **4 de 4 fotografías**; no debe permitir una quinta.
6. Abrí el enlace público `https://mipuesto-dev.mipuesto-app.workers.dev/TU-SLUG` en una ventana privada. Confirmá el nombre, plantilla, paleta, categoría, subcategoría, producto, precio, foto y estado agotado.
7. Desde el panel usá **Ocultar** y recargá la ventana privada: el producto debe desaparecer de inmediato. Volvé a usar **Mostrar** y comprobá que reaparece.
8. Borrá una fotografía y confirmá que deja de verse. Si querés comprobarlo directamente, en Supabase abrí **Storage → productos** y verificá que esa ruta ya no exista.
9. Volvé a completar cuatro fotografías, anotá el identificador visible en la ruta de Storage y borrá el producto. En **Storage → productos**, la carpeta virtual de ese producto no debe contener ningún archivo.
10. Repetí una revisión breve del panel y del enlace público a un ancho de al menos **1280 px**. Navegá con `Tab` y verificá que todos los controles muestren foco visible.

Cuando todo esté correcto, respondé `Fase 4 validada`. Esa confirmación permite registrar el cierre; no se avanza a la Fase 5 antes de aprobar esta puerta manual.

## 11. Validación manual de la Fase 5

Estado: **auditorías automáticas completadas; recorrido visual y WhatsApp pendientes**.

1. Esperá a que Cloudflare termine el despliegue de `main`, ingresá al panel y abrí **Negocio**.
2. Elegí **Catálogo para mostrar**, guardá y abrí tu enlace público en una ventana privada. Debe mostrar productos, precios y fotografías sin botones para pedir.
3. Cambiá a **Pedidos o reservas por WhatsApp** y recargá el mismo enlace. Cada producto disponible debe mostrar **Pedir o agendar por WhatsApp**. Abrí uno en un celular y comprobá que el mensaje incluya negocio, producto y precio.
4. Cambiá a **Tienda con carrito**. Agregá dos productos, aumentá y disminuí cantidades, quitá uno y verificá el subtotal. **Continuar por WhatsApp** debe preparar un solo mensaje con las cantidades y el subtotal publicados.
5. En `https://mipuesto-dev.mipuesto-app.workers.dev/barberia-central` comprobá el estado cerrado de los datos seed: el aviso debe permitir navegar y el botón individual debe estar deshabilitado. En `tienda-kantuta`, el carrito puede prepararse, pero la confirmación queda deshabilitada mientras esté fuera del horario configurado.
6. Repetí los pasos a **360 px** y a un ancho mínimo de **1280 px**. No debe existir desplazamiento horizontal; recorré enlaces, botones y controles de cantidad con `Tab` y comprobá el foco visible.
7. Volvé a dejar tu negocio en la modalidad que realmente quieras usar. Cambiarla no debe alterar categorías, productos, fotografías, plantilla ni paleta.

La configuración visual de días e intervalos llegará en la Fase 7. En esta fase, los negocios seed permiten comprobar el aviso y las pruebas automáticas cubren los límites temporales. Cuando todo esté correcto, respondé `Fase 5 validada`.

## 12. Despliegue y validación manual de la Fase 6

Estado: **completado el 2026-09-03**. El usuario confirmó el recorrido funcional y navegable; los pasos siguientes quedan como procedimiento reproducible.

### 12.1 Configurar el secreto servidor

Estado: **completado el 2026-09-03**. Los pasos siguientes quedan como procedimiento reproducible.

Los pedidos usan una clave administrativa exclusivamente dentro del Worker para invocar las funciones transaccionales restringidas. Las variables públicas de Build no sustituyen este secreto de ejecución.

Opción recomendada, desde la raíz del proyecto y con los perfiles `supabase` y `mipuesto` ya autenticados:

```powershell
npm run cloudflare:secret:pedidos
```

El script obtiene la clave del proyecto Supabase enlazado y la entrega a Wrangler por la entrada estándar. No la muestra, no la escribe en `.env.local` y no la guarda en Git. Wrangler publicará una nueva versión del Worker al modificar el secreto.

Alternativa manual en el panel:

1. En Supabase abrí **Project Settings → API Keys** y copiá la clave `service_role` del proyecto `mipuesto-dev`. Nunca uses la Publishable para este paso.
2. En Cloudflare abrí **Workers & Pages → mipuesto-dev → Settings → Variables & Secrets**.
3. En **Runtime variables and secrets**, agregá un secreto cifrado llamado exactamente `SUPABASE_SERVICE_ROLE_KEY` y pegá la clave.
4. Guardá, cerrá la pantalla y verificá que el panel muestre solamente el nombre y un valor cifrado.

Para desarrollo local, si se necesita probar el pedido desde `npm run dev`, agregá la misma clave únicamente a `.env.local`:

```dotenv
SUPABASE_SERVICE_ROLE_KEY=tu_clave_privada
```

`.env.local` está ignorado por Git. No compartás su contenido en capturas, chat ni registros de terminal.

### 12.2 Validar el recorrido

1. Esperá el despliegue de `main`, ingresá al panel y abrí **Negocio**. Elegí **Horario programado**, marcá los días e intervalos, definí el tiempo de reserva y guardá. Probá también **Siempre abierto** y volvé al horario que usarás en la prueba.
2. En **Catálogo**, creá un producto con control de existencias y seleccioná sus fotografías dentro del mismo formulario. Debe crearse con sus imágenes; la ficha pública debe indicar cuántas unidades quedan.
3. Con al menos trece productos, comprobá que el panel muestre diez por página y el catálogo público doce. La portada debe aparecer antes del aviso y del selector de categoría. Cambiar de categoría debe volver a la primera página; después de agregar un artículo, **Ver pedido** debe verse como una acción flotante legible y llevar directamente al resumen.
4. Abrí el negocio de prueba configurado como **Tienda con carrito**, agregá dos productos con stock y confirmá la reserva. Debe mostrar código, total calculado por el servidor y hora de vencimiento en Bolivia antes de abrir WhatsApp.
5. Presioná dos veces o repetí la solicitud sin cambiar el carrito. Debe conservar el mismo pedido y no reservar unidades adicionales.
6. Abrí **Dashboard → Pedidos**. El pedido pendiente debe mostrar códigos de pedido y producto, cantidades, precios, vencimiento y datos opcionales del cliente.
7. Confirmá una venta y comprobá en **Catálogo** que las existencias físicas disminuyeron. La acción debe registrar quién confirmó y cuándo.
8. Creá otro pedido y cancelalo. Las existencias físicas deben conservarse y las unidades reservadas deben volver a estar disponibles.
9. Creá una tercera reserva y dejala vencer. El proceso automático puede tardar hasta cinco minutos después de la hora límite; luego debe aparecer como **Expirado** y liberar el stock.
10. Intentá crear un pedido cuando el negocio esté cerrado. El aviso debe ocupar una sola franja e indicar el horario de hoy o la próxima atención. El catálogo debe seguir navegable, conservar el carrito y no crear ninguna fila ni modificar inventario.
11. Repetí el recorrido principal a **360 px** y a un ancho mínimo de **1280 px**, sin desplazamiento horizontal y con foco visible mediante `Tab`.
12. Al terminar, ejecutá `npm run test:rls:linked` y respondé `Fase 6 validada`.

## 13. Validación manual de la Fase 7

Estado: **completado manualmente el 2026-09-03**. El usuario confirmó el recorrido funcional de promociones, precios transaccionales, identidad, reemplazo de imágenes y presentación adaptable.

Usá un negocio de prueba con al menos una categoría, un producto visible y existencias suficientes. Las pruebas siguientes modifican su presentación y precios, por lo que conviene anotar primero los valores que quieras restaurar.

1. Ingresá a `https://mipuesto-dev.mipuesto-app.workers.dev/dashboard/promociones`. Revisá la pantalla a **360 px** y a un ancho mínimo de **1280 px**; no debe existir desplazamiento horizontal y todos los controles deben mostrar foco visible con `Tab`.
2. Creá una promoción porcentual para una categoría y otra de monto fijo para un producto de esa categoría. Elegí valores que produzcan precios distintos. El ejemplo debe mostrar el resultado antes de guardar y el listado debe marcar ambas como **Vigente**.
3. Abrí el catálogo público en una ventana privada. El producto debe mostrar su precio anterior, el precio promocional y una sola oferta: la que deje el menor precio final. Pausá esa oferta desde el panel, recargá el catálogo y comprobá que se aplique la siguiente mejor; luego reactivala.
4. Creá una promoción temporal cuya finalización sea unos minutos posterior a la hora actual de Bolivia. Confirmá que se aplique antes del vencimiento y que desaparezca al recargar después de esa hora, sin editarla ni ejecutar tareas manuales.
5. En una tienda con carrito, reservá una unidad del producto promocionado. El resumen, WhatsApp y **Dashboard → Pedidos** deben conservar el mismo precio final calculado por el servidor y el total correcto. Cancelá el pedido de prueba para liberar la reserva.
6. Abrí **Dashboard → Catálogo**, cambiá el precio del producto y guardá. Su ficha administrativa debe indicar el precio anterior, la fecha en Bolivia y quién realizó el cambio.
7. Abrí **Dashboard → Negocio**. Cargá un logo, una portada y un QR de cobro JPEG, PNG o WebP. Guardá también uno o más enlaces sociales completos con `https://`. La previsualización debe actualizarse sin deformar las imágenes.
8. Abrí el catálogo público y comprobá portada, logo, descripción, redes y QR. Repetí una revisión breve con las plantillas Clásica, Moderna y Mínima; cada una debe mantener su composición propia.
9. Reemplazá sucesivamente el logo, la portada y el QR. En **Supabase → Storage → negocios**, cada tipo debe conservar solo el archivo vinculado actualmente. Después quitá el QR y comprobá que su archivo anterior también desaparezca.
10. Intentá guardar una red sin `https://`, un archivo que no sea imagen y una imagen mayor al límite indicado. El panel debe rechazarlos con un mensaje claro y conservar la configuración anterior.
11. Eliminá las promociones de prueba o dejá configuradas solamente las que realmente quieras usar. Restaurá también el precio del producto si era temporal.

Las auditorías automáticas aprobaron RLS, pertenencia de destinos promocionales, precios no negativos, cálculo transaccional, permisos y cero archivos huérfanos. La confirmación manual cerró la Fase 7 y habilitó el inicio formal de la Fase 8.

## 14. Validación manual de la Fase 8

Estado: **completado manualmente el 2026-09-03**. El usuario confirmó el recorrido funcional; además se incorporó y verificó en producción la descarga del QR de pago después de crear una reserva.

1. Esperá a que Cloudflare termine el despliegue de `main`. Abrí `https://mipuesto-dev.mipuesto-app.workers.dev/directorio` en una ventana privada y comprobá que aparezca tu negocio con portada, logo, modalidad y estado de atención. Un negocio inactivo no debe aparecer.
2. Desde **Dashboard → Negocio**, probá `Sin horario publicado`, `Siempre abierto` y un horario programado que cambie dentro de pocos minutos. El catálogo no debe mostrar badge en el primer modo; debe decir **Siempre abierto** en el segundo y **Abierto ahora · Cierra a las…** o **Cerrado · Abre…** en el tercero.
3. Al final de **Negocio**, comprobá el bloque **Código QR de tu catálogo**. Usá **Abrir catálogo público**, descargá el PNG y escanealo desde otro celular. Debe abrir el enlace de producción de tu negocio, no `localhost`.
4. Compartí el enlace del catálogo en un chat de WhatsApp. La vista previa debe mostrar el nombre del negocio, su descripción y una imagen PNG con su identidad o portada. Si WhatsApp conserva una vista anterior, compartí el enlace con un parámetro temporal como `?vista=1` para forzar una URL nueva durante la prueba.
5. Abrí el catálogo desde una ventana privada, interactuá con un producto y continuá a WhatsApp. Luego ingresá al panel y abrí **Resumen**. Las cifras de los últimos siete días deben reflejar visita, interacción y salida a WhatsApp; no deben mostrar nombres, teléfonos ni detalles del pedido.
6. Abrí `https://mipuesto-dev.mipuesto-app.workers.dev/negocio-que-no-existe`. Debe responder con la página **No encontramos este negocio**, ofrecer **Explorar negocios activos** y no mostrar un error técnico.
7. Desde las herramientas del navegador revisá `/manifest.webmanifest`: debe responder correctamente y permitir que el navegador reconozca MiPuesto como aplicación web. No es obligatorio instalarla para cerrar esta fase.
8. Repetí directorio, 404, catálogo, QR y resumen a **360 px** y a un ancho mínimo de **1280 px**. No debe haber desplazamiento horizontal y todos los enlaces y botones deben mostrar foco visible con `Tab`.
9. Comprobá que el catálogo siga creando reservas y abriendo WhatsApp como antes; la analítica no debe bloquear una compra aunque falle su registro silencioso.

La confirmación manual cerró la Fase 8 y habilitó la Fase 9. El commit final `da7b818` se publicó en la versión `8547dfdf-6501-4ad0-9902-eda8c8412d77` del Worker.

## Plantillas de correo: el enlace de un solo uso

**Comprobado el 2026-09-07 contra la API.** El enlace que Supabase manda por
omisión se consume en la primera visita: la segunda devuelve
`error_code=otp_expired`. Se reprodujo pidiendo el mismo enlace dos veces.

El problema práctico es que **la primera visita no siempre es la de la persona**.
Los antivirus de correo y las vistas previas de Gmail visitan los enlaces para
comprobar que no son peligrosos, y al hacerlo lo queman. La persona toca el
enlace, llega segunda, y recibe «venció» con un enlace de treinta segundos de
antigüedad abierto en el mismo teléfono.

### La corrección

Cambiar las plantillas para que el enlace **no se verifique al abrirse**, sino al
tocar un botón. La aplicación ya sabe recibir esta forma.

En la consola de Supabase, **Authentication → Email Templates**, reemplazar
`{{ .ConfirmationURL }}` por esta dirección en las plantillas **Reset Password**
e **Invite user**:

```
{{ .SiteURL }}/actualizar-clave?token_hash={{ .TokenHash }}&type=recovery
```

En la de invitación, `type=invite` en lugar de `type=recovery`.

Con eso, quien visite el enlace sin ser la persona no consume nada: la página
muestra un botón «Continuar» y el enlace se usa recién ahí.

**Mientras no se cambie**, la aplicación sigue aceptando la forma vieja y explica
el motivo real cuando falla, nombrando al antivirus del correo como causa más
probable.

### Verificado el 2026-09-07, con las plantillas ya cambiadas

Se comprobó el circuito completo contra producción, imitando lo que hace un
antivirus de correo:

1. Se visitó la página con el `token_hash`, **sin tocar el botón**: respondió 200
   y no consumió nada.
2. Después se verificó el mismo token, como hace el botón: **devolvió 200 con la
   sesión abierta**.

Con la forma anterior, el paso 1 quemaba el enlace y el paso 2 devolvía
`otp_expired`. El `Site URL` del proyecto apunta correctamente a la dirección de
producción, que es lo que `{{ .SiteURL }}` resuelve en las plantillas.

## Cuando el correo no llega

Comprobado el 2026-09-07: **Supabase acepta el pedido e intenta enviar.** El
`POST /auth/v1/recover` devuelve 200, y pedirlo de nuevo devuelve 429 con
«you can only request this after 22 seconds», que es el enfriamiento por
dirección. O sea: el fallo no está en la aplicación ni en el pedido, está en el
envío o en la plantilla.

### Dónde mirar, en orden

1. **Logs → Auth** en la consola de Supabase. Ahí aparece el error del servidor
   de correo tal cual, y es lo único que lo dice sin adivinar.
2. **Authentication → Emails → SMTP Settings.** Si es una clave de aplicación de
   Gmail, comprobar que siga viva: Google las revoca al cambiar la contraseña de
   la cuenta o al detectar actividad rara.
3. **La plantilla.** Los correos dejaron de llegar justo después de editarlas. Un
   error de sintaxis en el texto hace que el envío falle **después** de que el
   pedido se aceptó, que es exactamente el síntoma. Para descartarlo en un paso:
   volver una plantilla a su texto original y pedir un enlace. Si llega, el
   problema era esa edición.
4. **Correo no deseado**, incluida la pestaña de promociones de Gmail.

### Mientras tanto, nadie se queda afuera

```
npm run auth:enlace -- correo@delcliente.com
```

Genera el enlace para definir la contraseña **sin pasar por el correo** y lo
imprime en la terminal. Se le pasa a la persona por WhatsApp o como convenga.

Existe porque el correo es la parte más frágil del sistema y no depende de
nosotros: si el envío falla, el dueño de un negocio se queda afuera de su propio
panel sin nada que pueda hacer solo.

**Quien tenga ese enlace puede definir la contraseña de esa cuenta.** Vale lo
mismo que el correo: no se comparte en un grupo ni se deja pegado en ningún lado.
Sirve una vez, vence en una hora, e invalida cualquier enlace anterior.
