-- La agenda y las citas.
--
-- Una veterinaria vende alimento —con existencias— y consultas —con horario—. Son
-- dos mecanismos distintos y siguen siéndolo: `productos.cantidad_reservada`
-- aparta unidades, y esto aparta una hora. Un mismo negocio usa los dos.
--
-- Lo que hace esta migración y no puede fallar: **que dos personas no se queden
-- con el mismo horario**. No lo decide la aplicación, lo decide el motor.

-- La extensión que permite mezclar la igualdad de un uuid con el solapamiento de
-- un rango dentro de la misma restricción de exclusión.
--
-- **No estaba instalada.** El plan la daba por puesta, igual que dio por puesto
-- el único compuesto de `productos` en la fase 4. Queda instalada acá y
-- verificada por la auditoría de la fase.
create extension if not exists btree_gist;

-- Cuándo atiende una categoría.
--
-- Va por categoría y no por producto porque la agenda es del servicio: una
-- veterinaria atiende consultas de 8:30 a 12:00, y eso vale para «consulta
-- general» y para «control de vacunas» por igual. Un producto que necesite otro
-- horario es otra categoría.
create table public.agenda_categoria (
  categoria_id uuid primary key,
  negocio_id uuid not null references public.negocios(id) on delete cascade,

  duracion_minutos integer not null default 30
    check (duracion_minutos between 5 and 480),

  -- Cuántas personas se pueden atender a la misma hora. Dos consultorios son dos
  -- cupos. Es lo que permite que la exclusión no rechace citas legítimas.
  cupo_por_franja smallint not null default 1 check (cupo_por_franja between 1 and 50),

  -- Con cuánta anticipación hay que pedir. Sin esto, alguien reserva a las 9:58
  -- para las 10:00 y el negocio se entera cuando la persona ya está en la puerta.
  anticipacion_minima_horas integer not null default 2
    check (anticipacion_minima_horas between 0 and 168),

  dias_maximos integer not null default 30 check (dias_maximos between 1 and 180),

  -- La semana: [{ "dia": 1, "desde": "08:30", "hasta": "12:00" }, …]
  --
  -- Va como `jsonb` porque se lee y se escribe siempre entera: nadie consulta
  -- «los martes de todos los negocios». Es configuración, no datos.
  franjas jsonb not null default '[]'::jsonb,

  actualizado_en timestamptz not null default now(),

  constraint agenda_padre
    foreign key (categoria_id, negocio_id)
    references public.categorias(id, negocio_id) on delete cascade,

  constraint agenda_franjas_lista check (jsonb_typeof(franjas) = 'array'),
  constraint agenda_franjas_tamano check (jsonb_array_length(franjas) <= 30)
);

create index idx_agenda_negocio on public.agenda_categoria(negocio_id);

comment on table public.agenda_categoria is
  'Cuándo atiende una categoría que vende tiempo. Los horarios concretos se calculan, no se guardan.';
comment on column public.agenda_categoria.franjas is
  'La semana: dia 0..6, desde y hasta en HH:MM. El servidor deriva los horarios con duracion_minutos.';

-- Las citas.
create table public.citas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  producto_id uuid not null,

  codigo text not null default (
    'CITA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),

  -- El horario tomado. Un rango y no dos columnas: el operador de solapamiento
  -- trabaja sobre rangos, y es lo que hace posible la restricción de abajo.
  rango tstzrange not null,

  -- Cuál de los cupos de esa franja ocupa, del 1 al `cupo_por_franja`. Es lo que
  -- permite atender a dos personas a la misma hora sin que la exclusión las
  -- confunda con un choque.
  cupo smallint not null default 1 check (cupo between 1 and 50),

  nombre_cliente text not null check (char_length(trim(nombre_cliente)) between 1 and 80),
  telefono_cliente text not null check (telefono_cliente ~ '^591[67][0-9]{7}$'),
  nota text check (nota is null or char_length(nota) <= 300),

  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmada', 'cancelada', 'cumplida')),

  -- Para que un doble toque en un teléfono lento no genere dos citas. Mismo
  -- mecanismo que ya usan los pedidos.
  idempotencia uuid not null default gen_random_uuid(),

  creado_en timestamptz not null default now(),
  cancelado_en timestamptz,

  constraint citas_padre
    foreign key (producto_id, negocio_id)
    references public.productos(id, negocio_id) on delete cascade,

  constraint citas_codigo_unico unique (codigo),
  constraint citas_idempotencia_unica unique (idempotencia),
  constraint citas_rango_no_vacio check (not isempty(rango)),
  constraint citas_rango_razonable
    check (upper(rango) - lower(rango) between interval '5 minutes' and interval '8 hours'),
  constraint citas_cancelacion_auditada
    check (estado <> 'cancelada' or cancelado_en is not null)
);

