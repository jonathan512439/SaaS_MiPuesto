-- Lo que hay que crear DESPUÉS de restaurar el volcado.
--
-- Las cinco tareas programadas viven en el esquema `cron`, que **no se
-- respalda**: no es de la aplicación, es de la extensión. Una base restaurada
-- sin esto queda con todos los datos y sin nada que corra sola: las reservas no
-- expiran, los vencidos no se suspenden, la analítica no se purga y el vigilante
-- de salud no vigila. Todo se ve bien hasta que alguien mira por qué el carrito
-- de un comprador de anteayer sigue reservado.
--
-- Se aplica después de `pg_restore`, cuando las funciones que invoca ya existen.
--
-- **Esta lista tiene que coincidir con la de `public.estado_tareas()`.** Si se
-- programa una tarea nueva y no se suma acá, la base restaurada la pierde en
-- silencio. Lo verifica `scripts/check-tareas-programadas.mjs`, que falla el
-- build: ya hubo una vez un vigilante que nadie vigilaba.

do $$
declare
  v_job_id bigint;
  v_tarea record;
begin
  for v_tarea in
    select * from (values
      ('mipuesto-expirar-reservas',  '* * * * *',   'select public.expirar_reservas_vencidas(500);'),
      ('mipuesto-vigilar-salud',     '*/5 * * * *', 'select public.vigilar_salud();'),
      ('mipuesto-purgar-vigilancia', '30 4 * * *',  'select public.purgar_vigilancia_salud();'),
      ('mipuesto-purgar-analitica',  '30 8 * * *',  'select public.purgar_analitica_vieja();'),
      ('mipuesto-suspender-vencidos','0 9 * * *',   'select public.suspender_suscripciones_vencidas();')
    ) as t(nombre, horario, sentencia)
  loop
    -- Idempotente: se puede correr dos veces sin duplicar la tarea. El ensayo
    -- de restauración se repite, y una restauración que solo funciona la primera
    -- vez no es un procedimiento.
    select jobid into v_job_id from cron.job where jobname = v_tarea.nombre;
    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;

    perform cron.schedule(v_tarea.nombre, v_tarea.horario, v_tarea.sentencia);
  end loop;
end;
$$;

-- Que quede a la vista en el registro del flujo qué quedó programado.
select jobname as tarea, schedule as horario, active as activa
from cron.job
where jobname like 'mipuesto-%'
order by jobname;
