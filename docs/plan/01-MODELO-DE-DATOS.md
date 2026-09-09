# 01 — Modelo de datos

Este documento es la referencia del esquema. El SQL de acá es el que va a las
migraciones, no un boceto. Cada fase copia su bloque, le pone fecha en el nombre del
archivo y lo aplica con `npm run supabase:push`.

## 1. Principios que no se negocian

| # | Principio | Consecuencia práctica |
|---|---|---|
| 1 | **Toda tabla lleva `negocio_id`** | RLS se resuelve en un solo `exists`, sin joins encadenados que se vuelven lentos y difíciles de auditar |
| 2 | **`negocio_id` no puede divergir de su padre** | Se garantiza con **clave foránea compuesta**, no con disparador. Ver sección 2 |
| 3 | **Toda tabla nueva trae su política RLS en la misma migración que la crea** | Regla de `AGENTS.md`. El script de aislamiento falla si no |
| 4 | **Una sola fuente de verdad para las existencias** | Si un producto tiene variantes, `productos.cantidad_stock` es `null` por restricción. Ver sección 4 |
| 5 | **Nada que toque el precio se guarda calculado** | Los totales se recalculan siempre en el servidor. Lo guardado en `pedido_items` es la foto del momento, para auditoría |
| 6 | **Borrar una definición nunca borra un dato** | Quitar un campo de una categoría deja el valor en `productos.atributos`. Se deja de mostrar, no se pierde |
| 7 | **Los techos son restricciones de la base, no consejos de la interfaz** | 8 campos por categoría, 12 valores por lista, 50 variantes por producto: todos con `check` o disparador |
| 8 | **Todas las funciones son `security definer` con `set search_path = ''`** | Convención vigente del proyecto, verificada por la prueba de estructura |

## 2. El patrón de aislamiento: clave foránea compuesta

Este es el mecanismo que sostiene el punto 2 y merece explicarse una vez.

Una tabla hija que lleva `negocio_id` copiado corre el riesgo clásico: alguien inserta
una variante con el `producto_id` de un negocio y el `negocio_id` de otro, y RLS —que
mira la columna copiada— la deja pasar. Un disparador lo evita, pero un disparador es
código que se puede desactivar y que hay que probar.

La solución sin código es una clave única compuesta en el padre y una foránea compuesta
en el hijo:

```sql
-- Se agrega una vez, en la fase 2.
alter table public.productos
  add constraint productos_id_negocio_key unique (id, negocio_id);

alter table public.categorias
  add constraint categorias_id_negocio_key unique (id, negocio_id);
```

Y cada hija la usa:

```sql
create table public.variantes (
  ...
  negocio_id uuid not null,
  producto_id uuid not null,
  constraint variantes_producto_fkey
    foreign key (producto_id, negocio_id)
    references public.productos (id, negocio_id) on delete cascade
);
```

Con eso, **una fila con el negocio equivocado no se puede insertar aunque el atacante
tenga la clave privilegiada**: lo impide el motor, no una política. Es barato: el índice
único ya existía de hecho sobre `id`, y el compuesto se usa además para las consultas
del panel, que siempre filtran por negocio.

## 3. Mecanismo 1 — Atributos por categoría

### Tabla de definiciones

