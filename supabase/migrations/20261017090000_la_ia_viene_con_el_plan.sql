-- La lectura de fotos viene con el plan.
--
-- Los dos planes la venden: Catálogo trae diez lecturas al mes y Catálogo Activo
-- sesenta. Pero la herramienta solo aparecía si la plataforma la encendía a mano,
-- y los cuatro negocios en Catálogo la tenían apagada: pagaban algo que no veían.
--
-- Desde acá `foto_ia_habilitada` deja de ser «la plataforma la encendió» y pasa a
-- ser «la plataforma no la apagó». Viene encendida al crear el negocio y se apaga
-- solo por abuso. Lo que cada negocio puede leer lo sigue decidiendo su plan, en
-- `consumir_credito_ia`, que no cambia.
--
-- El tope de diez negocios se retira. Estaba calculado para cuarenta fotos por
-- día cada uno, y hoy los planes topan en tres (Catálogo) y quince (Activo): con
-- la cuota gratuita de Google entran unos ciento treinta negocios en Catálogo, no
-- diez. Encenderla con el plan y después bloquear al undécimo sería volver a
-- vender algo que no se entrega. En su lugar, Plataforma mide cuánto de la cuota
-- diaria está comprometido y avisa antes de llegar.

alter table public.negocios
  alter column foto_ia_habilitada set default true;

comment on column public.negocios.foto_ia_habilitada is
  'Si la lectura de fotos está disponible. Viene con el plan; la plataforma la apaga solo por abuso.';

-- Los que hoy la tienen apagada la reciben. Ninguno fue apagado por abuso: los
-- dos cambios a mano que hubo fueron pruebas de la propia plataforma.
update public.negocios
set
  foto_ia_habilitada = true,
  foto_ia_habilitada_en = coalesce(foto_ia_habilitada_en, now())
where foto_ia_habilitada = false;

-- La función de la plataforma pierde el cupo: encender ya no se bloquea.
drop function if exists public.admin_cambiar_foto_ia(uuid, boolean, integer);

create or replace function public.admin_cambiar_foto_ia(
  p_negocio_id uuid,
  p_habilitada boolean
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
  update public.negocios
  set
    foto_ia_habilitada = p_habilitada,
    /* La fecha se anota al encender y no se borra al apagar: sirve para saber
       si al dueño ya se le avisó alguna vez. */
    foto_ia_habilitada_en = case
      when p_habilitada then coalesce(foto_ia_habilitada_en, now())
      else foto_ia_habilitada_en
    end
  where id = p_negocio_id
  returning * into v_negocio;

  if not found then
    raise exception using errcode = 'P0001', message = 'NEGOCIO_NO_ENCONTRADO';
  end if;

  insert into public.bitacora_plataforma (actor, negocio_id, accion, detalle)
  values (
    v_actor,
    p_negocio_id,
    case when p_habilitada then 'foto_ia_habilitada' else 'foto_ia_deshabilitada' end,
    jsonb_build_object('nombre', v_negocio.nombre)
  );

  return jsonb_build_object(
    'negocio_id', v_negocio.id,
    'foto_ia_habilitada', v_negocio.foto_ia_habilitada,
    'foto_ia_habilitada_en', v_negocio.foto_ia_habilitada_en
  );
end;
$$;

revoke all on function public.admin_cambiar_foto_ia(uuid, boolean) from public, anon;
grant execute on function public.admin_cambiar_foto_ia(uuid, boolean) to authenticated;
