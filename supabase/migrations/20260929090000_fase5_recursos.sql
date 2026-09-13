-- El recurso: quién hace el trabajo.
--
-- Tercera corrección del mismo eje, y la definitiva. Primero el calendario era
-- del producto; después de la categoría; y la categoría tampoco era: en una
-- veterinaria, «Consultas» agrupa la consulta del doctor y el baño del peluquero
-- porque al cliente le resulta natural buscarlos juntos, pero son dos agendas.
--
-- Son dos ejes distintos y ahora quedan separados:
--
--   categoría   cómo navega el cliente. Las esferas del catálogo.
--   recurso     quién hace el trabajo. El doctor, el peluquero, el consultorio.
--
-- Dos productos chocan si comparten recurso, y no si no. El horario de atención
-- es del recurso, porque el peluquero viene los sábados y el doctor no.

create table public.recursos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  nombre text not null check (char_length(trim(nombre)) between 1 and 60),
  orden integer not null default 0,
  activo boolean not null default true,

  -- El botón de apagar. Con esto en falso, el catálogo deja de ofrecer horarios
  -- de este recurso y el dueño sigue pudiendo cargar citas a mano. Es lo que
  -- necesita el día que el doctor se enferma o el local cierra por inventario.
  acepta_reservas boolean not null default true,

  creado_en timestamptz not null default now(),

  constraint recursos_id_negocio unique (id, negocio_id),
  constraint recursos_nombre_unico unique (negocio_id, nombre)
);

create index idx_recursos_negocio on public.recursos(negocio_id, orden);

comment on table public.recursos is
  'Quién hace el trabajo: un profesional, un consultorio, una silla. El calendario es suyo.';
comment on column public.recursos.acepta_reservas is
  'En falso, el catálogo no ofrece horarios de este recurso. El dueño sigue cargando citas a mano.';

-- El horario de atención, ahora del recurso.
create table public.agenda_recurso (
  recurso_id uuid primary key,
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  duracion_minutos integer not null default 30
    check (duracion_minutos between 5 and 480),
  cupo_por_franja smallint not null default 1 check (cupo_por_franja between 1 and 50),
  anticipacion_minima_horas integer not null default 2
    check (anticipacion_minima_horas between 0 and 168),
  dias_maximos integer not null default 30 check (dias_maximos between 1 and 180),
  franjas jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now(),

  constraint agenda_recurso_padre
    foreign key (recurso_id, negocio_id)
    references public.recursos(id, negocio_id) on delete cascade,
  constraint agenda_recurso_franjas_lista check (jsonb_typeof(franjas) = 'array'),
  constraint agenda_recurso_franjas_tamano check (jsonb_array_length(franjas) <= 30)
);

comment on column public.agenda_recurso.cupo_por_franja is
  'A cuántas personas atiende este recurso a la vez. Tres sillas idénticas: 3.';

-- El producto dice quién lo atiende.
alter table public.productos
  add column recurso_id uuid;

alter table public.productos
  add constraint productos_recurso
    foreign key (recurso_id, negocio_id)
    references public.recursos(id, negocio_id) on delete set null;

create index idx_productos_recurso on public.productos(recurso_id);

comment on column public.productos.recurso_id is
  'Quién atiende este servicio. Solo tiene sentido en categorías que venden tiempo.';

-- La cita recuerda el recurso: la exclusión mira esta columna.
alter table public.citas
  add column recurso_id uuid;

-- De dónde salió y una nota para el dueño. Una cita cargada a mano es la de
-- alguien que llamó por teléfono, o un bloqueo —«se fue al banco»— y la nota es
-- lo que le recuerda al dueño por qué esa hora está tomada.
alter table public.citas
  add column origen text not null default 'catalogo'
    check (origen in ('catalogo', 'manual')),
  add column nota_interna text check (nota_interna is null or char_length(nota_interna) <= 300);

-- Una cita a mano puede no tener teléfono: el dueño bloquea las 10:00 porque
-- tiene una reunión, y no hay a quién llamar. Se afloja la obligatoriedad y se
-- conserva el formato para cuando sí viene.
alter table public.citas
  drop constraint citas_telefono_cliente_check;
alter table public.citas
  add constraint citas_telefono_formato
    check (telefono_cliente is null or telefono_cliente ~ '^591[67][0-9]{7}$');
alter table public.citas
  alter column telefono_cliente drop not null;

-- Lo que ya existe se acomoda: un recurso por cada categoría que vendía tiempo,
-- con su mismo nombre y su misma agenda. Nada de lo que hoy funciona cambia de
-- comportamiento; solo cambia de dueño.
do $$
declare
  fila record;
  nuevo uuid;