```sql
create table public.campos_categoria (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null,
  categoria_id uuid not null,
  -- La clave es estable y no cambia si el dueño renombra el campo. Es la que
  -- aparece dentro de productos.atributos.
  clave text not null check (clave ~ '^[a-z][a-z0-9_]{0,29}$'),
  nombre text not null check (length(btrim(nombre)) between 1 and 40),
  tipo text not null check (tipo in ('lista', 'texto', 'numero', 'booleano')),
  -- Unidad de medida que se dibuja al lado del valor: W, kg, ", cm, GB.
  unidad text check (unidad is null or length(unidad) <= 8),
  -- Solo para tipo lista. Techo de 12: un desplegable de 40 opciones no se usa.
  valores text[] not null default '{}' check (cardinality(valores) <= 12),
  -- Un atributo con varios valores a la vez: la compatibilidad vehicular de un
  -- repuesto, los idiomas de un curso. Solo tiene sentido en lista.
  multiple boolean not null default false,
  filtrable boolean not null default true,
  -- Se dibuja en la tarjeta del listado, no solo en la ficha. Techo de 2 por
  -- categoría, en disparador: tres datos en una tarjeta de teléfono no entran.
  destacado boolean not null default false,
  obligatorio boolean not null default false,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),

  constraint campos_categoria_categoria_fkey
    foreign key (categoria_id, negocio_id)
    references public.categorias (id, negocio_id) on delete cascade,
  constraint campos_categoria_clave_unica unique (categoria_id, clave),
  -- Una lista sin valores no se puede elegir; un texto con valores confunde.
  constraint campos_categoria_valores_coherentes check (
    (tipo = 'lista' and cardinality(valores) between 1 and 12)
    or (tipo <> 'lista' and cardinality(valores) = 0)
  ),
  constraint campos_categoria_multiple_solo_lista check (
    multiple = false or tipo = 'lista'
  ),
  -- Un número sin unidad es un número; un sí/no con unidad no significa nada.
  constraint campos_categoria_unidad_coherente check (
    unidad is null or tipo in ('numero', 'texto')
  )
);

create index campos_categoria_por_categoria
  on public.campos_categoria (categoria_id, orden);
```

### Los techos, en disparador

Un `check` no puede contar filas hermanas. Estos dos van en función:

```sql
create or replace function public.limitar_campos_categoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cuantos integer;
  destacados integer;
begin
  select count(*), count(*) filter (where destacado)
    into cuantos, destacados
    from public.campos_categoria
   where categoria_id = new.categoria_id
     and id <> new.id;

  if cuantos + 1 > 8 then
    raise exception 'Una categoría admite hasta 8 campos.'
      using errcode = 'check_violation';
  end if;
  if new.destacado and destacados + 1 > 2 then
    raise exception 'Como máximo 2 campos destacados por categoría.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger campos_categoria_topes
  before insert or update on public.campos_categoria
  for each row execute function public.limitar_campos_categoria();
```

### La columna del producto

```sql
alter table public.productos
  add column atributos jsonb not null default '{}'::jsonb,
  -- La marca aparece en 19 de las 44 fichas y se filtra en casi todas. Merece
  -- columna propia: como atributo habría que definirla en cada categoría.
  add column marca text check (marca is null or length(btrim(marca)) <= 60);

alter table public.productos
  add constraint productos_atributos_es_objeto
    check (jsonb_typeof(atributos) = 'object');

-- Sin este índice, filtrar por atributo hace recorrido completo con 300
-- productos por negocio. Se crea junto con la columna, no después.
create index productos_atributos_gin
  on public.productos using gin (atributos jsonb_path_ops);

create index productos_marca
  on public.productos (negocio_id, marca) where marca is not null;
```

### Qué se guarda dentro de `atributos`

```jsonc
{
  "potencia": 100,                        // numero
  "material": "Acero inoxidable",         // texto
  "medida": "1/2\"",                      // lista, un valor
  "compatibilidad": ["Corolla 2015-2020", "Yaris 2018+"],  // lista multiple
  "garantia": true                        // booleano
}
```

**Las claves que ya no tienen definición se conservan.** La consulta pública solo dibuja
las que la categoría declara hoy; el resto queda guardado y vuelve a aparecer si el
dueño recrea el campo. Es el principio 6.

### La búsqueda

`productos.texto_busqueda` es una columna generada, así que sumarle los atributos obliga
a **borrarla y recrearla junto con su índice GIN**. No es un `add column`: es una
migración con bloqueo. Con 300 productos por negocio es instantánea, pero se ejecuta en
horario de baja carga y se anota como tal.

