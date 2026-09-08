-- El vigilante también se vigila.
--
-- La fase anterior programó dos tareas nuevas y **se olvidó de sumarlas a la
-- lista que mira `/api/salud`**. El resultado era un vigilante que nadie
-- vigilaba: si la tarea que pregunta cada cinco minutos se detenía, no pasaba
-- nada visible. Dejaba de haber mediciones, dejaba de haber avisos, y la
-- pantalla decía «todo sano» porque nadie estaba preguntando.
--
-- Con las dos en la lista, el círculo se cierra desde afuera: la comprobación
-- diaria de GitHub le pregunta a `/api/salud`, esa ruta mira estas tareas, y una
-- tarea detenida sale como `tareas_atrasadas` con un 503. Quien avisa que el
-- vigilante murió es el de afuera, que es el único que puede.

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
      -- Cada cinco minutos, igual que expirar reservas: con veinte de plazo, tres
      -- fallos seguidos ya cuentan como detenida.
      ('mipuesto-vigilar-salud', 20),
      ('mipuesto-purgar-analitica', 1560),
      ('mipuesto-suspender-vencidos', 1560),
      ('mipuesto-purgar-vigilancia', 1560)
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
  'Última corrida exitosa de cada tarea programada, incluida la que vigila la salud del sitio. Distingue una tarea que nunca corrió de una que dejó de correr. No expone datos de ningún negocio.';

revoke all on function public.estado_tareas() from public, anon, authenticated;
