-- `admin_cambiar_foto_ia` escribía en una columna que no existe.
--
-- La bitácora tiene la columna `actor`; la función insertaba en `actor_user_id`.
-- Postgres no valida los nombres de columna de un `insert` hasta ejecutarlo, así
-- que la función se creó sin protestar y falló **todas** las veces que se usó:
-- el `update` de la fila se hacía y la transacción se deshacía al llegar al
-- `insert`. Desde afuera el botón siempre dijo «No se pudo aplicar el cambio».
--
-- Es la cuarta inserción a esta tabla en el proyecto y la única que no usaba
-- `actor`. Se agrega un control estático que compara las columnas de todos los
-- `insert` contra las de la tabla, porque este error no lo atrapa ni el
-- compilador ni el linter de la base: solo aparece al ejecutar.

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
    /* Se anota la fecha solo al encender, y no se borra al apagar: sirve para
       saber si al dueño ya se le avisó alguna vez. */
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