```sql
drop index if exists public.productos_texto_busqueda_trgm;
alter table public.productos drop column texto_busqueda;

alter table public.productos
  add column texto_busqueda text
  generated always as (
    coalesce(nombre, '') || ' ' ||
    coalesce(descripcion, '') || ' ' ||
    coalesce(codigo, '') || ' ' ||
    coalesce(marca, '') || ' ' ||
    -- Solo los valores, no las claves: nadie busca "potencia", buscan "100".
    coalesce((
      select string_agg(valor, ' ')
      from jsonb_each_text(atributos) as pares(clave, valor)
    ), '')
  ) stored;

create index productos_texto_busqueda_trgm
  on public.productos using gin (texto_busqueda public.gin_trgm_ops);
```

> **Trampa.** `jsonb_each_text` no es inmutable en todas las versiones, y una columna
> generada exige inmutabilidad. Si el motor la rechaza, la salida es un disparador
> `before insert or update` que escribe una columna normal. La fase 2 verifica cuál de
> las dos aplica **en la base de ensayo antes de tocar producción**.

## 4. Mecanismo 2 — Variantes con existencias propias

### La decisión de diseño

Se evaluaron dos formas:

| Forma | Tablas | Integridad de valores | Costo |
|---|---|---|---|
| Ejes y valores normalizados | 4 (`ejes`, `valores`, `variantes`, `variante_valores`) | La da el motor | Alto: cada alta de producto son cuatro inserciones encadenadas y la matriz se arma con joins |
| **Ejes declarados en el producto, opciones en `jsonb` en la variante** | **1** | La da el servidor, con una prueba | **Baja**, y la matriz se genera en memoria |

Se elige la segunda. El argumento decisivo no es el ahorro de tablas: es que **la matriz
de variantes se genera y se regenera** cuando el dueño agrega un color, y con el modelo
normalizado eso es una reconciliación de cuatro tablas. Con `jsonb` es reemplazar un
arreglo. La integridad que se pierde se recupera con validación en un único punto de
escritura y una prueba que la cubre.

### Los ejes, en el producto

```sql
alter table public.productos
  add column ejes_variante jsonb not null default '[]'::jsonb,
  add column tiene_variantes boolean not null default false;

alter table public.productos
  add constraint productos_ejes_es_arreglo
    check (jsonb_typeof(ejes_variante) = 'array' and jsonb_array_length(ejes_variante) <= 3),
  -- Principio 4: una sola fuente de verdad para las existencias.
  add constraint productos_stock_en_un_solo_lugar check (
    tiene_variantes = false or (cantidad_stock is null and cantidad_reservada = 0)
  ),
  add constraint productos_ejes_solo_con_variantes check (
    tiene_variantes = true or jsonb_array_length(ejes_variante) = 0
  );
```

Forma de `ejes_variante`:

```jsonc
[
  { "clave": "talla",  "nombre": "Talla",  "valores": ["38", "39", "40", "41"] },
  { "clave": "color",  "nombre": "Color",  "valores": ["Negro", "Blanco"] }
]
```

Tres ejes como máximo, y el producto de sus longitudes acotado a 50 variantes. Cuatro
ejes de cinco valores son 625 filas por producto: eso no es un producto, es un catálogo.

### La tabla

