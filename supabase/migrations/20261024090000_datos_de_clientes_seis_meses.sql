-- El nombre y el teléfono de los clientes finales se borran a los seis meses.
--
-- La política de privacidad lo prometía desde el principio —«pasados seis meses
-- de un pedido cerrado los quitamos»— y nada lo hacía. Decidido por el dueño del
-- proyecto el 2026-09-24: seis meses, para pedidos y para citas.
--
-- **Se borra el dato, no el registro.** El pedido queda con su total, sus
-- productos y su fecha: es lo que el dueño usa para saber qué vende, y no
-- identifica a nadie. `datos_cliente_borrados_en` dice cuándo se borró, para que
-- el panel pueda decirlo en vez de mostrar un cliente vacío sin explicación.
--
-- Qué se borra:
--   - pedidos: `cliente_nombre` y `cliente_telefono`.
--   - citas: `nombre_cliente` (no admite nulo: queda «Datos borrados»),
--     `telefono_cliente` y `nota`, que la escribe el cliente y puede traer una
--     dirección o un teléfono.
--   - `nota_interna` de la cita **no**: la escribe el dueño, es suya.
--
-- Desde cuándo se cuenta:
--   - pedido: desde que se hizo, y solo si ya está cerrado. Uno pendiente no
--     llega a seis meses —vence en minutos—, pero si llegara, se respeta.
--   - cita: desde el turno, no desde que se pidió. Un turno reservado con
--     meses de anticipación no puede perder el teléfono antes de ocurrir.

alter table public.pedidos
  add column datos_cliente_borrados_en timestamptz;

alter table public.citas
  add column datos_cliente_borrados_en timestamptz;

comment on column public.pedidos.datos_cliente_borrados_en is
  'Cuándo se borraron el nombre y el teléfono del cliente: a los seis meses, o antes si lo pidió.';
comment on column public.citas.datos_cliente_borrados_en is
  'Cuándo se borraron el nombre, el teléfono y la nota del cliente: a los seis meses del turno, o antes si lo pidió.';

-- El texto que queda en lugar del nombre de la cita. Una constante y no un
-- literal repetido: el panel la reconoce para decir «datos borrados».
create or replace function public.texto_datos_borrados()
returns text
language sql
immutable
set search_path = ''
as $$ select 'Datos borrados'::text $$;

