# Registro de avance y auditorías — MiPuesto

Este archivo conserva el estado verificable del proyecto. Se actualiza al iniciar y cerrar cada fase.

## Estado actual

- Fases completadas: **Fase 0 — Setup e infraestructura**, **Fase 1 — Sistema de diseño** y **Fase 2 — Autenticación y perfil de negocio**.
- Fase en curso: **Fase 3 — Sistema de plantillas**.
- Inicio de Fase 2: 2026-09-01.
- Cierre de Fase 2: 2026-09-02.
- Estado: **Fase 3 ampliada e implementada; pendiente de validación visual manual** en móvil y escritorio.
- Puerta de salida actual: pendiente de revisar las 12 combinaciones y confirmar que estructura y paleta persisten al recargar.

## Estado de Fase 3

- Inicio: 2026-09-02.
- Estado: **implementación y auditorías automáticas cumplidas; revisión manual pendiente**.
- Plan visual: `docs/PLAN-DISENO-FASE3.md`.
- Alcance: tres sistemas visuales completos, cuatro paletas combinables, demostración extensa y apariencia persistida desde el panel.
- Puerta de salida: las tres plantillas deben diferenciarse en composición, tipografía, navegación, botones e interacción; las cuatro paletas deben funcionar con cada una.

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| Plantilla clásica | Cumplido en código | Carta editorial con Georgia, encabezado centrado, navegación sobria, filas y acciones discretas. |
| Plantilla moderna | Cumplido en código | Vitrina de alto contraste con Arial, portada comercial, navegación horizontal, cuadrícula y acciones por producto. |
| Plantilla mínima | Cumplido en código | Directorio sereno con Trebuchet, horario y contacto prioritarios, navegación por secciones y recorrido vertical. |
| Cuatro paletas combinables | Cumplido en código | `mercado`, `tierra`, `oceano` y `noche` reasignan tokens semánticos sin cambiar componentes. Las 12 combinaciones son únicas y están cubiertas por prueba. |
| Contraste de paletas | Cumplido | `npm run test:contraste` valida texto, marca, acción, éxito y alerta, además de sus colores de contenido; todos superan 4,5:1. |
| Registro extensible y carga diferida | Cumplido | `lib/apariencia.ts` centraliza identificadores y metadatos; el panel carga dinámicamente solo la vista activa. |
| Datos por propiedades | Cumplido | Las tres variantes reciben exactamente los mismos productos y fotografías; los componentes de `components/templates/` no consultan la red ni la base. |
| Demostración completa | Cumplido en código | Cada variante incluye portada, categorías, fotografías, precios, acciones, horario, WhatsApp y cierre de pedido o consulta según su enfoque. |
| Selección persistida | Cumplido en código | `/dashboard/plantilla` combina estructura y paleta; `PATCH /api/negocios/plantilla` valida ambos identificadores y actualiza mediante la sesión autenticada. |
| Precios centralizados | Cumplido | `lib/precios.ts` concentra el formato en bolivianos y tiene cobertura unitaria. |
| HTML seguro | Cumplido | Todo texto se renderiza con React; no se usa HTML crudo. |
| Aislamiento multi-tenant | Cumplido | Dos usuarios temporales confirmaron que cada administrador puede cambiar su plantilla y paleta, pero no la apariencia de otro negocio. |
| Build | Cumplido | Next.js 16.3.4 y vinext compilaron; el control de secretos del bundle cliente aprobó. |
| Revisión visual a 360 px y escritorio | Pendiente manual | Recorrer las 12 combinaciones, guardar una opción, recargar y confirmar persistencia sin desbordamiento horizontal. |

## Estado de Fase 2