```sql
create table public.variantes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null,
  producto_id uuid not null,
  -- { "talla": "40", "color": "Negro" }. Las claves tienen que coincidir con
  -- las de productos.ejes_variante; lo valida el servidor y lo prueba un caso.
  opciones jsonb not null,
  -- Etiqueta ya armada para no reconstruirla en cada tarjeta: "40 / Negro".
  etiqueta text not null check (length(btrim(etiqueta)) between 1 and 80),
  sku text check (sku is null or length(btrim(sku)) <= 40),
  -- null significa "hereda el precio del producto". No se copia: si se copiara,
  -- cambiar el precio del producto dejaría las variantes desactualizadas.
  precio numeric(10, 2) check (precio is null or precio >= 0),
  precio_anterior numeric(10, 2) check (precio_anterior is null or precio_anterior >= 0),
  cantidad_stock integer check (cantidad_stock is null or cantidad_stock >= 0),
  cantidad_reservada integer not null default 0 check (cantidad_reservada >= 0),
  -- Una sola foto: la variante de color la necesita, y cuatro por variante por
  -- cincuenta variantes es un problema de almacenamiento, no una función.
  foto_url text,
  activa boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),

  constraint variantes_producto_fkey
    foreign key (producto_id, negocio_id)
    references public.productos (id, negocio_id) on delete cascade,
  constraint variantes_opciones_es_objeto check (jsonb_typeof(opciones) = 'object'),
  constraint variantes_sin_repetir unique (producto_id, opciones),
  constraint variantes_reserva_no_supera_stock
    check (cantidad_stock is null or cantidad_reservada <= cantidad_stock)
);

create index variantes_por_producto on public.variantes (producto_id, orden);
create index variantes_por_sku
  on public.variantes (negocio_id, sku) where sku is not null;
-- Para filtrar "solo talla 40" sobre el catálogo entero.
create index variantes_opciones_gin
  on public.variantes using gin (opciones jsonb_path_ops);
```

### El techo de 50, en disparador

```sql
create or replace function public.limitar_variantes()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.variantes
       where producto_id = new.producto_id and id <> new.id) + 1 > 50 then
    raise exception 'Un producto admite hasta 50 variantes.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger variantes_tope
  before insert on public.variantes
  for each row execute function public.limitar_variantes();
```

### El impacto en pedidos y reservas

Esta es la parte cara de la fase 3, y la que hay que hacer bien.

```sql
alter table public.pedido_items
  add column variante_id uuid,
  -- Foto del momento: si el dueño renombra la variante, el pedido viejo sigue
  -- diciendo lo que el comprador vio.
  add column variante_etiqueta text;

alter table public.pedido_items
  add constraint pedido_items_variante_fkey
    foreign key (variante_id) references public.variantes (id) on delete set null;
```

`crear_pedido_reservado()` se reescribe para descontar de `variantes.cantidad_reservada`
cuando el ítem trae variante, y de `productos.cantidad_reservada` cuando no. La misma
función, dos ramas, **una sola transacción** y el mismo bloqueo de fila (`for update`)
que ya usa. `expirar_reservas_vencidas()` devuelve al lugar del que descontó.

**Regla que evita el error más probable:** un ítem cuyo producto tiene
`tiene_variantes = true` **debe** traer `variante_id`. Se verifica dentro de la función,
no en la ruta: la ruta se puede saltar, la función no.

## 5. Mecanismo 4 — Precio real

### Columnas en el producto

```sql
alter table public.productos
  add column unidad_precio text not null default 'unidad' check (unidad_precio in (
    'unidad', 'kg', 'litro', 'metro', 'm2', 'hora', 'dia', 'noche', 'mes', 'persona'
  )),
  add column moneda text not null default 'BOB' check (moneda in ('BOB', 'USD')),
  -- Cerámica: se vende por caja de 1,44 m². El comprador pide metros y el
  -- sistema redondea a cajas.
  add column cantidad_minima numeric(10, 3) not null default 1
    check (cantidad_minima > 0),
  add column paso_cantidad numeric(10, 3) not null default 1
    check (paso_cantidad > 0),
  -- Servicios: cuánto dura, para que la agenda sepa qué franja bloquear.
  add column duracion_minutos integer
    check (duracion_minutos is null or duracion_minutos between 5 and 1440),
  add column requiere_turno boolean not null default false,
  -- Ficha técnica descargable: electropartes, cerámicas, temario de un curso.
  add column ficha_url text;

alter table public.productos
  add constraint productos_turno_con_duracion
    check (requiere_turno = false or duracion_minutos is not null);
```

**`moneda` por producto y no por negocio**: una inmobiliaria publica departamentos en
dólares y el alquiler de un garaje en bolivianos. Lo que **no** se hace es convertir:
cada precio se muestra en su moneda, sin tipo de cambio. Convertir obligaría a mantener
una cotización, y una cotización desactualizada es un precio equivocado.

