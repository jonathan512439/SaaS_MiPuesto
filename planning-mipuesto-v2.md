# Planning de desarrollo — MiPuesto (v2)

Planning ejecutable para construir MiPuesto de punta a punta con Codex, dividido en fases pequeñas y verificables. Cada fase está pensada para dársela a Codex como una tarea independiente — no le pegues el documento entero de una vez.

**Cambios respecto a la v1:** se agregó una fase de diseño previa al código (Fase 1), el documento `DESIGN.md` como fuente de verdad visual, y se cubrieron vacíos detectados en la revisión: recuperación de contraseña, borrado de imágenes huérfanas, límites de subida, manejo de slug duplicado, seed de datos de prueba, personalización independiente de plantilla y paleta, control de pedidos por horario, y qué pasa cuando un negocio se da de baja.

## 0. Cómo trabajar esto con Codex

- **Antes de la Fase 0, poné dos archivos en la raíz del repo:** `AGENTS.md` (sección 9 de este documento) y `DESIGN.md` (documento aparte). Codex lee `AGENTS.md` automáticamente antes de tocar código; `AGENTS.md` a su vez le ordena leer `DESIGN.md` antes de escribir interfaz.
- **Trabajá fase por fase, no todo junto.** Dale a Codex una fase completa como prompt, revisá el diff, corré la app, hacé commit, recién ahí pasá a la siguiente.
- **Cada tarea trae su criterio de aceptación** — copialo tal cual dentro del prompt para que Codex sepa cuándo una tarea está realmente terminada, no solo "parece que funciona".
- **Una rama de git por fase.** Si algo sale mal, revertís la fase completa sin arrastrar las demás.
- **No avances de fase si la anterior no compila y corre.**

## 1. Resumen del producto (contexto para Codex)

MiPuesto es un SaaS donde negocios locales (restaurantes, tiendas, dentistas, barberías) tienen un catálogo digital propio, con pedidos que se cierran por WhatsApp. Cada negocio elige una de tres modalidades: catálogo estático (solo mostrar), catálogo con botón de pedir/agendar por producto, o tienda virtual completa con carrito y reserva temporal de inventario. La suscripción se vende de forma personal y directa (sin registro de autoservicio ni pasarela de pago). Dominio: `mipuesto.com`. Moneda: bolivianos (Bs). Zona horaria de referencia: `America/La_Paz`.

## 2. Stack tecnológico definitivo

| Capa | Elección | Motivo |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | Documentación amplia, Codex lo maneja bien |
| Estilos | Tailwind, con tokens propios definidos en `DESIGN.md` | Los defaults de Tailwind no se usan tal cual (ver DESIGN.md) |
| Backend + DB + Auth + Storage | Supabase (plan free) | Un solo proveedor para todo simplifica la integración |
| Hosting | Cloudflare Pages | Gratis y permite uso comercial (a diferencia del plan Hobby de Vercel) |
| Tareas programadas | Supabase Edge Functions + `pg_cron` | Incluido en el plan free |
| Dominio | mipuesto.com | Ya decidido |

**Nota sobre almacenamiento:** se arranca con Supabase Storage (~1 GB gratis) en vez de Cloudflare R2, para no sumar un segundo proveedor mientras el catálogo es chico. Cuando el negocio 40-50 esté cerca del límite, ahí migramos a R2 (10 GB gratis) — no antes.

## 3. Modelo de datos (SQL para las migraciones de Supabase)

