# 01 · Modelo de datos

## 1. Qué hay hoy y qué falta

Lo que existe hoy en `public.productos` es: `nombre`, `descripcion`, `precio`,
`precio_anterior`, `fotos`, `controla_stock`, `cantidad_stock`,
`cantidad_reservada`, `visible`, `estado`, `orden`, `codigo`, `en_carta_hasta`.

**No hay atributos. No hay variantes. No hay agenda.** Eso es todo lo que este
plan agrega al núcleo; el resto son columnas de preferencia visual.

## 2. La regla de aislamiento

Toda tabla nueva que cuelgue de un negocio lleva `negocio_id` y **clave foránea
compuesta** hacia su padre:

```sql
constraint fk_padre
  foreign key (categoria_id, negocio_id)
  references public.categorias(id, negocio_id) on delete cascade
```

Esto exige que el padre declare `unique (id, negocio_id)` aunque `id` ya sea
clave primaria. La redundancia es deliberada: **el motor impide que un producto
del negocio A apunte a una categoría del negocio B**, sin depender de un
disparador que alguien pueda desactivar ni de una política que alguien pueda
escribir mal. Es la misma regla que ya sostiene `productos` y `pedido_items`.

## 3. Categorías: el centro del modelo

La categoría deja de ser un nombre con un orden y pasa a ser **la que declara
cómo se venden las cosas que contiene**.

```sql
alter table public.categorias
  add column icono text not null default 'package',
  add column visible boolean not null default true,
  add column vende text not null default 'cosas'
    check (vende in ('cosas', 'tiempo')),
  add constraint categorias_id_negocio unique (id, negocio_id),
  add constraint categorias_icono_formato check (icono ~ '^[a-z0-9-]{2,40}$');
```

| Columna | Qué decide |
|---|---|
| `icono` | El dibujo de su esfera y una de las piezas del patrón de fondo. Es un nombre de icono de Lucide, no una imagen |
| `visible` | Si su esfera aparece en el catálogo. **No oculta los productos**, que siguen buscables |
| `vende` | `cosas` habilita variantes y stock. `tiempo` habilita agenda y citas |

`vende` es la columna que resuelve la mezcla del diseño de referencia, donde
`variants: ['10:00','11:30']` y `variants: ['3 kg','7.5 kg']` viven en el mismo
campo. Acá son dos mecanismos distintos y la categoría dice cuál usa.

## 4. Campos por categoría

### 4.1 La definición

```sql
create table public.atributos_categoria (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  categoria_id uuid not null,
  clave text not null,
  nombre text not null,
  tipo text not null check (tipo in ('texto', 'numero', 'opcion', 'si_no')),
  unidad text,
  opciones text[] not null default '{}',
  obligatorio boolean not null default false,
  en_tarjeta boolean not null default false,
  en_resumen boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),

  constraint atributos_categoria_padre
    foreign key (categoria_id, negocio_id)
    references public.categorias(id, negocio_id) on delete cascade,
  constraint atributos_clave_unica unique (categoria_id, clave),
  constraint atributos_clave_formato check (clave ~ '^[a-z][a-z0-9_]{1,30}$'),
  constraint atributos_opciones_solo_en_opcion
    check (tipo = 'opcion' or cardinality(opciones) = 0),
  constraint atributos_opcion_tiene_opciones
    check (tipo <> 'opcion' or cardinality(opciones) between 2 and 24),
  constraint atributos_unidad_solo_en_numero
    check (tipo = 'numero' or unidad is null)
);

create index idx_atributos_categoria on public.atributos_categoria(categoria_id, orden);
```

Cuatro tipos y ni uno más:

| Tipo | Ejemplo | Se guarda como |
|---|---|---|
| `texto` | Material: «Acero inoxidable» | cadena, máximo 80 |
| `numero` | Potencia: 9, unidad `W` | número, con su unidad en la definición |
| `opcion` | Casquillo: E27 / E14 / GU10 | cadena, obligatoriamente una de `opciones` |
| `si_no` | Regulable: sí | booleano |

Los cuatro cubren los seis rubros sin excepción. Se agrega un quinto tipo el día
que un rubro real no entre, no antes.