- Modelo de alta: solo por invitación; no existe registro público en la aplicación.
- Plan visual: `docs/PLAN-DISENO-FASE2.md`.
- Políticas y pruebas RLS: `docs/RLS-POLITICAS.md`.

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| Sesión SSR y protección del panel | Cumplido en código | `proxy.ts` renueva cookies y usa `getClaims()`; `/dashboard/configuracion` exige sesión válida. |
| Login, recuperación y nueva contraseña | Cumplido manualmente | Las rutas reciben URL y clave Publishable mediante un proveedor de cliente renderizado en servidor. La versión 17 del Worker responde HTTP 200 en `/actualizar-clave`, renderiza la configuración pública y sus bundles no conservan referencias de entorno sin resolver. El 2026-09-02 se solicitó recuperación para los correos de prueba, se abrió el enlace nuevo, se definió contraseña de 10 o más caracteres y se inició sesión correctamente. |
| Alta solo por invitación | Cumplido | `npm run auth:invitar -- correo@negocio.com` usa la CLI autenticada; `Allow new users to sign up` fue desactivado manualmente. |
| Perfil básico y validación servidor | Cumplido | Endpoint protegido validado con sesión real: HTTP 201; no acepta `admin_user_id` del navegador. |
| Slug | Cumplido | Formato, longitud y lista reservada se validan en interfaz, servidor y base; disponibilidad en vivo devuelve solo un booleano. |
| Aislamiento multi-tenant | Cumplido | La auditoría de cierre `npm run test:rls:linked` aprobó con 2 usuarios temporales, 7 tablas y función de slug aislados. El control del seed ahora identifica sus tres IDs base, por lo que sigue siendo válido al crear negocios reales. |
| Confirmación de correo | Cumplido remoto | La configuración pública informa `mailer_autoconfirm: false`; falta verificar el enlace real luego de SMTP. |
| Contraseña y rate limits | Cumplido | Confirmado manualmente: contraseña mínima de 10 caracteres, confirmación de correo y límites de Auth activos. |
| SMTP | Cumplido temporalmente; validación de flujo en curso | Gmail `app.mipuesto@gmail.com` con contraseña de aplicación envió una invitación de prueba. El timeout inicial se debió a un dígito incorrecto en esa contraseña. Ninguna credencial llegó al repositorio; antes de producción se migrará a Resend Free con dominio propio. |
| Despliegue de Fase 2 | Cumplido | `main` fue publicado automáticamente por Cloudflare; `/login` respondió HTTP 200 en la versión del Worker creada el 2026-09-02. |
| Revisión visual a 360 px y escritorio | Cumplido manualmente | El administrador confirmó navegación funcional y sin problemas visuales en móvil y escritorio el 2026-09-02. |

## Estado de Fase 1

- Inicio: 2026-09-01
- Cierre: 2026-09-01
- Estado: **cerrada** después de repetir las auditorías técnicas, visuales, de seguridad y RLS sobre la rama sincronizada con `main`.
- Alcance: tokens visuales, componentes base y página interna `/estilos`.
- Puerta de salida: aprobada; todos los componentes y estados están visibles en `/estilos`, los controles de accesibilidad se cumplen y la interfaz fue validada en móvil y escritorio.
- Plan visual: `docs/PLAN-DISENO.md`.

### Auditoría de Fase 1

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| Plan visual revisado contra prohibiciones | Cumplido | `docs/PLAN-DISENO.md` documenta paleta, tipografía, escalas, layout y correcciones. |
| Tokens sin valores visuales aislados | Cumplido | Tailwind 4 usa `@theme` en `app/globals.css`; los módulos consumen las variables mediante `@reference` y `npm run test:tokens` impide valores aislados. |
| Contraste de color | Cumplido | `npm run test:contraste`: pares normales y de foco entre 5,37:1 y 14,53:1. |
| Estados comprensibles sin color | Cumplido | Disponible, reservado, vendido y oculto combinan símbolo, forma y texto. |
| Foco visible y movimiento reducido | Cumplido | Doble anillo de foco con contraste en fondos claros y oscuros; Chromium confirmó `prefers-reduced-motion` con animaciones y transiciones efectivamente reducidas. |
| Siete componentes y sus estados en `/estilos` | Cumplido | HTTP 200; contenido de botones, campos, estados, modal, avisos, vacío y carga presente. |
| Revisión visual a 360 px y escritorio | Cumplido | Chromium Headless real validó 360 × 8000 y 1440 × 7000 px sin desbordamiento horizontal; capturas inspeccionadas, controles etiquetados, navegación por foco y cierre del modal con `Escape` aprobados. |
| Auditoría RLS al final de la fase | Cumplido | 7/7 tablas con RLS y políticas; seed e índices verificados de nuevo. |
| Build y verificaciones | Cumplido | Secretos de cliente, ESLint, TypeScript, Vitest, tokens, contraste, `npm audit`, build Next.js/vinext, dry-run, arranque del Worker, lint SQL y RLS aprobados. |

