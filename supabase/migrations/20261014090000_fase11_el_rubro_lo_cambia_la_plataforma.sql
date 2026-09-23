-- El rubro público se elige una vez; después lo cambia la plataforma.
--
-- La fase 11 lo había dejado editable desde «Mi negocio», como una etiqueta
-- para el buscador: la siembra ya estaba fija y cambiar de «Restaurante» a
-- «Pollería» no tocaba el catálogo. El dueño del proyecto lo vio y pidió la
-- regla de siempre: **el rubro se elige al crear el negocio, y para cambiarlo
-- hay que escribirnos**. Así es con la siembra desde la fase 8, y el rubro
-- público no tiene por qué ser distinto a los ojos del comerciante.
--
-- La ruta del panel ya rechaza el cambio. Esta función es la otra mitad: la que
-- usa la plataforma cuando el comerciante escribe. No toca la siembra ni el
-- catálogo —para eso está `admin_cambiar_rubro`, que reinicia—; solo la
-- etiqueta, y la saca de los secundarios si estaba ahí.
create or replace function public.admin_cambiar_rubro_publico(
  p_negocio_id uuid,
  p_rubro_publico text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.exigir_admin_plataforma();
  v_anterior text;
begin
  select rubro_publico into v_anterior from public.negocios where id = p_negocio_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'NEGOCIO_NO_ENCONTRADO';
  end if;

  -- La lista válida la sostiene la restricción de la columna: un rubro que no
  -- existe se rechaza ahí, con su propio error.
  update public.negocios
    set rubro_publico = p_rubro_publico,
        rubros_secundarios = array_remove(rubros_secundarios, p_rubro_publico)
    where id = p_negocio_id;

  insert into public.bitacora_plataforma (actor, accion, negocio_id, detalle)
  values (
    v_actor,
    'cambiar_rubro_publico',
    p_negocio_id,
    jsonb_build_object('antes', v_anterior, 'despues', p_rubro_publico)
  );

  return jsonb_build_object('rubro_publico', p_rubro_publico);
end;
$$;

revoke all on function public.admin_cambiar_rubro_publico(uuid, text) from public, anon;
grant execute on function public.admin_cambiar_rubro_publico(uuid, text) to authenticated;