### 4.2 Los topes, y por qué existen

Diez campos por categoría, seis de ellos en la tarjeta. Se controla con un
disparador porque una cuenta de filas no cabe en una restricción de columna:

```sql
create or replace function public.limitar_atributos_por_categoria()
returns trigger language plpgsql security definer set search_path = ''
as $funcion$
declare
  cantidad integer;
  visibles integer;
begin
  select count(*), count(*) filter (where en_tarjeta)
    into cantidad, visibles
    from public.atributos_categoria
   where categoria_id = new.categoria_id;

  if cantidad > 10 then
    raise exception 'Una categoría admite hasta 10 campos.';
  end if;
  if visibles > 6 then
    raise exception 'Hasta 6 campos pueden mostrarse en la tarjeta.';
  end if;
  return new;
end;
$funcion$;
```

Diez por categoría porque la ficha de producto los dibuja en dos columnas y con
quince deja de leerse en un teléfono. Seis en la tarjeta porque es lo que entra
sin que la tarjeta crezca más alta que ancha.

Este sí es un disparador, y no contradice la regla de la sección 2: **la regla
prohíbe sostener el aislamiento entre negocios con disparadores**. Un tope de
cantidad no es aislamiento.

### 4.3 Los valores

```sql
alter table public.productos
  add column atributos jsonb not null default '{}'::jsonb,
  add constraint productos_atributos_objeto
    check (jsonb_typeof(atributos) = 'object'),
  add constraint productos_atributos_tamano
    check (pg_column_size(atributos) <= 4096);

create index idx_productos_atributos on public.productos using gin (atributos);
```

Las llaves del objeto son las `clave` de los atributos de su categoría:

```json
{ "potencia": 9, "casquillo": "E27", "color_luz": "Cálida", "regulable": true }
```

**Por qué `jsonb` sobre el producto y no una tabla `producto_atributos`:** el
catálogo público lee cuarenta productos en una sola consulta. Con tabla aparte
serían cuarenta consultas más, o un `join` que hay que armar y desarmar en cada
una de las cinco lecturas que ya existen (`COLUMNAS_PRODUCTO_ADMIN`, `_PUBLICO`,
`_IMPRESO`, carta del día, papelera). La carga por lotes escribiría una fila por
campo por producto: 30 productos por 6 campos son 180 inserciones donde hoy hay
30.

**Lo que se pierde:** filtrar por atributo con índice fino. El `gin` cubre
«productos donde casquillo es E27», que es el único filtro que el MVP necesita.
Buscar por rango numérico —entre 5 y 10 W— quedaría lento con miles de
productos. Si eso llega a hacer falta, la salida es una columna generada por
atributo, no rehacer el modelo.

**La validación vive en un solo lugar**, `lib/catalogo/atributos.ts`, y corre en
el servidor antes de escribir. La base garantiza que sea un objeto y que quepa;
que las llaves existan y los valores sean del tipo correcto lo garantiza el
validador, con sus pruebas.

## 5. Variantes: cuando la categoría vende cosas

```sql
create table public.variantes_producto (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  producto_id uuid not null,
  nombre text not null,
  precio numeric(10, 2) check (precio is null or precio >= 0),
  cantidad_stock integer check (cantidad_stock is null or cantidad_stock >= 0),
  cantidad_reservada integer not null default 0,
  visible boolean not null default true,
  orden integer not null default 0,

  constraint variantes_padre
    foreign key (producto_id, negocio_id)
    references public.productos(id, negocio_id) on delete cascade,
  constraint variantes_nombre_unico unique (producto_id, nombre),
  constraint variantes_reserva_consistente
    check (cantidad_stock is null or cantidad_reservada between 0 and cantidad_stock)
);
```

`precio` nulo significa «el mismo del producto». Es el caso común: una remera en
S, M y L cuesta lo mismo. Una bolsa de 3 kg y una de 7,5 kg, no.

`cantidad_stock` nulo significa que el producto no controla stock, y entonces
tampoco lo controla la variante. No se duplica la bandera `controla_stock`: ya
vive en el producto, y tenerla en dos lugares permite que se contradigan.

## 6. Agenda: cuando la categoría vende tiempo