Commits de implementación: `e08d2b9`, `eafd11d`, `0659be1`, `06605f1`, `b69c57b` y `bd62717`.

## Decisiones registradas

### ADR-001 — Desarrollo local reproducible

- Se fija Node.js 22.23.1, compatible con Next.js 16.
- Las dependencias directas quedan fijadas sin rangos y se versiona `package-lock.json`.
- Supabase CLI se instala como dependencia de desarrollo del proyecto.

### ADR-002 — Clave pública de Supabase

- Se prefiere `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, recomendación vigente de Supabase.
- Se acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY` como compatibilidad temporal con el planning.
- La clave de rol de servicio nunca se expone con prefijo `NEXT_PUBLIC_`.

### ADR-003 — Cloudflare Pages y Next.js

- El planning indica Cloudflare Pages.
- La documentación vigente reserva Pages para exportaciones estáticas y dirige Next.js dinámico a Workers.
- MiPuesto requiere servidor para Auth, validación y recálculo de pedidos; no se fuerza una exportación estática.
- `vinext check` confirmó compatibilidad funcional: 2/2 imports, App Router, página, layout y Route Handler soportados; el único ajuste requerido era ESM.
- Se adopta vinext `1.0.0-beta.8` con Workers Cache, sin KV, Cloudflare Images ni funciones experimentales. Next.js estándar se conserva en paralelo mientras vinext permanezca beta.
- El Worker de desarrollo se llama `mipuesto-dev`, usa fecha de compatibilidad `2026-09-01`, `nodejs_compat` y observabilidad.
- Cloudflare usa una cuenta exclusiva de MiPuesto (`a558c055e89f45ad66d4de1ec1e31a2a`) y `wrangler.jsonc` fija su `account_id`; no se crearán D1 ni R2 porque esta fase usa Supabase Database y Storage.

### ADR-004 — Supabase remoto como entorno de desarrollo

- Docker se difiere porque la unidad C: tiene solo 2,9 GB libres.
- Se usará un proyecto remoto independiente llamado `mipuesto-dev`; nunca se reutilizará `yapabot-dev`.
- Región recomendada: São Paulo (`sa-east-1`), la opción disponible más cercana a Bolivia.
- El seed se permite solo en este proyecto de desarrollo. Producción no recibirá datos de prueba.
- Lint y la auditoría SQL remota se ejecutarán con `--linked` al final de cada fase.
- `supabase test db --linked` todavía requiere Docker para levantar el runner de pgTAP; mientras Docker siga diferido, `npm run test:rls:linked` valida las mismas invariantes directamente en la base remota y falla ante cualquier incumplimiento.

### ADR-005 — Sistema visual cerrado y protegido

- La paleta queda limitada a seis tokens semánticos y la tipografía usa la pila del sistema, sin descargas externas.
- Tailwind 4 define los tokens en `app/globals.css`; los módulos CSS los comparten mediante `@reference` para evitar duplicación y la inyección incorrecta de estilos globales.
- Los componentes base cubren sus estados interactivos y muestran foco de alto contraste en superficies claras y oscuras.
- `npm run test:tokens` y `npm run test:contraste` forman parte de la suite para impedir colores, tamaños, espaciados o combinaciones de contraste fuera del sistema.

### ADR-006 — Alta controlada de administradores

- MiPuesto vende suscripciones personalmente; por eso no se publicará un formulario de registro.
- Las cuentas se habilitan con `npm run auth:invitar -- correo@negocio.com`, que usa la sesión existente de Supabase CLI para obtener la clave administrativa solo durante el proceso local.
- El enlace de invitación lleva a `/actualizar-clave`; ahí el administrador define su contraseña y luego crea o edita un único negocio.
- La contraseña nunca pasa por código servidor propio durante el login o la recuperación; las operaciones de Auth se realizan con Supabase y la configuración del negocio se valida de nuevo en un Route Handler protegido.