```sql
create table negocios (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) not null,
  slug text unique not null,
  nombre text not null,
  descripcion text,
  tipo_negocio text not null check (tipo_negocio in ('catalogo_estatico','catalogo_cta','tienda_virtual')),
  logo_url text,
  portada_url text,
  telefono_whatsapp text not null,
  redes_sociales jsonb default '{}',
  horario jsonb not null default '{"modo":"sin_horario","dias":{}}',
  qr_pago_url text,
  plantilla_id text not null default 'clasica' check (plantilla_id in ('clasica','moderna','minimal')),
  paleta_id text not null default 'mercado' check (paleta_id in ('mercado','tierra','oceano','noche')),
  reserva_minutos int default 45,
  verificado boolean default false,
  activo boolean default true,
  creado_en timestamptz default now()
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id) on delete cascade,
  nombre text not null,
  orden int default 0
);

create table subcategorias (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references categorias(id) on delete cascade,
  nombre text not null,
  orden int default 0
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id) on delete cascade,
  categoria_id uuid references categorias(id) on delete set null,
  subcategoria_id uuid references subcategorias(id) on delete set null,
  nombre text not null,
  descripcion text,
  precio numeric(10,2) not null check (precio >= 0),
  fotos text[] default '{}',
  controla_stock boolean default false,
  cantidad_stock int,
  visible boolean default true,
  estado text not null default 'disponible' check (estado in ('disponible','reservado','vendido','agotado')),
  reservado_hasta timestamptz,
  orden int default 0,
  creado_en timestamptz default now()
);

create table promociones (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id) on delete cascade,
  tipo text not null check (tipo in ('porcentaje','monto_fijo')),
  valor numeric(10,2) not null check (valor > 0),
  producto_id uuid references productos(id) on delete cascade,
  categoria_id uuid references categorias(id) on delete cascade,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  activo boolean default true
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id) on delete cascade,
  cliente_nombre text,
  cliente_telefono text,
  items jsonb not null,
  total numeric(10,2) not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','confirmado','cancelado','expirado')),
  creado_en timestamptz default now(),
  expira_en timestamptz
);

create table eventos_analitica (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id) on delete cascade,
  tipo text not null check (tipo in ('vista_catalogo','clic_whatsapp','clic_producto')),
  producto_id uuid references productos(id) on delete set null,
  creado_en timestamptz default now()
);

create index idx_productos_negocio on productos(negocio_id);
create index idx_pedidos_pendientes on pedidos(estado, expira_en) where estado = 'pendiente';
create index idx_analitica_negocio_fecha on eventos_analitica(negocio_id, creado_en);
```

**Notas del modelo (corregidas respecto a la v1):**
- `on delete set null` en las referencias de producto a categoría: borrar una categoría no debe borrar los productos que contenía. El producto queda sin categoría y el admin lo reasigna.
- `reserva_minutos` ahora vive en la tabla `negocios`, no solo como variable de entorno — cada negocio puede tener su propio tiempo de reserva.
- `plantilla_id` y `paleta_id` se guardan por separado: la plantilla controla estructura y componentes; la paleta cambia solo los tokens cromáticos. Esta separación permite sumar opciones después sin modificar productos ni pedidos.
- `horario` usa un contrato explícito: `sin_horario` no muestra estado ni restringe pedidos; `siempre_abierto` informa disponibilidad permanente; `programado` guarda intervalos por día y se evalúa en `America/La_Paz`. Todo cambio del contrato requiere una migración versionada y validación de servidor.
- Los `items` de un pedido guardan **el precio al momento de la compra**, no una referencia al producto. Si el admin cambia el precio después, el pedido histórico no se altera.
- Índices incluidos desde el inicio: el de pedidos pendientes es el que usa el job de expiración cada pocos minutos.

**Row Level Security:** todas las tablas la necesitan. Cada admin solo lee/escribe filas cuyo `negocio_id` corresponda a un negocio con su propio `admin_user_id`. El catálogo público se lee sin autenticación pero solo de negocios con `activo = true`. `eventos_analitica` permite `insert` anónimo pero **no** `select` anónimo.

## 4. Estructura de carpetas del proyecto

```
mipuesto/
├── AGENTS.md
├── DESIGN.md
├── app/
│   ├── (public)/
│   │   ├── [slug]/page.tsx            # perfil público del negocio
│   │   └── directorio/page.tsx        # directorio de negocios afiliados
│   ├── (admin)/
│   │   └── dashboard/
│   │       ├── page.tsx
│   │       ├── productos/
│   │       ├── categorias/
│   │       ├── promociones/
│   │       ├── pedidos/
│   │       └── configuracion/
│   ├── login/page.tsx
│   ├── recuperar-clave/page.tsx
│   └── layout.tsx
├── components/
│   ├── templates/                     # plantillas predefinidas del catálogo
│   │   ├── clasica/
│   │   ├── moderna/
│   │   └── minimal/
│   ├── carrito/
│   └── ui/                            # componentes base según DESIGN.md
├── lib/
│   ├── apariencia.ts                  # registro de plantillas, paletas y tokens permitidos
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── whatsapp.ts                    # generador de link wa.me con el pedido
│   ├── horario.ts                     # lógica de abierto/cerrado
│   ├── precios.ts                     # formato Bs y cálculo de promociones
│   ├── imagenes.ts                    # compresión y validación previa a subir
│   └── reservas.ts
├── supabase/
│   ├── migrations/
│   ├── seed.sql                       # datos de prueba: 3 negocios, uno por modalidad
│   └── functions/
│       ├── expirar-reservas/
│       └── ping-keepalive/
└── public/
```

