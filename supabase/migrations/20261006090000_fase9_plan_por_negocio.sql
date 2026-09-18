-- El plan de cada negocio, que hasta ahora no existía en ninguna parte.
--
-- La portada vendía dos planes —«Catálogo» con 10 lecturas de foto al mes y
-- «Catálogo Activo» con 60—, y el sistema no tenía dónde guardar cuál pagó cada
-- quien. El resultado: `consumir_credito_ia` aplicaba el mismo tope técnico a
-- todos, 200 al mes y 40 por día, sin mirar el plan. Se vendían diez y se
-- entregaban doscientas.
--
-- No era una fuga de plata —cada lectura son unos 1.339 tokens, centavos— pero
-- sí una promesa que no se podía cumplir al revés: el día de cobrar el plan de
-- arriba, el de abajo ya tenía todo.
--
-- `plan_id` **no se concede al dueño**. Es lo que decide cuánto puede gastar:
-- si el panel pudiera escribirlo, cualquiera se ascendería solo. Lo cambia la
-- plataforma con `admin_cambiar_plan`, que es `security definer` y exige ser
-- administrador. El `select` de la tabla ya está concedido, así que el panel
-- puede mostrarle al dueño en qué plan está sin poder tocarlo.
alter table public.negocios
  add column plan_id text not null default 'catalogo';

alter table public.negocios
  add constraint negocios_plan_id_check
  check (plan_id in ('catalogo', 'activo'));

comment on column public.negocios.plan_id is
  'Qué plan paga el negocio. Los cupos de cada plan viven en lib/planes.ts, que es la fuente de verdad; acá solo se guarda cuál.';

-- Cambiar el plan de un negocio. Solo la plataforma.
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
  if p_plan not in ('catalogo', 'activo') then
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
