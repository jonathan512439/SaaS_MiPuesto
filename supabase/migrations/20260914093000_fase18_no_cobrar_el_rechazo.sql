-- Un pedido rechazado por tope no debe gastar cupo.
--
-- La función cuenta y autoriza en una sola operación —si leyera primero y sumara
-- después, dos pedidos a la vez pasarían los dos—, así que el contador ya subió
-- cuando se descubre que no había cupo. Hasta ahora ese incremento se quedaba.
--
-- Consecuencia real: alguien que llega al tope diario y sigue tocando el botón
-- gasta cupo **mensual** con llamadas que nunca salieron a Google. Veinte clics
-- son veinte fotos menos en el mes, a cambio de nada.
--
-- Se deshace el incremento antes de devolver el rechazo. Sigue siendo una sola
-- transacción, así que la carrera que motivó el diseño original sigue cubierta.

create or replace function public.consumir_credito_ia(
  p_negocio_id uuid,
  p_tope integer,
  p_tope_diario integer,
  p_tokens bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mes date := (date_trunc('month', (now() at time zone 'America/La_Paz')))::date;
  v_dia date := (now() at time zone 'America/Los_Angeles')::date;
  v_cantidad integer;
  v_cantidad_dia integer;
  v_habilitada boolean;
begin
  select foto_ia_habilitada into v_habilitada
  from public.negocios
  where id = p_negocio_id;

  if v_habilitada is not true then
    return jsonb_build_object('autorizado', false, 'motivo', 'no_habilitada');
  end if;

  insert into public.uso_ia_negocio as uso (negocio_id, mes, cantidad, tokens, dia, cantidad_dia)
  values (p_negocio_id, v_mes, 1, p_tokens, v_dia, 1)
  on conflict (negocio_id, mes) do update
  set cantidad = uso.cantidad + 1,
      tokens = uso.tokens + p_tokens,
      dia = v_dia,
      cantidad_dia = case when uso.dia = v_dia then uso.cantidad_dia + 1 else 1 end
  returning cantidad, cantidad_dia into v_cantidad, v_cantidad_dia;

  if v_cantidad > p_tope or v_cantidad_dia > p_tope_diario then
    update public.uso_ia_negocio
    set cantidad = greatest(0, cantidad - 1),
        cantidad_dia = greatest(0, cantidad_dia - 1)
    where negocio_id = p_negocio_id and mes = v_mes;

    if v_cantidad > p_tope then
      return jsonb_build_object(
        'autorizado', false,
        'motivo', 'tope_alcanzado',
        'tope', p_tope
      );
    end if;

    return jsonb_build_object(
      'autorizado', false,
      'motivo', 'tope_diario',
      'tope', p_tope_diario,
      'reinicio', ((v_dia + 1)::timestamp at time zone 'America/Los_Angeles')
    );
  end if;

  return jsonb_build_object(
    'autorizado', true,
    'usadas', v_cantidad,
    'usadas_dia', v_cantidad_dia
  );
end;
$$;

revoke all on function public.consumir_credito_ia(uuid, integer, integer, bigint)
  from public, anon, authenticated;
grant execute on function public.consumir_credito_ia(uuid, integer, integer, bigint) to service_role;
