-- Los campos de la categoría.
--
-- Una ferretería necesita potencia y casquillo; una veterinaria, especie y
-- etapa. El modelo de producto —nombre, precio, foto, cantidad— no alcanza para
-- ninguna de las dos, y una lista de atributos global no serviría: los campos de
-- «Luces» no son los de «Pinturas» aunque las dos sean de la misma ferretería.
--
-- Por eso **la categoría declara sus campos** y el producto guarda sus valores.

create table public.atributos_categoria (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  categoria_id uuid not null,

  -- La llave con la que el producto guarda su valor. No cambia cuando el dueño
  -- corrige el rótulo: si `nombre` fuera la llave, renombrar «Potencia» a
  -- «Potencia (W)» dejaría huérfano el dato de todos los productos.
  clave text not null,
  nombre text not null,

  tipo text not null,
  unidad text,
  opciones text[] not null default '{}',

  obligatorio boolean not null default false,
  en_tarjeta boolean not null default false,
  en_resumen boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),

  -- Clave foránea **compuesta**: es lo que hace que el motor impida que un campo
  -- del negocio A cuelgue de una categoría del negocio B. No lo sostiene un
  -- disparador ni una política, que alguien podría desactivar o escribir mal.
  constraint atributos_categoria_padre
    foreign key (categoria_id, negocio_id)
    references public.categorias(id, negocio_id) on delete cascade,

  constraint atributos_clave_unica unique (categoria_id, clave),
  constraint atributos_clave_formato check (clave ~ '^[a-z][a-z0-9_]{1,30}$'),
  constraint atributos_nombre_largo check (char_length(nombre) between 1 and 40),

  constraint atributos_tipo_valido
    check (tipo in ('texto', 'numero', 'opcion', 'si_no')),

  -- Las tres de abajo son las que impiden que una definición se contradiga a sí
  -- misma: una lista de opciones en un campo de texto libre no significa nada, y
  -- un campo de opción sin opciones no se puede completar.
  constraint atributos_opciones_solo_en_opcion
    check (tipo = 'opcion' or cardinality(opciones) = 0),
  constraint atributos_opcion_tiene_opciones
    check (tipo <> 'opcion' or cardinality(opciones) between 2 and 24),
  constraint atributos_unidad_solo_en_numero
    check (tipo = 'numero' or unidad is null),
  constraint atributos_unidad_corta
    check (unidad is null or char_length(unidad) between 1 and 12)
);

create index idx_atributos_categoria on public.atributos_categoria(categoria_id, orden);
create index idx_atributos_negocio on public.atributos_categoria(negocio_id);

comment on table public.atributos_categoria is
  'Qué datos lleva cada producto de una categoría. Los valores viven en productos.atributos.';
comment on column public.atributos_categoria.clave is
  'La llave con la que el producto guarda su valor. No cambia al renombrar el campo.';
comment on column public.atributos_categoria.en_tarjeta is
  'Si el valor se muestra en la tarjeta del producto. Hasta 6 por categoría.';
comment on column public.atributos_categoria.en_resumen is
  'Si el valor viaja en el mensaje de WhatsApp.';

-- Los topes.
--
-- Van en un disparador porque son una **cuenta de filas**, y eso no cabe en una
-- restricción de columna. No contradice la regla de que el aislamiento entre
-- negocios lo sostiene el motor: un tope de cantidad no es aislamiento.
--
-- Diez por categoría porque la ficha de producto los dibuja en dos columnas y
-- con quince deja de leerse en un teléfono. Seis en la tarjeta porque es lo que
-- entra sin que la tarjeta crezca más alta que ancha.
create or replace function public.limitar_atributos_por_categoria()
returns trigger
language plpgsql
security definer
set search_path = ''
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
    raise exception 'Una categoría admite hasta 10 campos.'
      using errcode = 'check_violation';
  end if;
  if visibles > 6 then
    raise exception 'Hasta 6 campos pueden mostrarse en la tarjeta.'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$funcion$;

-- Va `after` y por fila, y el orden en que la API escribe importa.
--
-- El disparador cuenta las filas que hay **en ese momento**. El editor reemplaza
-- el conjunto entero, así que si insertara antes de borrar pasaría por un estado
-- con más campos de los que va a dejar y el tope rechazaría un guardado
-- correcto. Por eso `PUT /api/catalogo/categorias/[id]/atributos` **borra
-- primero y agrega después**, y hay un comentario allá que dice lo mismo.
--
-- La alternativa —un disparador de restricción diferido— haría innecesario ese
-- cuidado, pero solo sirve dentro de una transacción, y el cliente de Supabase
-- manda cada sentencia por separado. Preferí la dependencia de orden, que es
-- visible y está escrita en los dos lados, antes que una función en la base que
-- haga el reemplazo entero y esconda el editor adentro de SQL.
create trigger atributos_dentro_del_tope
  after insert or update on public.atributos_categoria
  for each row
  execute function public.limitar_atributos_por_categoria();

alter table public.atributos_categoria enable row level security;

-- El catálogo público los necesita para saber qué mostrar en la ficha, así que
-- `anon` los lee, igual que las categorías.
create policy "atributos_publicos_activos"
on public.atributos_categoria for select to anon
using (
  exists (
    select 1 from public.negocios
    where negocios.id = atributos_categoria.negocio_id and negocios.activo = true
  )
);

create policy "administra_atributos_propios"
on public.atributos_categoria for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = atributos_categoria.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = atributos_categoria.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

grant select on table public.atributos_categoria to anon;
grant select, insert, update, delete on table public.atributos_categoria to authenticated;
grant select, insert, update, delete on table public.atributos_categoria to service_role;

-- Los valores, en el producto.
--
-- La columna se adelanta a esta fase aunque la pantalla para cargarlos llegue en
-- la siguiente. El motivo es concreto: al borrar un campo hay que poder decirle
-- al dueño en cuántos productos se va a perder el dato, y ese conteo necesita la
-- columna. Sin ella, el aviso diría siempre «cero» y sería un aviso que miente.
alter table public.productos
  add column if not exists atributos jsonb not null default '{}'::jsonb;

alter table public.productos
  add constraint productos_atributos_objeto
    check (jsonb_typeof(atributos) = 'object'),
  add constraint productos_atributos_tamano
    check (pg_column_size(atributos) <= 4096);

-- `gin` con `jsonb_path_ops`: ocupa menos y es más rápido para la única consulta
-- que el MVP necesita, que es «productos donde casquillo es E27». No sirve para
-- rangos numéricos, y eso está asumido: si algún día hace falta buscar «entre 5
-- y 10 W», la salida es una columna generada, no rehacer el modelo.
create index idx_productos_atributos
  on public.productos using gin (atributos jsonb_path_ops);

comment on column public.productos.atributos is
  'Valores de los campos de su categoría, por clave. La forma la valida el servidor.';
