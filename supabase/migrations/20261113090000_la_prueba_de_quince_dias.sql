-- La prueba gratis de quince días.
--
-- Decisión del dueño del proyecto (2026-10-22): el primer mes gratis se retira.
-- En su lugar, todo negocio nace en una **prueba de quince días**, con hasta
-- quince productos y cinco lecturas de foto, para conocer el sistema con su
-- propio catálogo antes de pagar. Al pagar el primer mes, el segundo va por
-- nuestra cuenta: eso lo hace la plataforma al renovar —suma dos meses— y no la
-- base.
--
-- Los números son los de `PLAN_PRUEBA` en `lib/planes.ts`;
-- `topes-del-plan.test.ts` compara los dos lugares.
--
-- Cuatro cambios:
--
-- 1. `plan_id` acepta `prueba`, y es el valor con que nace un negocio.
-- 2. El vencimiento con que nace pasa de un mes a quince días. Al vencer, el
--    corte de siempre (`suspender_suscripciones_vencidas`) despublica el
--    catálogo: la prueba termina igual que una suscripción impaga, con los
--    noventa días de resguardo que dicen los términos.
-- 3. `private.topes_del_plan` le da a la prueba 15 productos con 3 fotos.
-- 4. El primer pago saca de la prueba: `admin_renovar_suscripcion` pasa el plan
--    `prueba` a `catalogo`. Sin esto, un cliente que pagó seguiría topado en
--    quince productos hasta que alguien se acordara de cambiarle el plan.
--
-- **Los negocios que ya existen no cambian**: ni su plan ni su vencimiento. Solo
-- cambian los valores por omisión, que valen para los que se den de alta desde
-- ahora.
--
-- Las cinco lecturas en total —y no por mes— no se aplican acá: el cupo de
-- lecturas lo decide el servidor (`lib/ia/servidor.ts`) con el plan que lee de
-- esta tabla, y `consumir_credito_ia` hace cumplir el tope que le pasan.

-- 1. El plan nuevo, y el valor con que nace un negocio.
alter table public.negocios
  drop constraint negocios_plan_id_check;

alter table public.negocios
  add constraint negocios_plan_id_check
  check (plan_id in ('prueba', 'catalogo', 'activo'));

alter table public.negocios
  alter column plan_id set default 'prueba';

comment on column public.negocios.plan_id is
  'Plan del negocio: prueba (15 días gratis), catalogo o activo. Lo cambia solo la plataforma; el primer pago saca de la prueba.';

-- 2. Quince días de prueba en vez del mes gratis.
alter table public.negocios
  alter column suscripcion_vence_en set default (now() + interval '15 days');

-- 3. Los topes de la prueba.
create or replace function private.topes_del_plan(
  p_plan text,
  out productos integer,
  out fotos_por_producto integer
)
language sql
immutable
security definer
set search_path = ''
as $$
  select
    case p_plan when 'activo' then 300 when 'prueba' then 15 else 150 end,
    case p_plan when 'activo' then 4 when 'prueba' then 3 else 3 end;
$$;

comment on function private.topes_del_plan(text) is
  'Productos y fotos por producto de cada plan. Los mismos números que lib/planes.ts; un plan desconocido recibe los del Catálogo.';

-- La plataforma también puede poner un negocio en prueba: por ejemplo, para
-- devolverle la prueba a quien se dio de alta y no llegó a usarla.
create or replace function public.admin_cambiar_plan(
  p_negocio_id uuid,
  p_plan text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.exigir_admin_plataforma();
  v_negocio public.negocios%rowtype;
  v_anterior text;
begin
  if p_plan not in ('prueba', 'catalogo', 'activo') then
    raise exception using errcode = 'P0001', message = 'PLAN_DESCONOCIDO';
  end if;

  select plan_id into v_anterior from public.negocios where id = p_negocio_id;

  update public.negocios
  set plan_id = p_plan
  where id = p_negocio_id
  returning * into v_negocio;

  if not found then
    raise exception using errcode = 'P0001', message = 'NEGOCIO_NO_ENCONTRADO';
  end if;

  /* Queda en la bitácora porque es una decisión comercial y no un ajuste: el
     día que un dueño diga «yo pagué el Activo», la respuesta tiene que estar
     escrita con fecha y con quién lo cambió. */
  insert into public.bitacora_plataforma (actor, negocio_id, accion, detalle)
  values (
    v_actor,
    p_negocio_id,
    'plan_cambiado',
    jsonb_build_object('nombre', v_negocio.nombre, 'antes', v_anterior, 'ahora', p_plan)
  );

  return jsonb_build_object('plan_id', v_negocio.plan_id);
end;
$$;

revoke all on function public.admin_cambiar_plan(uuid, text) from public, anon;
grant execute on function public.admin_cambiar_plan(uuid, text) to authenticated;

-- 4. El primer pago saca de la prueba.
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
  v_sale_de_prueba boolean;
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

  /* Renovar es cobrar: quien estaba en la prueba pasa al plan de entrada. Si
     pagó el Activo, la plataforma se lo cambia después, como siempre. */
  v_sale_de_prueba := v_negocio.plan_id = 'prueba';

  update public.negocios
  set suscripcion_vence_en = v_nueva,
      suspendido_en = null,
      activo = case when v_republica then true else activo end,
      plan_id = case when v_sale_de_prueba then 'catalogo' else plan_id end
  where id = p_negocio_id;

  insert into public.bitacora_plataforma (actor, accion, negocio_id, detalle)
  values (
    v_actor,
    'renovar',
    p_negocio_id,
    jsonb_build_object(
      'meses', p_meses,
      'vence_en', v_nueva,
      'republicado', v_republica,
      'sale_de_prueba', v_sale_de_prueba
    )
  );

  return jsonb_build_object(
    'vence_en', v_nueva,
    'republicado', v_republica,
    'sale_de_prueba', v_sale_de_prueba
  );
end;
$$;

revoke all on function public.admin_renovar_suscripcion(uuid, integer) from public, anon;
grant execute on function public.admin_renovar_suscripcion(uuid, integer) to authenticated;

comment on function public.admin_renovar_suscripcion(uuid, integer) is
  'Suma meses al período pagado, deshace la suspensión por falta de pago y saca de la prueba al plan Catálogo. Solo para administradores de la plataforma.';
