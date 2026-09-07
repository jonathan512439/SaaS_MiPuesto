-- Medición completa del uso de la IA, para llevar el control con diez negocios.
--
-- Lo que faltaba: el mes, el promedio de tokens por llamada, la proporción de
-- fallos y —lo más útil con varios negocios— **quién está consumiendo**. Con un
-- solo número global no se puede saber si el día se gastó entre todos o si uno
-- solo se llevó la cuota, que es justo la pregunta que aparece cuando hay diez.
--
-- El mes se cuenta en hora de Bolivia porque es el mes que se le factura al
-- dueño y el que usa `uso_ia_negocio`. El día se cuenta en hora del Pacífico
-- porque es donde Google reinicia. Son dos relojes distintos a propósito, y cada
-- cifra dice cuál usa.
--
-- `llamadas_ia` se purga a los treinta días, así que «el mes» es completo
-- mientras el mes en curso no pase de treinta días de antigüedad: siempre.

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
    /* Treinta días completos: sirve para comparar contra la pantalla de AI
       Studio, que también mide veintiocho o treinta y no el mes calendario. */
    'treinta_dias', (
      select jsonb_build_object('llamadas', count(*), 'tokens', coalesce(sum(tokens), 0))
      from public.llamadas_ia where creado_en > now() - interval '30 days'
    ),
    /* El pico diario del último mes. Es la cifra que dice si el tope alcanza:
       un promedio bajo con un pico alto sigue siendo un problema. */
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
    /* Quién consume. Se listan los negocios con la función habilitada aunque no
       hayan usado nada: un negocio en cero también es información, y si solo
       aparecieran los que llamaron no se sabría a cuántos se les prometió algo
       que no están usando. */
    'por_negocio', (
      select coalesce(jsonb_agg(fila order by fila->>'nombre'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'negocio_id', n.id,
          'nombre', n.nombre,
          'hoy', coalesce(hoy.llamadas, 0),
          'tokens_hoy', coalesce(hoy.tokens, 0),
          'mes', coalesce(u.cantidad, 0),
          'tokens_mes', coalesce(u.tokens, 0),
          'dia_contado', u.dia,
          'cantidad_dia', coalesce(u.cantidad_dia, 0)
        ) as fila
        from public.negocios n
        left join public.uso_ia_negocio u
          on u.negocio_id = n.id
         and u.mes = (select mes_bolivia from ventanas)
        left join (
          select l.negocio_id, count(*) llamadas, coalesce(sum(l.tokens), 0) tokens
          from public.llamadas_ia l, ventanas
          where (l.creado_en at time zone 'America/Los_Angeles')::date = ventanas.dia_pacifico
          group by l.negocio_id
        ) hoy on hoy.negocio_id = n.id
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