> **Corregido en la implementación (2026-09-12).** Lo de abajo es el diseño
> original y quedó superado: el calendario **no es de la categoría, es del
> recurso** —quién atiende—. Existen `recursos` y `agenda_recurso`;
> `agenda_categoria` no existe. `productos.recurso_id` dice quién atiende cada
> servicio y `citas.recurso_id` es la columna sobre la que actúa la exclusión.
> El motivo completo está en `06-FASES.md`, fase 5.

### 6.1 Cuándo atiende

```sql
create table public.agenda_categoria (
  categoria_id uuid primary key,
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  duracion_minutos integer not null default 30
    check (duracion_minutos between 5 and 480),
  cupo_por_franja smallint not null default 1 check (cupo_por_franja between 1 and 50),
  anticipacion_minima_horas integer not null default 2 check (anticipacion_minima_horas >= 0),
  dias_maximos integer not null default 30 check (dias_maximos between 1 and 180),
  franjas jsonb not null default '[]'::jsonb,

  constraint agenda_padre
    foreign key (categoria_id, negocio_id)
    references public.categorias(id, negocio_id) on delete cascade
);
```

`franjas` describe la semana:

```json
[{ "dia": 1, "desde": "08:30", "hasta": "12:00" },
 { "dia": 1, "desde": "14:30", "hasta": "18:30" }]
```

Se guarda como `jsonb` porque se lee y se escribe siempre entero: nadie consulta
«los martes de todos los negocios». Es configuración, no datos.

`duracion_minutos` y `cupo_por_franja` son lo que convierte esa semana en los
horarios concretos que ve el cliente. **El dueño nunca escribe una lista de
horarios**: escribe que atiende de 8:30 a 12:00 con turnos de 30 minutos, y los
horarios salen calculados. Eso reemplaza al `variants: ['10:00', …]` y al
`stock: '5 horarios hoy'` del diseño de referencia, que estaban escritos a mano.

### 6.2 Las citas, y el doble agendamiento

```sql
create table public.citas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  producto_id uuid not null,
  codigo text not null default ('CITA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  rango tstzrange not null,
  cupo smallint not null default 1 check (cupo between 1 and 50),
  nombre_cliente text not null,
  telefono_cliente text not null,
  nota text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmada', 'cancelada', 'cumplida')),
  pedido_id uuid references public.pedidos(id) on delete set null,
  creado_en timestamptz not null default now(),

  constraint citas_padre
    foreign key (producto_id, negocio_id)
    references public.productos(id, negocio_id) on delete cascade,
  constraint citas_codigo_unico unique (codigo),
  constraint citas_rango_no_vacio check (not isempty(rango)),
  constraint citas_rango_razonable
    check (upper(rango) - lower(rango) between interval '5 minutes' and interval '8 hours')
);
```

Y acá está la pieza que impide el doble agendamiento:

```sql
create extension if not exists btree_gist;

alter table public.citas
  add constraint citas_sin_solapamiento
  exclude using gist (
    producto_id with =,
    cupo with =,
    rango with &&
  ) where (estado <> 'cancelada');
```

**Lo decide el motor, no la aplicación.** Si dos personas piden las 10:00 en el
mismo milisegundo, Postgres rechaza la segunda con violación de restricción. No
hay ventana entre «consulté si estaba libre» y «lo guardé». Comprobarlo con un
`select` previo es exactamente el error que produce dobles reservas en
producción, y encima no se puede probar que no ocurre, porque depende del
tiempo.

`cupo` es lo que permite atender a dos personas a la misma hora: una veterinaria
con dos consultorios tiene `cupo_por_franja = 2`, y el servidor asigna el primer
cupo libre. El tercero que llegue choca con uno de los dos y se rechaza.

**La cita no reemplaza al pedido.** El flujo de confirmación por WhatsApp queda
como está: la cita se crea, se vincula a su pedido con `pedido_id`, y la
pantalla de confirmación que ya existe muestra además la fecha y la hora.

### 6.3 Qué pasa con lo que ya existe

`productos.cantidad_reservada` **no se toca**. Reservar unidades de un producto y
agendar una hora son cosas distintas y siguen siéndolo. Un mismo negocio usa las
dos: la veterinaria reserva 2 bolsas de alimento y agenda una consulta.