### ADR-007 — Plantillas reutilizables antes del catálogo público

- Las variantes clásica, moderna y mínima reciben el mismo contrato de datos por propiedades y no realizan consultas propias.
- La vista de Fase 3 es privada y usa datos de demostración junto con el nombre, descripción y WhatsApp reales del negocio.
- Estructura y color se guardan por separado en `negocios.plantilla_id` y `negocios.paleta_id`; la base limita ambos conjuntos y RLS mantiene el aislamiento.
- Las cuatro paletas solo reasignan tokens semánticos y pueden combinarse con las tres plantillas sin duplicar la lógica del catálogo.
- El catálogo público por slug no se adelanta: se integrará con productos reales en la Fase 4.

## Auditoría de Fase 0

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| `.env.local` ignorado desde el primer commit | Cumplido | `git check-ignore -v .env.local` apunta a `.gitignore`. |
| No hay claves en el historial Git | Cumplido | No se encontraron asignaciones con valor ni JWT en archivos o historial. |
| Clave privilegiada ausente del cliente | Cumplido | El control revisa código y bundles cliente de Next/vinext; se ejecuta en lint, prebuild y postbuild de Workers. |
| RLS habilitado en todas las tablas | Cumplido | Auditoría remota: 7/7 tablas con RLS y políticas; permisos sensibles y función administrativa verificados. |
| Seed con tres modalidades | Cumplido | Auditoría remota: 3 negocios y las 3 modalidades presentes. |
| Build y pruebas locales | Cumplido | Next.js y vinext compilan; lint, TypeScript, Vitest, dry-run y chequeo de arranque pasaron el 2026-09-01. |
| Deploy de prueba | Cumplido | Workers Builds publicó automáticamente la versión `9a3b3322-d6cc-4c79-8b87-d9a963f22e65` con 100 % del tráfico; `https://mipuesto-dev.mipuesto-app.workers.dev` y el endpoint de salud respondieron HTTP 200. |
| Proyecto Supabase remoto independiente | Cumplido | `mipuesto-dev` (`afhnxjdqaruwccgsdxzb`) enlazado en `sa-east-1`; `yapabot-dev` permanece fuera de alcance. |
| Conexión de la aplicación | Cumplido | `.env.local` configurado; `/api/salud/supabase` respondió HTTP 200 con estado `ok`. |
| Asesores de Supabase | Cumplido con limitación | Sin errores. La única advertencia de seguridad restante es la protección de contraseñas filtradas, disponible desde el plan Pro. |

## Pendientes manuales previstos

- Docker queda opcional y diferido hasta disponer de más espacio en C:.
- Con autorización explícita, eliminar el Worker homónimo de la cuenta Tienda Blanco; se conserva por ahora como respaldo y no bloquea el cierre de la fase.

## Registro de verificaciones

### 2026-09-02

