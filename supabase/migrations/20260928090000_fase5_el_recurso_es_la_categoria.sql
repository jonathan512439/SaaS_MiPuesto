-- El calendario es de la categoría, no del producto.
--
-- El defecto: la agenda estaba en la categoría y el choque en el producto. Dos
-- niveles distintos para la misma cosa, y por eso se contradecían. Un
-- consultorio con un solo profesional y cinco tipos de consulta podía quedar con
-- dos citas a la misma hora, porque eran productos distintos.
--
-- Lo que el negocio tiene no es un calendario por servicio: es **un profesional**
-- que atiende cinco cosas. El recurso escaso es la persona, y la persona es la
-- categoría. `cupo_por_franja` pasa a significar cuántos profesionales o
-- consultorios hay, y ese número lo comparten todos los servicios de adentro.

-- 1. La cita recuerda de qué categoría es.
--
-- Se guarda aunque se pueda deducir del producto, porque la restricción de
-- exclusión necesita la columna en la propia fila: no puede mirar otra tabla.
alter table public.citas
  add column categoria_id uuid;

update public.citas as cita
set categoria_id = producto.categoria_id
from public.productos as producto
where producto.id = cita.producto_id;

-- Si alguna cita quedara sin categoría, esto falla acá y no en silencio. Una
-- cita de un producto sin categoría no puede existir —la agenda es de la
-- categoría—, así que sería una fila rota que conviene descubrir ahora.
alter table public.citas
  alter column categoria_id set not null;

-- La misma clave compuesta que el resto: el motor impide que la cita del negocio
-- A cuelgue de una categoría del B.
alter table public.citas
  add constraint citas_categoria_padre
    foreign key (categoria_id, negocio_id)
    references public.categorias(id, negocio_id) on delete cascade;

create index idx_citas_categoria_rango on public.citas(categoria_id, rango);

-- 1 bis. Las citas que el defecto ya dejó chocadas.
--
-- La restricción no se puede crear sobre datos que la violan, y los datos la
-- violan: eso mismo es la prueba de que el defecto era real. Al aplicar esta
-- migración aparecieron dos citas en la misma categoría, el mismo cupo y la
-- misma hora, de productos distintos.
--
-- Se cancelan las que llegaron después, no las primeras: quien reservó antes es
-- quien tiene el turno. Se marcan como canceladas en vez de borrarse para que el
-- dueño las vea en su panel y pueda avisar; borrarlas haría desaparecer a una
-- persona que cree tener hora.
--
-- **Si esto cancela algo, hay que avisarle a esa persona.** El sistema no puede
-- hacerlo por su cuenta: no manda mensajes sin que el dueño apriete el botón.
do $$
begin
  loop
    with conflictivas as (
      select posterior.id
      from public.citas as posterior
      join public.citas as anterior
        on anterior.categoria_id = posterior.categoria_id
       and anterior.cupo = posterior.cupo
       and anterior.rango && posterior.rango
       and anterior.id <> posterior.id
       and anterior.estado <> 'cancelada'
       and (anterior.creado_en, anterior.id) < (posterior.creado_en, posterior.id)
      where posterior.estado <> 'cancelada'
    )
    update public.citas
    set estado = 'cancelada', cancelado_en = now()
    where id in (select id from conflictivas);

    exit when not found;
  end loop;
end;
$$;

-- 2. **El cambio que arregla el defecto.**
--
-- Antes: dos citas chocaban solo si eran del mismo producto. Ahora chocan si son
-- de la misma categoría, que es decir «del mismo profesional».
alter table public.citas
  drop constraint citas_sin_solapamiento;

alter table public.citas
  add constraint citas_sin_solapamiento
  exclude using gist (
    categoria_id with =,
    cupo with =,
    rango with &&
  ) where (estado <> 'cancelada');

comment on constraint citas_sin_solapamiento on public.citas is
  'Impide el doble agendamiento dentro de una categoría: es el calendario del profesional.';

-- 3. La duración baja al producto.
--
-- Una valoración completa dura una hora y una vacunación quince minutos, y las
-- dos las atiende la misma persona en la misma agenda. Con la duración en la
-- categoría, los cinco servicios duraban lo mismo.
--
-- Admite nulo y eso significa «la de su categoría»: los productos que ya existen
-- siguen funcionando igual sin tocarlos, y el dueño solo escribe la duración
-- donde de verdad es distinta.
alter table public.productos
  add column duracion_minutos integer
    check (duracion_minutos is null or duracion_minutos between 5 and 480);

comment on column public.productos.duracion_minutos is
  'Cuánto dura este servicio. Nulo: la duración de su categoría.';

comment on column public.agenda_categoria.duracion_minutos is
  'La duración por omisión de los servicios de esta categoría. Cada producto puede tener la suya.';

grant select (duracion_minutos) on table public.productos to anon;

-- 4. Qué está ocupado, por categoría.
--
-- Reemplaza a `cupos_tomados`, que contaba por hora de comienzo. Con duraciones
-- distintas eso ya no sirve: una cita de 10:00 a 11:00 no «ocupa las 10:00»,
-- ocupa un rango, y hay que saber cuál para decidir si un turno de quince
-- minutos a las 10:30 entra o no.
--
-- Devuelve rangos y el número de cupo. Nunca el nombre ni el teléfono: las citas
-- guardan datos de personas y `anon` no lee esa tabla.
create or replace function public.ocupacion_categoria(
  p_categoria_id uuid,
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
  where cita.categoria_id = p_categoria_id
    and cita.estado <> 'cancelada'
    and negocio.activo = true
    and cita.rango && tstzrange(p_desde, p_hasta);
$funcion$;

revoke all on function public.ocupacion_categoria(uuid, timestamptz, timestamptz) from public;
grant execute on function public.ocupacion_categoria(uuid, timestamptz, timestamptz) to anon;
grant execute on function public.ocupacion_categoria(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.ocupacion_categoria(uuid, timestamptz, timestamptz) to service_role;

-- La misma información para todo un negocio, que es lo que el catálogo necesita
-- para poner el próximo turno libre en cada tarjeta sin una consulta por
-- tarjeta.
create or replace function public.ocupacion_negocio(
  p_negocio_id uuid,
  p_desde timestamptz,
  p_hasta timestamptz
)
returns table (categoria_id uuid, inicio timestamptz, fin timestamptz, cupo smallint)
language sql
security definer
set search_path = ''
stable
as $funcion$
  select cita.categoria_id, lower(cita.rango), upper(cita.rango), cita.cupo
  from public.citas as cita
  join public.negocios as negocio on negocio.id = cita.negocio_id
  where cita.negocio_id = p_negocio_id
    and cita.estado <> 'cancelada'
    and negocio.activo = true
    and cita.rango && tstzrange(p_desde, p_hasta);
$funcion$;

revoke all on function public.ocupacion_negocio(uuid, timestamptz, timestamptz) from public;
grant execute on function public.ocupacion_negocio(uuid, timestamptz, timestamptz) to anon;
grant execute on function public.ocupacion_negocio(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.ocupacion_negocio(uuid, timestamptz, timestamptz) to service_role;

-- Las dos anteriores se van. Contaban por hora de comienzo, que con duraciones
-- distintas da la respuesta equivocada, y dejarlas invitaría a usarlas.
drop function if exists public.cupos_tomados(uuid, timestamptz, timestamptz);
drop function if exists public.cupos_tomados_negocio(uuid, timestamptz, timestamptz);
