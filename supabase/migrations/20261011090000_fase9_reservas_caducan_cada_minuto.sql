-- Las reservas vencidas se liberan cada minuto y de a quinientas.
--
-- La tarea corría cada cinco minutos con el tope por omisión de cien: veinte
-- caducidades por minuto como mucho. La auditoría previa al MVP lo marcó: con
-- tráfico alto las reservas vencen más rápido de lo que se liberan, y cada una
-- vencida y no liberada sigue sumando en `cantidad_reservada`. El comprador ve
-- «agotado» en un producto que está en el estante, y el dueño lo lee como un
-- error de inventario.
--
-- Cada minuto y con quinientas —el techo que la propia función acepta— son
-- quinientas por minuto, veinticinco veces más. La función ya toma las filas con
-- `for update skip locked`, así que dos corridas que se pisen no se bloquean.
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'mipuesto-expirar-reservas';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'mipuesto-expirar-reservas',
    '* * * * *',
    $cron$select public.expirar_reservas_vencidas(500);$cron$
  );
end;
$$;