create index idx_citas_negocio_rango on public.citas(negocio_id, rango);
create index idx_citas_producto on public.citas(producto_id);

-- **Acá está la garantía.**
--
-- Si dos personas piden las 10:00 en el mismo milisegundo, Postgres rechaza la
-- segunda con violación de restricción. No hay ventana entre «consulté si estaba
-- libre» y «lo guardé», que es exactamente el error que produce dobles reservas
-- en producción y que además no se puede probar que no ocurre, porque depende
-- del tiempo.
--
-- Las canceladas quedan fuera: su horario vuelve a estar disponible.
alter table public.citas
  add constraint citas_sin_solapamiento
  exclude using gist (
    producto_id with =,
    cupo with =,
    rango with &&
  ) where (estado <> 'cancelada');

comment on constraint citas_sin_solapamiento on public.citas is
  'Impide el doble agendamiento. Lo decide el motor, no la aplicación.';

alter table public.agenda_categoria enable row level security;
alter table public.citas enable row level security;

-- La agenda la lee el catálogo público para dibujar el calendario.
create policy "agenda_publica_activa"
on public.agenda_categoria for select to anon
using (
  exists (
    select 1 from public.negocios
    where negocios.id = agenda_categoria.negocio_id and negocios.activo = true
  )
);

create policy "administra_agenda_propia"
on public.agenda_categoria for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = agenda_categoria.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = agenda_categoria.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

-- Las citas **no las lee `anon`**, y es a propósito: tienen nombre y teléfono de
-- personas. El catálogo público necesita saber qué horarios están ocupados, no
-- quién los ocupó, y eso lo resuelve una función que devuelve solo la cuenta.
create policy "administra_citas_propias"
on public.citas for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = citas.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = citas.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

grant select on table public.agenda_categoria to anon;
grant select, insert, update, delete on table public.agenda_categoria to authenticated;
grant select, insert, update, delete on table public.agenda_categoria to service_role;

grant select, insert, update, delete on table public.citas to authenticated;
grant select, insert, update, delete on table public.citas to service_role;

-- Cuántos cupos hay tomados en cada franja de un producto, en un rango de días.
--
-- Existe para que el catálogo público pueda decir «las 9:00 están llenas» sin
-- leer una sola fila de `citas`: devuelve la cuenta, nunca el nombre ni el
-- teléfono de quien reservó. Por eso es `security definer` y `anon` la puede
-- ejecutar, mientras que la tabla le sigue estando cerrada.
create or replace function public.cupos_tomados(
  p_producto_id uuid,
  p_desde timestamptz,
  p_hasta timestamptz
)
returns table (inicio timestamptz, tomados bigint)
language sql
security definer
set search_path = ''
stable
as $funcion$
  select lower(cita.rango) as inicio, count(*) as tomados
  from public.citas as cita
  join public.productos as producto on producto.id = cita.producto_id
  join public.negocios as negocio on negocio.id = producto.negocio_id
  where cita.producto_id = p_producto_id
    and cita.estado <> 'cancelada'
    and negocio.activo = true
    and cita.rango && tstzrange(p_desde, p_hasta)
  group by lower(cita.rango);
$funcion$;

revoke all on function public.cupos_tomados(uuid, timestamptz, timestamptz) from public;
grant execute on function public.cupos_tomados(uuid, timestamptz, timestamptz) to anon;
grant execute on function public.cupos_tomados(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.cupos_tomados(uuid, timestamptz, timestamptz) to service_role;

comment on function public.cupos_tomados(uuid, timestamptz, timestamptz) is
  'Cuántos cupos hay tomados por franja. Devuelve cuentas, nunca datos de quien reservó.';