## 5. Fases de desarrollo

### Fase 0 — Setup e infraestructura
- Crear proyecto Next.js (App Router, TypeScript, Tailwind)
- Crear proyecto en Supabase, correr las migraciones de la sección 3, activar RLS en todas las tablas
- Crear `supabase/seed.sql` con 3 negocios de prueba (uno por modalidad), con categorías y productos, para poder probar sin cargar datos a mano en cada fase
- Conectar el repo a Cloudflare Pages (build y deploy automático en cada push)
- Variables de entorno configuradas en local y en Cloudflare Pages (sección 7)
- **Criterio de aceptación:** el proyecto compila, hace deploy a una URL de prueba de Cloudflare Pages, la app se conecta a Supabase sin errores en consola, y `seed.sql` deja la base con datos navegables.

### Fase 1 — Sistema de diseño (antes de cualquier pantalla)
Esta fase es nueva y **no se salta**. Construir pantallas sin un sistema de tokens definido es lo que produce interfaces genéricas y obliga a rehacer todo después.

- Leer `DESIGN.md` completo
- Escribir un plan de diseño corto: paleta (4-6 hex con nombre y rol), tipografías por rol, escala tipográfica, escala de espaciado, concepto de layout
- Revisar ese plan contra la lista de prohibiciones de `DESIGN.md` sección 3, corregir lo que sea un default genérico y documentar qué se cambió y por qué
- Recién entonces implementar los tokens en la configuración de Tailwind y construir los componentes base en `components/ui/`: botón (con sus variantes y estados), campo de formulario, indicador de estado, hoja modal, toast, estado vacío, esqueleto de carga
- **Criterio de aceptación:** existe una página interna `/estilos` que muestra todos los componentes base en todos sus estados, y ninguna pantalla posterior introduce colores, tamaños de fuente o espaciados fuera del sistema de tokens.

### Fase 2 — Autenticación y perfil de negocio
- Login de admin con Supabase Auth (email + contraseña)
- **Recuperación de contraseña por email** (faltaba en la v1 — sin esto, cada olvido de clave lo tenés que resolver vos a mano en Supabase)
- Al crear un negocio, queda vinculado al `admin_user_id` del usuario logueado
- Formulario de configuración básica: nombre, slug, descripción, tipo_negocio, WhatsApp
- **Validación de slug**: solo minúsculas, números y guiones; verificación de disponibilidad en vivo; lista de slugs reservados (`admin`, `api`, `directorio`, `login`, `estilos`) que no se pueden usar
- Políticas RLS probadas con dos cuentas distintas
- **Criterio de aceptación:** un admin puede registrarse, recuperar su clave, crear su negocio, y ese negocio no es visible ni editable desde la sesión de otro admin (verificado explícitamente, no asumido).

### Fase 3 — Sistema de plantillas
- Construir las tres plantillas (`clasica`, `moderna`, `minimal`) **diferenciadas en estructura, no solo en color** — ver `DESIGN.md` sección 5, donde cada una nace de un rubro real
- Cada plantilla debe ser un sistema visual completo: composición, encabezado, navegación, jerarquía tipográfica, tratamiento de fotografías, categorías, productos, precios, botones, estados y acciones. Puede usar una familia tipográfica predefinida distinta, respetando un máximo de dos familias dentro de cada plantilla
- Mantener exactamente los mismos datos y fotografías al comparar variantes; solo cambia el sistema visual
- Crear cuatro paletas predefinidas e independientes de la plantilla (`mercado`, `tierra`, `oceano`, `noche`). Cada paleta define tokens semánticos de superficie, texto, marca, acción, éxito, alerta y borde, con contraste accesible. No se aceptan colores arbitrarios escritos por el cliente
- Actualizar `DESIGN.md` antes de implementar las paletas para documentar los tokens permitidos del catálogo sin alterar la identidad visual del panel administrativo
- Selector combinado de plantilla y paleta en el panel, con guardado independiente y posibilidad de cambiarlas posteriormente sin perder contenido
- Ampliar la demostración para simular la experiencia pública completa: portada, navegación por categorías, fotografías, lista o cuadrícula de productos, precios, botones, estado de horario, acceso a WhatsApp y resumen de carrito cuando corresponda
- Cargar en el catálogo público solo la plantilla y paleta seleccionadas; las vistas comparativas del panel se cargan de forma diferida para que sumar opciones no aumente innecesariamente el peso inicial
- Implementar un registro extensible de plantillas y paletas por identificador, para poder agregar nuevas opciones en versiones futuras sin modificar las existentes
- **Criterio de aceptación:** las tres plantillas con los mismos datos se distinguen claramente en estructura, tipografía, componentes e interacción; las cuatro paletas funcionan con cada plantilla (12 combinaciones), mantienen contraste accesible, persisten al recargar y pueden cambiarse sin alterar productos ni configuración del negocio.