- Se amplió la Fase 3 a tres sistemas visuales completos y cuatro paletas combinables, para un total de 12 apariencias sin duplicar datos ni lógica.
- La migración `20260902142736_agregar_paleta_catalogo.sql` agregó `paleta_id`, su restricción de valores y lectura pública; fue aplicada al proyecto remoto de desarrollo.
- El selector guarda plantilla y paleta conjuntamente, permite modificarlas después y muestra una sola demostración extensa cargada de forma diferida.
- `npm run test` aprobó 37 pruebas; tokens y las cuatro paletas aprobaron contraste AA. ESLint, TypeScript, build de Next.js y build de vinext también aprobaron.
- `npm run db:lint:linked` no reportó errores y `npm run test:rls:linked` volvió a aprobar con 7 tablas y 2 usuarios, incluyendo aislamiento de plantilla y paleta.
- No había un navegador conectado en la sesión para automatizar la inspección. Queda pendiente revisar las 12 combinaciones a 360 px y escritorio, guardar una, recargar y confirmar persistencia.
- Se construyeron tres plantillas estructuralmente distintas con un contrato de datos común y sin consultas internas.
- El panel incorporó navegación compartida y `/dashboard/plantilla` con comparación, selección local y guardado explícito.
- La API valida el valor recibido, deriva el administrador de `getClaims()` y actualiza únicamente mediante RLS.
- `npm run lint`, `npm run typecheck` y `npm run test` aprobaron; 25 pruebas cubren contraste, tokens, perfil, precios y variantes permitidas.
- `npm run build` y `npm run build:vinext` aprobaron e incluyeron el panel y la API de plantillas.
- El Worker local confirmó protección anónima: 307 hacia `/login?motivo=sesion` y 401 en el API.
- `npm run db:lint:linked` aprobó sin errores; `npm run test:rls:linked` aprobó con 7 tablas, 2 usuarios temporales y aislamiento de plantillas.
- Se corrigió el alcance visual para que las tres variantes incluyan las mismas fotografías de producto. Las imágenes demostrativas se generaron sin marcas ni texto y se optimizaron a WebP antes de incorporarlas.
- La plantilla clásica usa miniaturas laterales, la moderna imágenes dominantes y la mínima imágenes compactas; solo cambia la presentación, no el contenido.
- Queda pendiente la confirmación manual a 360 px y escritorio, además de guardar y recargar una selección.

### 2026-09-01

