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
5. Si el resultado es correcto, aplicá migración y seed con `npm run supabase:push:dev`.
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
5. Las dos variables de Supabase ya están cargadas en **Settings → Variables & Secrets** del Worker. Agregá allí únicamente `NEXT_PUBLIC_SITE_URL` con la URL anterior. No agregués `SUPABASE_SERVICE_ROLE_KEY`: no se usa en esta fase.
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

La CLI ya enlazada solicita la clave administrativa solo en memoria. No copies `SUPABASE_SERVICE_ROLE_KEY` a `.env.local`, Cloudflare ni Git.

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

Estado: **pendiente**. La implementación, pruebas, compilaciones y auditoría RLS están aprobadas; falta la confirmación visual del administrador.

1. Con `npm run dev` abierto, ingresá a `http://localhost:3000/dashboard/plantilla`.
2. Revisá la pantalla a **360 px** y a al menos **1280 px**. No debe aparecer desplazamiento horizontal.
3. Elegí sucesivamente Clásica, Moderna y Mínima. Deben cambiar composición, tipografía, navegación, botones y recorrido, manteniendo los mismos productos y fotografías.
4. En cada plantilla probá Mercado, Tierra, Océano y Noche. Las 12 combinaciones deben conservar texto y controles legibles.
5. Guardá una combinación distinta de la inicial, recargá la página y confirmá que ambas selecciones permanecen.
6. Volvé a cambiarla y guardala otra vez. Los productos, el nombre, la descripción y WhatsApp no deben alterarse.
7. Navegá con `Tab`: los radios, botones de demostración y botón de guardado deben mostrar foco visible.