## 7. El negocio

```sql
alter table public.negocios
  add column nombre_admin text,
  add column subnombre text,
  add column patron_opacidad smallint not null default 8
    check (patron_opacidad between 0 and 30),
  add column alta_completada_en timestamptz,
  add column rubro_bloqueado_en timestamptz,

  add column maps_enlace text,
  add column maps_place_id text,
  add column maps_nombre text,
  add column maps_direccion text,
  add column maps_calificacion numeric(2, 1)
    check (maps_calificacion is null or maps_calificacion between 0 and 5),
  add column maps_opiniones integer check (maps_opiniones is null or maps_opiniones >= 0),
  add column maps_consultado_en timestamptz,
  add column maps_visible boolean not null default false,
  add column direccion_manual text,

  add constraint negocios_maps_visible_necesita_lugar
    check (maps_visible = false or maps_place_id is not null);
```

| Columna | Para qué |
|---|---|
| `nombre_admin` | Para llamar al dueño por su nombre. Se pide en el primer paso del alta |
| `subnombre` | La línea bajo el nombre del negocio, junto al logo |
| `patron_opacidad` | De 0 a 30 por ciento. Encima de 30 el patrón compite con el texto |
| `rubro_bloqueado_en` | Cuándo quedó fijo el rubro. Nulo hasta que termina el alta |
| `maps_*` | La ficha de Google. `maps_visible` la muestra o no |
| `direccion_manual` | Para el negocio que no está en Maps. Sirve para la zona, no da calificación |

La última restricción impide mostrar un botón de calificación sin lugar detrás:
**no se puede activar la calificación de un negocio que no resolvió su ficha.**

El logo, la portada y el QR ya existen en el modelo actual y no cambian.

## 8. Los banners

El banner de hoy es `{ imagen, alt, enlace }`. El diseño de referencia trae
además eyebrow, título, bajada y botón. Se extiende el objeto:

```json
{ "imagen": "uuid/banner/promo.webp",
  "alt": "20 por ciento de descuento toda la semana",
  "eyebrow": "Solo esta semana",
  "titulo": "20 % en toda la línea eléctrica",
  "copy": "Del lunes al sábado, presentando el catálogo.",
  "boton": "Ver la promoción",
  "enlace": "https://…" }
```

Todos los campos de texto salvo `alt` son opcionales: un banner que es solo una
imagen sigue siendo válido, y es lo que hoy tienen los negocios cargados.
`leerBanners` los completa con nulos, así que **los datos existentes se leen sin
migración de contenido**.

`alt` sigue siendo obligatorio, y no es un campo opcional disfrazado: es lo que
escucha quien usa lector de pantalla.

## 9. La apariencia, después de la poda

```sql
alter table public.negocios
  drop column plantilla,
  drop column tarjeta_producto;
```

Se van las dos columnas del eje de estructura. Queda `paleta`, `patron_fondo` y
la nueva `patron_opacidad`.

**La poda va en su propia migración y al final de su fase**, no al principio:
mientras las plantillas sigan dibujándose, quitar la columna deja el catálogo
sin renderizar. El orden es dibujar el diseño nuevo, verificarlo en producción,
y recién entonces borrar la columna.

## 10. Orden de las migraciones

| # | Migración | Depende de |
|---|---|---|
| 1 | `categorias`: icono, visible, vende, único compuesto | — |
| 2 | `atributos_categoria` y su tope | 1 |
| 3 | `productos.atributos` e índice gin | 2 |
| 4 | `variantes_producto` | 1 |
| 5 | `negocios`: identidad, patrón, alta | — |
| 6 | `negocios`: campos de Maps | 5 |
| 7 | `agenda_categoria` | 1 |
| 8 | `citas` y su exclusión | 7 |
| 9 | Banners extendidos (solo comentario de columna) | — |
| 10 | **Poda**: `plantilla`, `tarjeta_producto` | Fase 5 desplegada |

Cada una lleva `grant` explícito por columna para `anon`, `authenticated` y
`service_role`. El `service_role` se olvidó tres veces en este proyecto, y las
tres se descubrió con la función ya rota en producción.