### Escalas por volumen

```sql
create table public.escalas_precio (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null,
  producto_id uuid not null,
  desde_cantidad numeric(10, 3) not null check (desde_cantidad > 0),
  precio numeric(10, 2) not null check (precio >= 0),

  constraint escalas_precio_producto_fkey
    foreign key (producto_id, negocio_id)
    references public.productos (id, negocio_id) on delete cascade,
  constraint escalas_precio_sin_repetir unique (producto_id, desde_cantidad)
);

create index escalas_por_producto
  on public.escalas_precio (producto_id, desde_cantidad);
```

Se resuelve tomando la escala de mayor `desde_cantidad` que no supere la cantidad
pedida. Máximo 5 escalas por producto, en disparador.

### Modificadores

```sql
create table public.grupos_modificador (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null,
  producto_id uuid not null,
  nombre text not null check (length(btrim(nombre)) between 1 and 40),
  -- minimo 1 / maximo 1 = elegir uno obligatorio (tamaño).
  -- minimo 0 / maximo n = extras opcionales.
  minimo integer not null default 0 check (minimo >= 0),
  maximo integer not null default 1 check (maximo >= 1),
  orden integer not null default 0,

  constraint grupos_modificador_producto_fkey
    foreign key (producto_id, negocio_id)
    references public.productos (id, negocio_id) on delete cascade,
  constraint grupos_modificador_rango check (minimo <= maximo)
);

create table public.opciones_modificador (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null,
  grupo_id uuid not null,
  nombre text not null check (length(btrim(nombre)) between 1 and 40),
  -- Puede ser negativo: "sin queso, -Bs 2". Acotado para que un error de tipeo
  -- no genere un total absurdo.
  precio_delta numeric(10, 2) not null default 0
    check (precio_delta between -9999 and 9999),
  activo boolean not null default true,
  orden integer not null default 0,

  constraint opciones_modificador_grupo_fkey
    foreign key (grupo_id, negocio_id)
    references public.grupos_modificador (id, negocio_id) on delete cascade
);

alter table public.grupos_modificador
  add constraint grupos_modificador_id_negocio_key unique (id, negocio_id);
```

En el pedido:

```sql
alter table public.pedido_items
  -- [{ "grupo": "Extras", "opcion": "Queso extra", "delta": 8.00 }]
  -- Foto del momento, igual que la etiqueta de variante.
  add column modificadores jsonb not null default '[]'::jsonb;

alter table public.pedido_items
  add constraint pedido_items_modificadores_es_arreglo
    check (jsonb_typeof(modificadores) = 'array'
           and jsonb_array_length(modificadores) <= 20);
```

**El `delta` guardado es informativo.** El total lo recalcula la función del pedido
leyendo `opciones_modificador` en ese instante. Si el navegador manda un delta que no
coincide, la función usa el suyo y el pedido igual se crea: no se le muestra un error al
comprador por un precio que cambió mientras miraba.

## 6. Mecanismo 6 — Agenda

Es el bloque más delicado del plan, porque es el único donde **dos compradores pueden
pelearse por lo mismo al mismo tiempo** y la base tiene que decidir sin ambigüedad.

### Recursos

```sql
create table public.recursos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  sucursal_id uuid,
  nombre text not null check (length(btrim(nombre)) between 1 and 60),
  tipo text not null check (tipo in ('persona', 'espacio', 'cupo')),
  descripcion text,
  foto_url text,
  -- 1 = barbero, cancha, mesa, consultorio. Mayor a 1 = tour, clase, sala.
  capacidad integer not null default 1 check (capacidad between 1 and 500),
  -- Mismo formato que negocios.horario. null = hereda el del negocio.
  horario jsonb,
  activo boolean not null default true,
  orden integer not null default 0,

  constraint recursos_id_negocio_key unique (id, negocio_id)
);

-- Qué recurso puede prestar qué servicio. Sin filas para un producto que
-- requiere turno, se entiende que lo puede prestar cualquiera.
create table public.recurso_producto (
  negocio_id uuid not null,
  recurso_id uuid not null,
  producto_id uuid not null,
  primary key (recurso_id, producto_id),

  constraint recurso_producto_recurso_fkey
    foreign key (recurso_id, negocio_id)
    references public.recursos (id, negocio_id) on delete cascade,
  constraint recurso_producto_producto_fkey
    foreign key (producto_id, negocio_id)
    references public.productos (id, negocio_id) on delete cascade
);
```