revoke all on function public.texto_datos_borrados() from public;
grant execute on function public.texto_datos_borrados() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. El borrado por antigüedad, una vez por día.
-- ---------------------------------------------------------------------------
create or replace function public.borrar_datos_de_clientes_viejos(p_meses integer default 6)
returns table (pedidos integer, citas integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedidos integer;
  v_citas integer;
  v_corte timestamptz;
begin
  if p_meses is null or p_meses < 1 then
    raise exception using errcode = 'P0001', message = 'PLAZO_INVALIDO';
  end if;
  v_corte := now() - make_interval(months => p_meses);

  update public.pedidos
  set cliente_nombre = null,
      cliente_telefono = null,
      datos_cliente_borrados_en = now()
  where creado_en < v_corte
    and estado <> 'pendiente'
    and datos_cliente_borrados_en is null
    and (cliente_nombre is not null or cliente_telefono is not null);
  get diagnostics v_pedidos = row_count;

  update public.citas
  set nombre_cliente = public.texto_datos_borrados(),
      telefono_cliente = null,
      nota = null,
      datos_cliente_borrados_en = now()
  where upper(rango) < v_corte
    and datos_cliente_borrados_en is null;
  get diagnostics v_citas = row_count;

  return query select v_pedidos, v_citas;
end;
$$;

comment on function public.borrar_datos_de_clientes_viejos(integer) is
  'Borra nombre y teléfono de los clientes en pedidos cerrados y citas pasadas hace más del plazo, en meses. Seis por omisión, como promete la política de privacidad.';

revoke all on function public.borrar_datos_de_clientes_viejos(integer) from public, anon, authenticated;
grant execute on function public.borrar_datos_de_clientes_viejos(integer) to service_role;

-- ---------------------------------------------------------------------------
-- 2. El borrado a pedido de un cliente: «borren mis datos».
--
-- Por teléfono, que es lo que el cliente sabe y lo que lo identifica en todos
-- los negocios. Borra en todos, también en lo pendiente: el pedido sigue, pero
-- el negocio ya no tiene cómo escribirle, y eso es lo que el cliente pidió.
-- Solo la clave de servicio: se corre con `npm run privacidad:borrar-cliente`.
-- ---------------------------------------------------------------------------
create or replace function public.borrar_datos_de_un_cliente(p_telefono text)
returns table (pedidos integer, citas integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedidos integer;
  v_citas integer;
begin
  if p_telefono is null or p_telefono !~ '^591[67][0-9]{7}$' then
    raise exception using errcode = 'P0001', message = 'TELEFONO_INVALIDO';
  end if;

  update public.pedidos
  set cliente_nombre = null,
      cliente_telefono = null,
      datos_cliente_borrados_en = now()
  where cliente_telefono = p_telefono;
  get diagnostics v_pedidos = row_count;

  update public.citas
  set nombre_cliente = public.texto_datos_borrados(),
      telefono_cliente = null,
      nota = null,
      datos_cliente_borrados_en = now()
  where telefono_cliente = p_telefono;
  get diagnostics v_citas = row_count;

  return query select v_pedidos, v_citas;
end;
$$;

comment on function public.borrar_datos_de_un_cliente(text) is
  'Borra nombre, teléfono y nota de un cliente final en todos los negocios, por su teléfono. Para cuando el cliente lo pide.';

revoke all on function public.borrar_datos_de_un_cliente(text) from public, anon, authenticated;
grant execute on function public.borrar_datos_de_un_cliente(text) to service_role;

-- Para buscar por teléfono sin recorrer todos los pedidos.
create index if not exists idx_pedidos_cliente_telefono
  on public.pedidos (cliente_telefono)
  where cliente_telefono is not null;
create index if not exists idx_citas_telefono_cliente
  on public.citas (telefono_cliente)
  where telefono_cliente is not null;

-- ---------------------------------------------------------------------------
-- 3. La tarea, a las 08:15 UTC: antes de la purga de analítica (08:30) y de
--    búsquedas (08:45), para no juntar dos trabajos pesados.
-- ---------------------------------------------------------------------------
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'mipuesto-borrar-datos-clientes';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'mipuesto-borrar-datos-clientes',
    '15 8 * * *',
    $cron$select public.borrar_datos_de_clientes_viejos();$cron$
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. El vigilante la cuenta: una tarea diaria que deja de correr no se nota
--    hasta que alguien pregunta por qué un pedido de hace un año tiene nombre.
-- ---------------------------------------------------------------------------
create or replace function public.estado_tareas()
returns table (
  tarea text,
  ultima_corrida timestamptz,
  minutos_desde numeric,
  tolerancia_minutos integer,
  nunca_corrio boolean,
  atrasada boolean
)
language sql
security definer
set search_path = ''
as $$
  with esperadas(nombre, tolerancia) as (
    values
      ('mipuesto-expirar-reservas', 20),
      ('mipuesto-vigilar-salud', 20),
      ('mipuesto-purgar-analitica', 1560),
      ('mipuesto-suspender-vencidos', 1560),
      ('mipuesto-purgar-vigilancia', 1560),
      ('mipuesto-purgar-busquedas', 1560),
      ('mipuesto-borrar-datos-clientes', 1560)
  ),
  ultimas as (
    select
      e.nombre,
      e.tolerancia,
      max(d.end_time) filter (where d.status = 'succeeded') as ultima,
      count(j.jobid) as programada
    from esperadas e
    left join cron.job j on j.jobname = e.nombre
    left join cron.job_run_details d on d.jobid = j.jobid
    group by e.nombre, e.tolerancia
  )
  select
    nombre::text,
    ultima,
    round(extract(epoch from (now() - ultima)) / 60, 1),
    tolerancia,
    ultima is null,
    programada = 0
      or (ultima is not null and now() - ultima > make_interval(mins => tolerancia))
  from ultimas
  order by nombre;
$$;

revoke all on function public.estado_tareas() from public, anon, authenticated;
grant execute on function public.estado_tareas() to service_role;