begin
  for fila in
    select c.id as categoria_id, c.negocio_id, c.nombre
    from public.categorias as c
    where c.vende = 'tiempo'
  loop
    insert into public.recursos (negocio_id, nombre)
    values (fila.negocio_id, fila.nombre)
    on conflict (negocio_id, nombre) do update set nombre = excluded.nombre
    returning id into nuevo;

    insert into public.agenda_recurso
      (recurso_id, negocio_id, duracion_minutos, cupo_por_franja,
       anticipacion_minima_horas, dias_maximos, franjas)
    select nuevo, a.negocio_id, a.duracion_minutos, a.cupo_por_franja,
           a.anticipacion_minima_horas, a.dias_maximos, a.franjas
    from public.agenda_categoria as a
    where a.categoria_id = fila.categoria_id
    on conflict (recurso_id) do nothing;

    update public.productos
    set recurso_id = nuevo
    where categoria_id = fila.categoria_id and recurso_id is null;

    update public.citas
    set recurso_id = nuevo
    where categoria_id = fila.categoria_id and recurso_id is null;
  end loop;
end;
$$;

-- Si alguna cita quedó sin recurso, esto falla acá y no en silencio.
alter table public.citas
  alter column recurso_id set not null;

alter table public.citas
  add constraint citas_recurso_padre
    foreign key (recurso_id, negocio_id)
    references public.recursos(id, negocio_id) on delete cascade;

create index idx_citas_recurso_rango on public.citas(recurso_id, rango);

-- **La exclusión, en el nivel correcto.** Dos citas chocan si son del mismo
-- recurso: la misma persona no puede estar en dos lugares.
alter table public.citas
  drop constraint citas_sin_solapamiento;

alter table public.citas
  add constraint citas_sin_solapamiento
  exclude using gist (
    recurso_id with =,
    cupo with =,
    rango with &&
  ) where (estado <> 'cancelada');

comment on constraint citas_sin_solapamiento on public.citas is
  'Impide el doble agendamiento de un recurso: la misma persona no puede estar en dos citas.';

-- La agenda por categoría se va. Dejarla invitaría a leerla.
drop table public.agenda_categoria;

-- RLS y permisos, con la misma forma que el resto.
alter table public.recursos enable row level security;
alter table public.agenda_recurso enable row level security;

create policy "recursos_publicos_activos"
on public.recursos for select to anon
using (
  exists (
    select 1 from public.negocios
    where negocios.id = recursos.negocio_id and negocios.activo = true
  )
);

create policy "administra_recursos_propios"
on public.recursos for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = recursos.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = recursos.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

create policy "agenda_recurso_publica_activa"
on public.agenda_recurso for select to anon
using (
  exists (
    select 1 from public.negocios
    where negocios.id = agenda_recurso.negocio_id and negocios.activo = true
  )
);

create policy "administra_agenda_recurso_propia"
on public.agenda_recurso for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = agenda_recurso.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = agenda_recurso.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

grant select on table public.recursos to anon;
grant select, insert, update, delete on table public.recursos to authenticated;
grant select, insert, update, delete on table public.recursos to service_role;

grant select on table public.agenda_recurso to anon;
grant select, insert, update, delete on table public.agenda_recurso to authenticated;
grant select, insert, update, delete on table public.agenda_recurso to service_role;

grant select (recurso_id) on table public.productos to anon;

-- Lo ocupado, por recurso. Reemplazan a las dos por categoría.
drop function if exists public.ocupacion_categoria(uuid, timestamptz, timestamptz);
drop function if exists public.ocupacion_negocio(uuid, timestamptz, timestamptz);

create or replace function public.ocupacion_recurso(
  p_recurso_id uuid,
  p_desde timestamptz,
  p_hasta timestamptz
)
returns table (inicio timestamptz, fin timestamptz, cupo smallint)
language sql
security definer
set search_path = ''
stable
as $funcion$
  select lower(cita.rango), upper(cita.rango), cita.cupo
  from public.citas as cita
  join public.negocios as negocio on negocio.id = cita.negocio_id
  where cita.recurso_id = p_recurso_id
    and cita.estado <> 'cancelada'
    and negocio.activo = true
    and cita.rango && tstzrange(p_desde, p_hasta);
$funcion$;

revoke all on function public.ocupacion_recurso(uuid, timestamptz, timestamptz) from public;
grant execute on function public.ocupacion_recurso(uuid, timestamptz, timestamptz) to anon;
grant execute on function public.ocupacion_recurso(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.ocupacion_recurso(uuid, timestamptz, timestamptz) to service_role;

comment on function public.ocupacion_recurso(uuid, timestamptz, timestamptz) is
  'Qué está ocupado en el calendario de un recurso. Rangos y cupos, nunca datos de quien reservó.';