### Turnos

```sql
create extension if not exists btree_gist with schema extensions;

create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null,
  recurso_id uuid not null,
  producto_id uuid,
  pedido_id uuid references public.pedidos (id) on delete set null,
  -- Código corto que el comprador lleva a WhatsApp, igual que el de reserva.
  codigo text not null,
  inicio timestamptz not null,
  fin timestamptz not null,
  -- Cuántos lugares toma. 1 para un turno de barbería; 4 para cuatro asientos
  -- de un tour.
  lugares integer not null default 1 check (lugares >= 1),
  estado text not null default 'reservado' check (estado in (
    'reservado', 'confirmado', 'cancelado', 'cumplido', 'expirado'
  )),
  cliente_nombre text,
  cliente_telefono text,
  notas text,
  expira_en timestamptz,
  creado_en timestamptz not null default now(),

  constraint turnos_recurso_fkey
    foreign key (recurso_id, negocio_id)
    references public.recursos (id, negocio_id) on delete cascade,
  constraint turnos_rango_valido check (fin > inicio),
  constraint turnos_codigo_unico unique (negocio_id, codigo)
);

create index turnos_agenda
  on public.turnos (recurso_id, inicio)
  where estado in ('reservado', 'confirmado');
```

### Las dos garantías de no solapamiento

Un recurso de capacidad 1 y uno de capacidad 12 necesitan garantías distintas, y forzar
una sola sería un error.

**Capacidad 1 — restricción de exclusión.** La da el motor, es imposible saltarla:

```sql
alter table public.turnos
  add constraint turnos_sin_solapamiento
  exclude using gist (
    recurso_id with =,
    tstzrange(inicio, fin, '[)') with &&
  ) where (estado in ('reservado', 'confirmado') and lugares = 1);
```

**Capacidad mayor a 1 — conteo con bloqueo.** Una exclusión no sabe sumar, así que va en
función, y la función bloquea la fila del recurso antes de contar:

```sql
create or replace function public.reservar_turno(
  p_recurso_id uuid, p_producto_id uuid, p_inicio timestamptz,
  p_fin timestamptz, p_lugares integer, p_cliente_nombre text,
  p_cliente_telefono text
) returns table (turno_id uuid, codigo text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_capacidad integer;
  v_negocio uuid;
  v_tomados integer;
begin
  -- El bloqueo es lo que hace que dos compradores simultáneos se serialicen.
  select capacidad, negocio_id into v_capacidad, v_negocio
    from public.recursos where id = p_recurso_id and activo for update;

  if v_capacidad is null then
    raise exception 'Recurso inexistente o inactivo.';
  end if;

  select coalesce(sum(lugares), 0) into v_tomados
    from public.turnos
   where recurso_id = p_recurso_id
     and estado in ('reservado', 'confirmado')
     and tstzrange(inicio, fin, '[)') && tstzrange(p_inicio, p_fin, '[)');

  if v_tomados + p_lugares > v_capacidad then
    raise exception 'Sin lugares disponibles en ese horario.'
      using errcode = 'check_violation';
  end if;
  -- ... inserción y devolución del código
end;
$$;
```

**Por qué las dos y no solo la función:** la exclusión protege el caso más común incluso
si alguien escribe en la tabla por fuera de la función. La función cubre lo que la
exclusión no puede expresar. Cada una en su caso, y el `where` de la exclusión deja claro
cuál es cuál.

### Lo que la agenda toma prestado y no reinventa