- Node.js `22.23.1`, npm `10.9.8` y Supabase CLI `2.116.0` detectados.
- Dependencias directas fijadas; `npm audit` informó 0 vulnerabilidades.
- ESLint y TypeScript se ajustaron a versiones compatibles con el toolchain de Next.js.
- `npm run lint`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run test`: aprobado, todavía sin pruebas unitarias de lógica de negocio.
- `npm run build`: aprobado; `/` estática y `/api/salud/supabase` dinámica.
- `npx supabase start`: bloqueado porque Docker/Podman no está instalado.
- Verificación HTTP local: `/` respondió 200; salud de Supabase respondió 503 `sin_configurar`, como corresponde sin `.env.local`.
- Next.js 16 añadió a `AGENTS.md` su bloque administrado sin alterar las reglas originales; se conserva para usar documentación versionada.
- Commits: `21391e9` (base Next.js), `faeb0f7` (esquema y RLS), `cc2c558` (registro y pasos manuales).
- Se detectó `yapabot-dev` en la cuenta Supabase y se dejó explícitamente fuera del alcance.
- La migración se adaptó al cambio de Data API de 2026 con permisos explícitos para `anon`, `authenticated` y `service_role`.
- `mipuesto-dev` quedó enlazado y recibió las migraciones `20260901085203` y `20260901143000`, además del seed idempotente.
- `npm run db:lint:linked`: aprobado, sin errores de esquema.
- `npm run test:rls:linked`: aprobado; 7 tablas con RLS, 7 con políticas, 6 índices de FK agregados, 3 negocios y 3 modalidades.
- Los asesores dejaron de reportar claves foráneas sin índice y funciones `SECURITY DEFINER` expuestas.
- Tipos TypeScript generados desde el esquema remoto e integrados en los clientes de navegador y servidor.
- Validación posterior al enlace: secretos de cliente, ESLint, TypeScript, Vitest y build aprobados.
- Conexión real desde Next.js validada: `GET /api/salud/supabase` respondió HTTP 200 con `{"estado":"ok","servicio":"supabase"}`; la clave de servicio permanece vacía.
- Repositorio GitHub vinculado y ramas `main` y `fase-1-sistema-diseno` publicadas sin `.env.local` ni secretos.
- `vinext check`: el informe inicial fue 89 % por faltar ESM; después de `vinext init`, la comprobación final alcanzó 100 % (8 soportados, 0 parciales, 0 problemas).
- `npm run build:vinext`: aprobado; el control posterior confirmó que el bundle cliente no contiene la clave privilegiada.
- Worker local: `/` respondió HTTP 200 y `/api/salud/supabase` respondió HTTP 200 con estado `ok`.
- `wrangler deploy --dry-run`: aprobado; 928 KiB totales y 266,65 KiB comprimidos.
- `wrangler check startup`: aprobado; 74,2 ms de CPU activa en la medición local.
- Auditoría final repetida: lint, TypeScript, Vitest, build Next.js, build vinext, DB lint y RLS remoto aprobados.
- Primer despliegue real completado en `https://mipuesto-dev.tienda-blanco.workers.dev`; portada y salud de Supabase respondieron HTTP 200.
- Se cargaron en runtime únicamente `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; ninguna clave de servicio fue enviada a Cloudflare.
- El perfil Wrangler `mipuesto` se verificó contra la cuenta exclusiva `a558c055e89f45ad66d4de1ec1e31a2a` y el proyecto quedó fijado a esa cuenta mediante `account_id`.
- El dry-run y el chequeo de arranque volvieron a aprobarse con el artefacto fijado a la cuenta nueva; la medición local registró 81,5 ms de CPU activa.
- Despliegue independiente completado en `https://mipuesto-dev.mipuesto-app.workers.dev` (versión `6eec2426-2fe9-41a4-86a6-fa9b32c14cb8`); `/` y `/api/salud/supabase` respondieron HTTP 200.
- En la cuenta nueva se cargaron solamente `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. El Worker de Tienda Blanco no se modificó y queda como respaldo hasta autorizar su eliminación.
- El primer intento de Workers Builds detectó dos errores de configuración: el comando de deploy tenía un separador incorrecto y las variables públicas de Supabase no estaban disponibles durante el build. Ambos se corrigieron sin exponer claves en Git.
- Workers Builds publicó correctamente el commit `06c7627` mediante el build `2f82476f-5794-4a79-bd59-b22807cb40b4`; la versión `9a3b3322-d6cc-4c79-8b87-d9a963f22e65` recibió el 100 % del tráfico.
- La versión automática conserva únicamente los bindings `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, además de Assets; no contiene una clave de servicio.
- Verificación pública final: `/` respondió HTTP 200 y `/api/salud/supabase` respondió HTTP 200 con `{"estado":"ok","servicio":"supabase"}`.
- Auditoría de cierre: secretos de cliente, ESLint, TypeScript, Vitest, build de Next.js, build y dry-run de vinext, arranque del Worker, DB lint, RLS remoto y `npm audit` aprobados. La suite Vitest todavía no contiene casos de lógica de negocio, que se incorporarán en las fases correspondientes.
- Resultado RLS de cierre: 7/7 tablas con RLS, 7/7 con políticas, 6 índices de claves foráneas, 3 negocios seed y las 3 modalidades esperadas.
- **Fase 0 cerrada** el 2026-09-01. Docker continúa diferido y el Worker de Tienda Blanco queda fuera del alcance hasta recibir autorización explícita para eliminarlo.
- Fase 1 se rebasó sobre el cierre de Fase 0 mediante el merge `f70a421`; no quedaron conflictos pendientes ni cambios sin versionar.
- El sistema visual corrigió el foco para fondos claros y oscuros e incorporó auditorías automáticas de tokens y contraste.
- La compatibilidad de Tailwind 4 con módulos CSS se corrigió usando `@reference`; `/estilos` volvió a compilar y responder correctamente.
- Revisión visual automatizada aprobada en Chromium Headless a 360 px y 1440 px: sin desbordamiento horizontal, nueve secciones presentes, campos y botones con nombre accesible, foco visible, modal con foco inicial y cierre mediante `Escape`.
- Con movimiento reducido activo, Chromium reportó animaciones y transiciones de `0,00001 s`, sin movimiento perceptible.
- Auditoría técnica final de Fase 1: secretos de cliente, ESLint, TypeScript, Vitest, tokens, contraste, `npm audit`, build Next.js, build y dry-run vinext, arranque del Worker, lint SQL y RLS remoto aprobados.
- Resultado RLS repetido al cierre: 7/7 tablas con RLS, 7/7 con políticas, 6 índices de claves foráneas, 3 negocios seed y las 3 modalidades esperadas.
- **Fase 1 cerrada** el 2026-09-01; queda habilitado iniciar la Fase 2.
