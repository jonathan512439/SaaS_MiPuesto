-- Vigilancia de las tareas programadas.
--
-- Tres trabajos sostienen la operación sin que nadie los mire: expirar reservas,
-- purgar analítica y suspender vencidos. Si uno deja de correr no pasa nada
-- visible —el catálogo sigue en pie— y por eso es peligroso: un corte que no
-- corre publica gratis a quien no pagó, y nadie se entera hasta revisar a mano.
--
-- Esta función dice, para cada tarea, cuándo corrió bien por última vez y si esa
-- fecha ya se pasó del plazo que le corresponde.

create or replace function public.estado_tareas()
returns table (
  tarea text,
  ultima_corrida timestamptz,
  minutos_desde numeric,
  tolerancia_minutos integer,
  atrasada boolean
)
language sql
security definer
set search_path = ''
as $$
  with esperadas(nombre, tolerancia) as (
    values
      -- Corre cada cinco minutos: tres fallos seguidos ya es un problema.
      ('mipuesto-expirar-reservas', 20),
      -- Diarias: se tolera un día y dos horas antes de avisar, para no llorar
      -- por un retraso de minutos en el planificador.
      ('mipuesto-purgar-analitica', 1560),
      ('mipuesto-suspender-vencidos', 1560)
  ),
  ultimas as (
    select
      e.nombre,
      e.tolerancia,
      max(d.end_time) filter (where d.status = 'succeeded') as ultima
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
    ultima is null or now() - ultima > make_interval(mins => tolerancia)
  from ultimas
  order by nombre;
$$;

comment on function public.estado_tareas() is
  'Última corrida exitosa de cada tarea programada y si se pasó de su plazo. No expone datos de ningún negocio.';

revoke all on function public.estado_tareas() from public, anon, authenticated;