- **Horario y feriados:** `lib/horario.ts` ya resuelve si el negocio atiende. El recurso
  hereda o sobrescribe; no hay un segundo motor de horarios.
- **Expiración:** `mipuesto-expirar-reservas` ya corre cada cinco minutos. Se le suma el
  paso de expirar turnos vencidos. Una tarea más, no un programador nuevo.
- **Código de reserva:** el mismo generador que ya usan los pedidos.

## 7. Mecanismo 8 — Logística

```sql
create table public.sucursales (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 1 and 60),
  direccion text,
  ubicacion_url text,
  telefono_whatsapp text,
  horario jsonb,
  activa boolean not null default true,
  orden integer not null default 0,
  constraint sucursales_id_negocio_key unique (id, negocio_id)
);

create table public.zonas_entrega (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 1 and 60),
  costo numeric(10, 2) not null default 0 check (costo >= 0),
  minimo_pedido numeric(10, 2) not null default 0 check (minimo_pedido >= 0),
  notas text,
  activa boolean not null default true,
  orden integer not null default 0,
  constraint zonas_entrega_id_negocio_key unique (id, negocio_id)
);

create table public.relaciones_producto (
  negocio_id uuid not null,
  producto_id uuid not null,
  relacionado_id uuid not null,
  tipo text not null default 'relacionado'
    check (tipo in ('relacionado', 'combo', 'accesorio')),
  orden integer not null default 0,
  primary key (producto_id, relacionado_id),

  constraint relaciones_origen_fkey
    foreign key (producto_id, negocio_id)
    references public.productos (id, negocio_id) on delete cascade,
  constraint relaciones_destino_fkey
    foreign key (relacionado_id, negocio_id)
    references public.productos (id, negocio_id) on delete cascade,
  constraint relaciones_no_reflexiva check (producto_id <> relacionado_id)
);
```

Y en el pedido:

```sql
alter table public.pedidos
  add column sucursal_id uuid references public.sucursales (id) on delete set null,
  add column zona_entrega_id uuid references public.zonas_entrega (id) on delete set null,
  add column costo_entrega numeric(10, 2) not null default 0 check (costo_entrega >= 0),
  -- Florería, pastelería, imprenta: el comprador dice cuándo lo necesita.
  add column fecha_entrega date,
  add column hora_entrega time;

alter table public.productos
  add column requiere_fecha_entrega boolean not null default false;
```

> **`relaciones_producto` es la única tabla del plan sin `id` propio.** La clave es el
> par, y no hace falta más: no hay nada que referencie una relación.

## 7 bis. Los dos banners del catálogo

Pedido el 2026-09-09, mirando las maquetas: casi todas tienen una franja ancha
debajo de la portada y otra antes del pie, para una promoción, un aviso o
publicidad propia del negocio.

```sql
alter table public.negocios
  add column banners jsonb not null default '[]'::jsonb;

alter table public.negocios
  add constraint negocios_banners_es_lista_corta check (
    jsonb_typeof(banners) = 'array' and jsonb_array_length(banners) <= 2
  );
```

**Van en `jsonb` y no en una tabla, contra la regla general de este documento**,
y el motivo es que siguen a `redes_sociales`, que ya existe y es la misma clase
de cosa: una lista corta, acotada, propia del negocio, que se lee siempre junto
con él y nunca se consulta por su cuenta. Una tabla sumaría una política de RLS,
una ida más a la base en el camino público y un `join` en la consulta que más
importa, a cambio de nada.

**Son dos y no una lista libre.** Tres franjas de publicidad en un catálogo de
barrio es un catálogo que no se lee. El techo va en la base y no solo en el
validador.

**La posición es la del arreglo:** el primero arriba, el segundo abajo. Sin campo
`posicion`, que sería un dato más que puede quedar en dos estados que se
contradicen.

Cada banner es `{ imagen, alt, enlace }`.