### Fase 4 — Catálogo: categorías, subcategorías y productos
- CRUD de categorías y subcategorías (crear, editar, reordenar, borrar)
- CRUD de productos: nombre, descripción, precio, hasta 4 fotos, categoría/subcategoría, `controla_stock`
- **Manejo de imágenes completo** (ampliado respecto a la v1): compresión y redimensionado en el cliente antes de subir; validación de tipo y peso máximo (rechazar >5 MB antes de comprimir); **borrado del archivo en Storage cuando se borra el producto o se reemplaza la foto** — si no, el gigabyte gratuito se llena de imágenes huérfanas que nadie ve
- Toggle rápido de `visible` desde la lista, sin abrir el formulario completo
- Vista pública del catálogo agrupado por categoría/subcategoría
- **Criterio de aceptación:** un producto marcado como no visible desaparece del catálogo público de inmediato; y al borrar un producto con 4 fotos, esas 4 fotos ya no existen en Storage.

### Fase 5 — Las tres modalidades de tienda
- Renderizado condicional según `tipo_negocio`: sin botones de acción (estático), botón "Pedir" o "Agendar por WhatsApp" por producto (CTA), o carrito completo (tienda virtual)
- El botón CTA individual genera un link `wa.me` con el producto o servicio elegido
- Calcular el estado de atención con una única función en `lib/horario.ts`, usando `America/La_Paz`, intervalos por día y soporte para horarios que cruzan medianoche
- Cuando un negocio con horario `programado` esté cerrado, mostrar un aviso discreto y persistente cerca de las acciones: el cliente puede navegar normalmente, pero los botones de pedir o agendar quedan deshabilitados. `sin_horario` no muestra aviso ni restringe; `siempre_abierto` mantiene las acciones disponibles
- Pruebas automáticas obligatorias para los tres modos, límites exactos de apertura y cierre, cambio de día, intervalos que cruzan medianoche y horarios inválidos
- **Criterio de aceptación:** cambiar el `tipo_negocio` modifica el comportamiento del catálogo sin tocar código; al simular una hora cerrada, el catálogo continúa navegable, muestra el aviso y no permite iniciar un pedido o agendamiento.

