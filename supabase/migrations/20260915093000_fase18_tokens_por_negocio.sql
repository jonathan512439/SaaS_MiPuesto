-- `uso_ia_negocio.tokens` no podía ser otra cosa que cero.
--
-- Se llena desde `consumir_credito_ia`, que corre **antes** de llamar al modelo:
-- en ese momento nadie sabe cuántos tokens va a costar la foto, así que siempre
-- se le pasa cero. Los tokens reales se anotan después en `llamadas_ia`.
--
-- Una columna que solo puede leer cero es peor que no tenerla: el panel habría
-- mostrado «0 tokens este mes» con trece llamadas hechas, y quien lo leyera
-- concluiría que la medición está rota o que no se consumió nada. Se retira, y
-- los tokens por negocio salen de `llamadas_ia`, que es donde están medidos.

alter table public.uso_ia_negocio drop column if exists tokens;

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

  /* `p_tokens` se mantiene en la firma y se ignora: quien llama todavía no sabe
     cuánto va a costar la foto, y quitarlo obligaría a cambiar la firma otra vez
     el día que se quiera cobrar por adelantado. */
  insert into public.uso_ia_negocio as uso (negocio_id, mes, cantidad, dia, cantidad_dia)
  values (p_negocio_id, v_mes, 1, v_dia, 1)
  on conflict (negocio_id, mes) do update
  set cantidad = uso.cantidad + 1,
      dia = v_dia,
      cantidad_dia = case when uso.dia = v_dia then uso.cantidad_dia + 1 else 1 end
  returning cantidad, cantidad_dia into v_cantidad, v_cantidad_dia;

  if v_cantidad > p_tope or v_cantidad_dia > p_tope_diario then
    update public.uso_ia_negocio
    set cantidad = greatest(0, cantidad - 1),
        cantidad_dia = greatest(0, cantidad_dia - 1)
    where negocio_id = p_negocio_id and mes = v_mes;

    if v_cantidad > p_tope then
      return jsonb_build_object('autorizado', false, 'motivo', 'tope_alcanzado', 'tope', p_tope);
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

-- Los tokens por negocio salen del registro de llamadas, que es donde se miden.
create or replace function private.calcular_uso_ia()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ventanas as (
    select
      (now() at time zone 'America/Los_Angeles')::date as dia_pacifico,
      (now() at time zone 'America/La_Paz')::date as dia_bolivia,
      (date_trunc('month', (now() at time zone 'America/La_Paz')))::date as mes_bolivia
  )
  select jsonb_build_object(
    'minuto', (
      select jsonb_build_object('llamadas', count(*), 'tokens', coalesce(sum(tokens), 0))
      from public.llamadas_ia where creado_en > now() - interval '1 minute'
    ),
    'hora', (
      select jsonb_build_object('llamadas', count(*), 'tokens', coalesce(sum(tokens), 0))
      from public.llamadas_ia where creado_en > now() - interval '1 hour'
    ),
    'dia_cuota', (
      select jsonb_build_object('llamadas', count(*), 'tokens', coalesce(sum(tokens), 0))
      from public.llamadas_ia, ventanas
      where (creado_en at time zone 'America/Los_Angeles')::date = ventanas.dia_pacifico
    ),
    'dia_bolivia', (
      select jsonb_build_object('llamadas', count(*), 'tokens', coalesce(sum(tokens), 0))
      from public.llamadas_ia, ventanas
      where (creado_en at time zone 'America/La_Paz')::date = ventanas.dia_bolivia
    ),
    'mes', (
      select jsonb_build_object('llamadas', count(*), 'tokens', coalesce(sum(tokens), 0))
      from public.llamadas_ia, ventanas
      where (creado_en at time zone 'America/La_Paz')::date >= ventanas.mes_bolivia
    ),
    'treinta_dias', (
      select jsonb_build_object('llamadas', count(*), 'tokens', coalesce(sum(tokens), 0))
      from public.llamadas_ia where creado_en > now() - interval '30 days'
    ),
    'pico_diario', (
      select coalesce(max(cantidad), 0)
      from (
        select count(*) cantidad
        from public.llamadas_ia
        where creado_en > now() - interval '30 days'
        group by (creado_en at time zone 'America/Los_Angeles')::date
      ) dias
    ),
    'tokens_por_llamada', (
      select coalesce(round(avg(tokens))::int, 0)
      from public.llamadas_ia
      where exito = true and creado_en > now() - interval '30 days'
    ),
    'fallidas_hoy', (
      select count(*) from public.llamadas_ia, ventanas
      where exito = false
        and (creado_en at time zone 'America/Los_Angeles')::date = ventanas.dia_pacifico
    ),
    'fallidas_treinta_dias', (
      select count(*) from public.llamadas_ia
      where exito = false and creado_en > now() - interval '30 days'
    ),
    'por_herramienta', (
      select coalesce(jsonb_object_agg(herramienta, cantidad), '{}'::jsonb)
      from (
        select herramienta, count(*) as cantidad
        from public.llamadas_ia, ventanas
        where (creado_en at time zone 'America/Los_Angeles')::date = ventanas.dia_pacifico
        group by herramienta
      ) as resumen
    ),
    'por_negocio', (
      select coalesce(jsonb_agg(fila order by fila->>'nombre'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'negocio_id', n.id,
          'nombre', n.nombre,
          'hoy', coalesce(hoy.llamadas, 0),
          'tokens_hoy', coalesce(hoy.tokens, 0),
          'mes', coalesce(u.cantidad, 0),
          'tokens_mes', coalesce(mes.tokens, 0),
          'cantidad_dia', case
            when u.dia = (select dia_pacifico from ventanas) then coalesce(u.cantidad_dia, 0)
            else 0
          end
        ) as fila
        from public.negocios n
        left join public.uso_ia_negocio u
          on u.negocio_id = n.id and u.mes = (select mes_bolivia from ventanas)
        left join (
          select l.negocio_id, count(*) llamadas, coalesce(sum(l.tokens), 0) tokens
          from public.llamadas_ia l, ventanas
          where (l.creado_en at time zone 'America/Los_Angeles')::date = ventanas.dia_pacifico
          group by l.negocio_id
        ) hoy on hoy.negocio_id = n.id
        left join (
          select l.negocio_id, coalesce(sum(l.tokens), 0) tokens
          from public.llamadas_ia l, ventanas
          where (l.creado_en at time zone 'America/La_Paz')::date >= ventanas.mes_bolivia
          group by l.negocio_id
        ) mes on mes.negocio_id = n.id
        where n.foto_ia_habilitada = true
      ) negocios
    ),
    'negocios_habilitados', (
      select count(*) from public.negocios where foto_ia_habilitada = true
    ),
    'ultima', (select max(creado_en) from public.llamadas_ia),
    'reinicio_dia_cuota', (
      (((now() at time zone 'America/Los_Angeles')::date + 1)::timestamp
        at time zone 'America/Los_Angeles')
    ),
    'medido_en', now()
  );
$$;

revoke all on function private.calcular_uso_ia() from public, anon, authenticated;
grant execute on function private.calcular_uso_ia() to service_role;
