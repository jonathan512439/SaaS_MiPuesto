-- No se puede habilitar el negocio número once.
--
-- El tope diario por negocio se calcula repartiendo la cuota de Google entre
-- diez. Ese reparto lo comprueba una prueba, pero la prueba mira números, no la
-- base: nada impedía encender la herramienta en veinte negocios y dejar el
-- reparto en cuarenta por veinte, ochocientos, contra los quinientos que hay.
--
-- El cupo se pasa por parámetro y no se escribe acá para que el número viva en
-- un solo lugar, `lib/ia/limites.ts`, junto al cálculo que lo usa. Dos copias de
-- un límite terminan divergiendo, y la que manda sería la que nadie mira.
--
-- Apagar nunca se bloquea: un freno que impide soltar es un freno roto.

create or replace function public.admin_cambiar_foto_ia(
  p_negocio_id uuid,
  p_habilitada boolean,
  p_cupo integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.exigir_admin_plataforma();
  v_negocio public.negocios%rowtype;
  v_habilitados integer;
begin
  if p_habilitada and p_cupo is not null then
    /* Se cuentan los que ya están encendidos sin contar a este, para que volver
       a encender uno que ya lo estaba no falle por su propia culpa. */
    select count(*) into v_habilitados
    from public.negocios
    where foto_ia_habilitada = true and id <> p_negocio_id;

    if v_habilitados >= p_cupo then
      raise exception using errcode = 'P0001', message = 'CUPO_IA_LLENO';
    end if;
  end if;

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

-- La firma vieja se retira: dejarla sería dejar una puerta sin el cupo.
drop function if exists public.admin_cambiar_foto_ia(uuid, boolean);

revoke all on function public.admin_cambiar_foto_ia(uuid, boolean, integer) from public, anon;
grant execute on function public.admin_cambiar_foto_ia(uuid, boolean, integer) to authenticated;