### Fase 6 — Carrito, reserva temporal y pedido por WhatsApp
- Carrito en memoria (estado del cliente, sin cuenta ni login del comprador)
- Navegación escalable del catálogo: selector de categoría, doce productos por página y acceso fijo al resumen cuando el carrito tiene artículos; el panel muestra diez productos por página
- Permitir seleccionar y preparar hasta cuatro fotografías durante el alta del producto, sin eliminar la gestión posterior de imágenes
- Mostrar en cada producto con control de stock las unidades realmente disponibles (`cantidad_stock - cantidad_reservada`); no mostrar cantidades ficticias en productos sin control
- Al enviar el pedido: crear fila en `pedidos` con estado `pendiente`, reservar únicamente la cantidad solicitada de los productos con `controla_stock = true` y generar el link `wa.me` con el detalle consolidado
- Cada producto tiene un código estable y cada pedido o reserva recibe un código visible para identificarlo en WhatsApp y en el panel
- Fuera del horario `programado`, permitir revisar productos y preparar el carrito, pero deshabilitar la confirmación. El servidor vuelve a evaluar el horario antes de crear el pedido: si está cerrado responde un error controlado, no crea la fila, no reserva inventario y no genera el enlace de WhatsApp
- **Productos con `controla_stock = false` nunca se reservan** — siempre quedan disponibles (un café no se agota como un producto único)
- Mostrar el QR de cobro del negocio antes de enviar el pedido, si está configurado
- Proceso programado `expirar-reservas` (cada 5-10 min): pedidos `pendiente` con `expira_en` vencido pasan a `expirado` y las cantidades reservadas vuelven a estar disponibles. Debe ser transaccional e idempotente; puede ejecutarse directamente con Supabase Cron para evitar una llamada intermedia innecesaria
- Panel de pedidos con estados `pendiente`, `confirmado`, `cancelado` y `expirado`, además de las acciones "Confirmar venta" y "Cancelar"
- Auditoría mínima del pedido: quién confirmó o canceló, cuándo lo hizo y copia inmutable de códigos, cantidades y precios usados al reservar
- Configuración administrativa de los tres modos de horario y del tiempo de reserva, validada tanto en el cliente como en el servidor. Se adelanta desde la Fase 7 porque es necesaria para probar el cierre por horario y la expiración real de esta fase
- **Criterio de aceptación:** el administrador puede configurar horario y duración; un pedido no confirmado libera automáticamente sus productos al vencer el plazo; además, un intento fuera del horario programado se rechaza tanto en la interfaz como en el servidor y no modifica pedidos ni inventario.

### Fase 7 — Panel de administración completo
- Promociones: descuento por % o monto fijo, sobre un producto o una categoría entera, con vencimiento opcional; el precio con descuento se refleja en el catálogo
- **Toda la lógica de precios y promociones vive en `lib/precios.ts`**, en un solo lugar — no repartida entre componentes, o vas a tener el mismo producto con dos precios distintos en dos pantallas
- Completar la identidad y presencia de la tienda: foto de perfil o logo, portada, descripción, redes sociales y QR de cobro. Horario y tiempo de reserva ya quedan disponibles desde el cierre de la Fase 6
- Historial de cambios de precio de productos y registro de activaciones o desactivaciones del negocio, con usuario, fecha y valor anterior
- **Criterio de aceptación:** una promoción vencida deja de aplicarse automáticamente; el administrador puede configurar y reemplazar la identidad visual y los datos complementarios sin dejar archivos huérfanos ni alterar productos o pedidos.

### Fase 8 — Funciones de plataforma
- Badge "Abierto ahora / Cierra a las… / Abre el…" calculado desde el `horario`, en zona horaria `America/La_Paz`; no se muestra en `sin_horario` y usa "Siempre abierto" en ese modo
- Código QR del negocio, generado en el navegador (sin servicio externo)
- Metadatos Open Graph dinámicos por negocio
- Directorio público (`/directorio`) con los negocios `activo = true`
- Registro de eventos en `eventos_analitica` y resumen semanal en el panel
- Manifest de PWA
- **Página 404 propia** para slugs que no existen o negocios dados de baja — con enlace al directorio, no la pantalla de error por defecto
- **Criterio de aceptación:** compartir el link de un negocio en WhatsApp muestra vista previa con imagen y descripción; y entrar a un slug inexistente muestra una página útil, no un error crudo.

### Fase 9 — Testing, deploy y dominio
- Recorrido completo con un negocio real de tus contactos: crear, cargar catálogo, pedido de prueba, confirmación
- Conectar `mipuesto.com` a Cloudflare Pages, verificar SSL
- Edge Function `ping-keepalive` + cron externo gratuito, para que el proyecto de Supabase no se pause por inactividad
- Checklist final: RLS probado con dos negocios; imágenes cargando y borrándose correctamente; las 12 combinaciones de plantilla y paleta revisadas a 360 px; reservas expirando; horarios probados en apertura, cierre, cambio de día y cruce de medianoche; pedido fuera de horario rechazado sin reservar inventario; mensaje de WhatsApp bien formado **en un celular real**, no solo en el navegador
- **Criterio de aceptación:** un negocio piloto opera una semana completa sin que tengas que tocar la base de datos a mano.

## 6. Qué pasa cuando un negocio deja de pagar

Vacío detectado en la v1. Como el cobro es manual, necesitás poder cortar el acceso sin borrar datos:

