-- Las acciones del panel de plataforma.
--
-- Van como funciones y no como escrituras directas por una razón concreta: el
-- `grant update` de `authenticated` sobre negocios es por lista de columnas y
-- deja fuera `activo`, `suspendido_en` y `suscripcion_vence_en`. Esa omisión es
-- la que impide que un dueño se renueve solo con una petición a la API, y no se
-- toca.
--
-- Cada función comprueba quién llama, hace una sola cosa y anota en la bitácora.

create or replace function private.exigir_admin_plataforma()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not public.es_admin_plataforma() then
    raise exception using errcode = '42501', message = 'NO_AUTORIZADO';
  end if;
  return v_actor;
end;
$$;

/* Renovar suma al final del período pagado, no desde hoy: renovar tarde no debe
   regalar días y renovar temprano no debe quitarlos. Es la misma regla que ya
   usaba el script de operación. */
create or replace function public.admin_renovar_suscripcion(
  p_negocio_id uuid,
  p_meses integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.exigir_admin_plataforma();
  v_negocio public.negocios%rowtype;
  v_desde timestamptz;
  v_nueva timestamptz;
  v_republica boolean;
begin
  if p_meses is null or p_meses < 1 or p_meses > 12 then
    raise exception using errcode = 'P0001', message = 'MESES_INVALIDOS';
  end if;

  select * into v_negocio from public.negocios where id = p_negocio_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'NEGOCIO_NO_ENCONTRADO';
  end if;

  v_desde := greatest(now(), v_negocio.suscripcion_vence_en);
  v_nueva := v_desde + make_interval(months => p_meses);

  /* Solo se deshace lo que hizo el corte automático: un catálogo bajado a mano
     por otro motivo sigue bajo, porque republicarlo sería revertir una decisión
     que esta función no tomó y no puede conocer. */
  v_republica := not v_negocio.activo and v_negocio.suspendido_en is not null;

  update public.negocios
  set suscripcion_vence_en = v_nueva,
      suspendido_en = null,
      activo = case when v_republica then true else activo end
  where id = p_negocio_id;

  insert into public.bitacora_plataforma (actor, accion, negocio_id, detalle)
  values (
    v_actor,
    'renovar',
    p_negocio_id,
    jsonb_build_object('meses', p_meses, 'vence_en', v_nueva, 'republicado', v_republica)
  );

  return jsonb_build_object('vence_en', v_nueva, 'republicado', v_republica);
end;
$$;

create or replace function public.admin_cambiar_publicacion(
  p_negocio_id uuid,
  p_activo boolean,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.exigir_admin_plataforma();
  v_negocio public.negocios%rowtype;
begin
  select * into v_negocio from public.negocios where id = p_negocio_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'NEGOCIO_NO_ENCONTRADO';
  end if;

  /* Bajar a mano no deja motivo de pago: `suspendido_en` sigue nulo para que la
     renovación no lo republique sin querer. */
  update public.negocios
  set activo = p_activo,
      suspendido_en = case when p_activo then null else suspendido_en end
  where id = p_negocio_id;

  insert into public.bitacora_plataforma (actor, accion, negocio_id, detalle)
  values (
    v_actor,
    case when p_activo then 'publicar' else 'despublicar' end,
    p_negocio_id,
    jsonb_build_object('motivo', nullif(trim(coalesce(p_motivo, '')), ''))
  );

  return jsonb_build_object('activo', p_activo);
end;
$$;

revoke all on function public.admin_renovar_suscripcion(uuid, integer) from public, anon;
revoke all on function public.admin_cambiar_publicacion(uuid, boolean, text) from public, anon;
grant execute on function public.admin_renovar_suscripcion(uuid, integer) to authenticated;
grant execute on function public.admin_cambiar_publicacion(uuid, boolean, text) to authenticated;

comment on function public.admin_renovar_suscripcion(uuid, integer) is
  'Suma meses al período pagado y deshace la suspensión por falta de pago. Solo para administradores de la plataforma.';
comment on function public.admin_cambiar_publicacion(uuid, boolean, text) is
  'Publica o baja un catálogo a mano, con motivo. Solo para administradores de la plataforma.';