**`imagen` es una ruta del depósito, no una dirección.** Guardar la dirección
completa hornea el proyecto de Supabase adentro del dato: una base restaurada en
otro proyecto seguiría apuntando a las imágenes del anterior, que además puede no
existir. Es la misma forma que ya usan el logo, la portada y el QR, y la dirección
la arma `obtenerUrlPublicaImagenNegocio` al servirla. Corregido el 2026-09-09, al
notar la inconsistencia con el resto de las imágenes del negocio.

El **texto alternativo es obligatorio**: un banner puede ser el aviso de que el
negocio cierra por feriado, y sin él esa información se pierde para quien usa
lector de pantalla. El enlace, cuando lo hay, solo acepta `https`.

## 8. RLS — el patrón único

Todas las tablas nuevas siguen la misma forma, que se apoya en el principio 1.

```sql
alter table public.variantes enable row level security;

create policy "variantes_publicas"
on public.variantes for select to anon
using (
  activa = true
  and exists (
    select 1 from public.productos p
    join public.negocios n on n.id = p.negocio_id
    where p.id = variantes.producto_id
      and p.visible = true
      and p.eliminado_en is null
      and n.activo = true
  )
);

create policy "administra_variantes_propias"
on public.variantes for all to authenticated
using (
  exists (select 1 from public.negocios n
          where n.id = variantes.negocio_id
            and n.admin_user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.negocios n
          where n.id = variantes.negocio_id
            and n.admin_user_id = (select auth.uid()))
);
```

| Tabla | `anon` lee | `authenticated` administra |
|---|---|---|
| `campos_categoria` | Sí, si el negocio está activo | Solo las propias |
| `variantes` | Sí, si el producto es visible y no está en la papelera | Solo las propias |
| `escalas_precio` | Sí | Solo las propias |
| `grupos_modificador`, `opciones_modificador` | Sí | Solo las propias |
| `recursos`, `recurso_producto` | Sí, solo los activos | Solo los propios |
| `turnos` | **No** | Solo los propios |
| `sucursales`, `zonas_entrega` | Sí, solo las activas | Solo las propias |
| `relaciones_producto` | Sí | Solo las propias |

**`turnos` no se lee desde `anon`, igual que `pedidos`.** Un turno lleva nombre y
teléfono de una persona. La disponibilidad se consulta por función
(`disponibilidad_recurso()`), que devuelve franjas libres y **no** quién ocupa las otras.
Es la misma regla que ya se aplicó al quitarle a `anon` la lectura de pedidos.

## 9. Resumen del esquema resultante

| Tablas hoy | Tablas nuevas | Total |
|---|---|---|
| 15 | 11 | 26 |

Nuevas: `campos_categoria`, `variantes`, `escalas_precio`, `grupos_modificador`,
`opciones_modificador`, `recursos`, `recurso_producto`, `turnos`, `sucursales`,
`zonas_entrega`, `relaciones_producto`.

Columnas nuevas en `productos`: `atributos`, `marca`, `ejes_variante`,
`tiene_variantes`, `unidad_precio`, `moneda`, `cantidad_minima`, `paso_cantidad`,
`duracion_minutos`, `requiere_turno`, `requiere_fecha_entrega`, `ficha_url`.

**Ninguna columna existente se borra ni cambia de tipo**, salvo `texto_busqueda`, que se
regenera. Un negocio que hoy funciona sigue funcionando con todas las columnas nuevas en
su valor por defecto: ese es el criterio de compatibilidad de todo el plan.

## 10. Peso y costo

| Concepto | Por negocio con el catálogo lleno |
|---|---|
| `atributos` (300 productos por 8 campos) | ~240 KB |
| `variantes` (60 productos con 12 variantes) | ~180 KB |
| Definiciones, escalas, modificadores | ~40 KB |
| `turnos` (un año de agenda activa) | ~600 KB |
| **Total** | **~1 MB** |

Con el plan gratuito de Supabase (500 MB) eso da margen para más de 300 negocios antes
de que la base sea el límite. **El límite real sigue siendo Storage y las imágenes**, que
es donde ya estaba. Bs 0 de infraestructura nueva.