- Poner `activo = false` saca al negocio del directorio y su catálogo público muestra una página neutra ("Este catálogo no está disponible por el momento")
- El admin **sigue pudiendo entrar a su panel y ver sus datos**, pero no publicar — así, si vuelve a pagar, reactivar es cambiar un booleano, no recargar todo el catálogo
- Nunca borrar datos de un negocio inactivo de forma automática

## 7. Variables de entorno

| Variable | Dónde se usa |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor y Edge Functions — nunca en el bundle del cliente |
| `NEXT_PUBLIC_SITE_URL` | URLs absolutas (Open Graph, QR) |

## 8. Riesgos técnicos a vigilar

- **RLS mal configurado es el riesgo más caro.** Un negocio viendo datos de otro no es un bug cosmético — probalo con dos cuentas antes de cerrar la Fase 2.
- **Imágenes huérfanas en Storage.** Sin borrado al eliminar/reemplazar, el gigabyte gratis se llena de archivos invisibles.
- **Compresión en el cliente, no en el servidor.** Cloudflare Pages tiene límites de tamaño de request; comprimir antes de subir evita el problema y ahorra cuota.
- **Zonas horarias.** Guardá todo en UTC y convertí a `America/La_Paz` solo al mostrar, o el badge de abierto/cerrado y las expiraciones fallan en las horas límite.
- **El horario debe validarse en servidor.** Deshabilitar el botón en el navegador no evita una solicitud manual; antes de crear un pedido se recalcula el estado con `lib/horario.ts` y la hora del servidor.
- **Plantillas y paletas no deben multiplicar la lógica.** Productos, precios, horario y acciones usan contratos compartidos; cada plantilla decide cómo presentarlos y cada paleta solo reasigna tokens semánticos.
- **Supabase free se pausa tras 7 días sin actividad** — de ahí el `ping-keepalive` de la Fase 9.
- **Doble reserva del mismo producto**: posible pero de bajo riesgo, sin pago en línea de por medio se resuelve por WhatsApp como ya se hace hoy.
- **Precio duplicado en dos pantallas** si la lógica de promociones se copia en vez de centralizarse en `lib/precios.ts`.

## 9. Plantilla de AGENTS.md para copiar al repo

```markdown
# MiPuesto — Instrucciones para agentes de código

## Producto
SaaS de catálogos digitales para negocios locales en Bolivia (restaurantes, tiendas, dentistas, barberías).
Los pedidos se cierran por WhatsApp. No hay pasarela de pago. Moneda: bolivianos (Bs).
Zona horaria de referencia: America/La_Paz. Todo el texto de interfaz va en español boliviano natural.

## Stack
Next.js (App Router, TypeScript, Tailwind) + Supabase (DB, Auth, Storage) + Cloudflare Pages.

## Antes de escribir interfaz
Leé DESIGN.md completo. Sus reglas ganan sobre cualquier default de Tailwind o del framework.
No introduzcas colores, tamaños de fuente ni espaciados fuera del sistema de tokens definido en la Fase 1.
La lista de prohibiciones de DESIGN.md sección 3 no es orientativa: es obligatoria.

## Convenciones de código
- Todo el acceso a datos pasa por los clientes de `lib/supabase/`, nunca fetch directo a la REST API.
- Cada tabla nueva necesita su política RLS en la misma migración que la crea.
- Los componentes de `components/templates/` reciben datos por props y nunca hacen fetch propio.
- Toda la lógica de precios y descuentos vive en `lib/precios.ts`. No la dupliques en componentes.
- Comprimí y validá imágenes en el cliente antes de subir (`lib/imagenes.ts`).
- Al borrar o reemplazar una imagen, borrá también el archivo en Storage.
- Fechas: guardar en UTC, convertir a America/La_Paz solo al mostrar.
- Commits pequeños, uno por tarea de la fase en curso.

## Qué no hacer
- No agregues dependencias nuevas sin justificarlo primero.
- No cambies el esquema de la base sin una migración versionada.
- No pongas SUPABASE_SERVICE_ROLE_KEY en código que llegue al cliente.
- No avances a la siguiente fase si la actual no cumple su criterio de aceptación.

## Cómo correr el proyecto
`npm run dev` — requiere `.env.local` con las variables de la sección 7 del planning.
`supabase/seed.sql` carga 3 negocios de prueba, uno por cada modalidad.
```
