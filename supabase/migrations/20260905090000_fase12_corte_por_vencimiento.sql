-- Fase 12: corte automático por vencimiento.
--
-- Los términos prometen que un catálogo impago deja de publicarse. Hasta ahora
-- nada lo hacía: `evaluarSuscripcion` solo pintaba un aviso en el panel y la
-- única forma de bajar un catálogo era entrar a la consola a mano.
--
-- El interruptor sigue siendo uno solo, `activo`, y esta columna guarda por qué
-- se apagó. Se eligió así en vez de agregar una segunda condición de
-- visibilidad porque `activo` ya gobierna siete políticas de RLS y seis
-- consultas: sumar un segundo criterio obligaba a tocarlas todas, y olvidar una
-- sola dejaría publicado a quien no pagó.
--
-- Con la razón guardada, la renovación puede deshacer solo lo que este trabajo
-- hizo, y nunca republicar un catálogo que se bajó a mano por otro motivo.

alter table public.negocios
  add column suspendido_en timestamptz;

comment on column public.negocios.suspendido_en is
  'Cuándo se bajó el catálogo por falta de pago. Nulo si sigue publicado o si se bajó a mano por otro motivo.';

-- No se agregan permisos, y conviene dejarlo escrito porque la omisión es la
-- que protege la columna:
--
--   * `anon` tiene `grant select` por lista de columnas y esta queda fuera, así
--     que el estado de pago de un negocio no se puede consultar desde el
--     catálogo público.
--   * `authenticated` conserva `select` sobre toda la tabla —el dueño ve por
--     qué está fuera de línea— pero su `grant update` es por lista y no incluye
--     ni esta columna ni `activo`. Sin eso, cualquier administrador podría
--     republicarse solo con una petición a la API.

create or replace function public.suspender_suscripciones_vencidas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_suspendidos integer;
begin
  update public.negocios
  set activo = false,
      suspendido_en = now()
  where suscripcion_vence_en < now()
    and activo = true
    and suspendido_en is null;

  get diagnostics v_suspendidos = row_count;
  return v_suspendidos;
end;
$$;

comment on function public.suspender_suscripciones_vencidas() is
  'Baja los catálogos con la suscripción vencida y anota el motivo. Solo toca los que están publicados y sin suspensión previa, de modo que repetirla no cambia nada.';

revoke all on function public.suspender_suscripciones_vencidas() from public, anon, authenticated;

-- A las 09:00 UTC, que en Bolivia son las 05:00: si alguien queda fuera de
-- línea, se entera al abrir su negocio y no en medio de una venta.
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'mipuesto-suspender-vencidos';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'mipuesto-suspender-vencidos',
    '0 9 * * *',
    $cron$select public.suspender_suscripciones_vencidas();$cron$
  );
end;
$$;
