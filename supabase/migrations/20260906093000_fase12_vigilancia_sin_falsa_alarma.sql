-- Ajuste a la vigilancia recién agregada.
--
-- La primera versión marcaba «atrasada» una tarea que nunca corrió, y una tarea
-- recién creada nunca corrió: la purga de analítica se programó a las 08:30 UTC
-- pasadas las 09:00, así que su primera corrida es mañana. Una alarma que suena
-- el día uno por algo que está bien es una alarma que se aprende a ignorar, y
-- entonces no sirve el día que suene de verdad.
--
-- Ahora se distingue «nunca corrió» de «dejó de correr». Lo primero es un aviso
-- que se apaga solo; lo segundo es una falla.

-- Postgres no deja cambiar el tipo de retorno con `create or replace`, y esta
-- versión devuelve una columna más.
drop function if exists public.estado_tareas();

create function public.estado_tareas()
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
      ('mipuesto-purgar-analitica', 1560),
      ('mipuesto-suspender-vencidos', 1560)
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
    /* Una tarea que ni siquiera está programada sí es una falla: alguien la
       borró o la migración no se aplicó. */
    programada = 0
      or (ultima is not null and now() - ultima > make_interval(mins => tolerancia))
  from ultimas
  order by nombre;
$$;

comment on function public.estado_tareas() is
  'Última corrida exitosa de cada tarea programada. Distingue una tarea que nunca corrió de una que dejó de correr. No expone datos de ningún negocio.';

revoke all on function public.estado_tareas() from public, anon, authenticated;
