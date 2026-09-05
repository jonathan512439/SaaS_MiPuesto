-- Retención de la analítica pública.
--
-- `eventos_analitica` crece con cada visita y nunca se limpiaba. A 500 visitas
-- diarias son unas 550.000 filas al año, que en el plan gratuito de la base es
-- la mitad del espacio disponible gastado en datos que nadie mira: el panel
-- resume los últimos siete días.
--
-- Noventa días es el mismo plazo que la privacidad promete para los datos de un
-- negocio dado de baja, así que no hay dos relojes que explicar.

create or replace function public.purgar_analitica_vieja(p_dias integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borrados integer;
begin
  delete from public.eventos_analitica
  where creado_en < now() - make_interval(days => p_dias);

  get diagnostics v_borrados = row_count;
  return v_borrados;
end;
$$;

comment on function public.purgar_analitica_vieja(integer) is
  'Borra los eventos de analítica anteriores al plazo indicado. El panel solo resume los últimos siete días.';

revoke all on function public.purgar_analitica_vieja(integer) from public, anon, authenticated;

-- A las 08:30 UTC, media hora antes del corte por vencimiento: dos trabajos
-- pesados a la misma hora se estorban sin necesidad.
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'mipuesto-purgar-analitica';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'mipuesto-purgar-analitica',
    '30 8 * * *',
    $cron$select public.purgar_analitica_vieja();$cron$
  );
end;
$$;
