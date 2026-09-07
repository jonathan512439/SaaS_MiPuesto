-- Tope diario por negocio para la lectura de fotos.
--
-- Hasta ahora el único freno era mensual: doscientas fotos por negocio. Con eso,
-- tres negocios cargando fuerte el mismo día suman seiscientos pedidos contra
-- los **quinientos** que da por día el nivel gratuito de Google —el número real,
-- copiado de AI Studio el 2026-09-07; antes el código creía que eran mil—. El
-- primero que llega se lleva la cuota y los otros ven un error que no explica
-- nada.
--
-- Sesenta por negocio: siete negocios a tope dan cuatrocientos veinte, debajo de
-- quinientos con margen. Y en un solo negocio casi nunca se toca, porque el tope
-- mensual de doscientos llega antes.
--
-- **El día es el del Pacífico, no el de Bolivia.** Es donde Google reinicia su
-- contador, y es el recurso que este tope protege. Con el día boliviano, un
-- negocio podría gastar sesenta a las 22:00 y sesenta más a las 00:30 —dos días
-- bolivianos, un solo día de Google— y el tope no serviría para nada. Lo que sí
-- se dice en hora de Bolivia es **cuándo vuelve a cero**, porque eso lo lee una
-- persona.

alter table public.uso_ia_negocio
  add column if not exists dia date,
  add column if not exists cantidad_dia integer not null default 0
    check (cantidad_dia >= 0);

comment on column public.uso_ia_negocio.dia is
  'Día de cuota ya contado, en hora del Pacífico, que es donde Google reinicia.';
comment on column public.uso_ia_negocio.cantidad_dia is
  'Fotos leídas dentro de ese día. Vuelve a cero solo cuando cambia el día.';

-- La firma cambia, así que la vieja se retira: dejarla sería dejar una puerta
-- sin el tope diario.
drop function if exists public.consumir_credito_ia(uuid, integer, bigint);

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

  /* Contar y autorizar en una sola operación: si se leyera primero y se sumara
     después, dos pedidos a la vez pasarían los dos. */
  insert into public.uso_ia_negocio as uso (negocio_id, mes, cantidad, tokens, dia, cantidad_dia)
  values (p_negocio_id, v_mes, 1, p_tokens, v_dia, 1)
  on conflict (negocio_id, mes) do update
  set cantidad = uso.cantidad + 1,
      tokens = uso.tokens + p_tokens,
      dia = v_dia,
      /* Vuelve a uno cuando cambia el día: sin esto, el contador diario sería
         otro contador mensual con otro nombre. */
      cantidad_dia = case when uso.dia = v_dia then uso.cantidad_dia + 1 else 1 end
  returning cantidad, cantidad_dia into v_cantidad, v_cantidad_dia;

  if v_cantidad > p_tope then
    return jsonb_build_object(
      'autorizado', false,
      'motivo', 'tope_alcanzado',
      'tope', p_tope
    );
  end if;

  if v_cantidad_dia > p_tope_diario then
    return jsonb_build_object(
      'autorizado', false,
      'motivo', 'tope_diario',
      'tope', p_tope_diario,
      /* Cuándo vuelve a cero, para que la pantalla lo diga en hora de acá en vez
         de mandar a alguien a adivinar qué es «mañana» en el Pacífico. */
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

-- La devolución también resta del contador diario. Sin esto, una lectura fallida
-- devolvía el crédito del mes pero no el del día, y el tope diario se gastaría
-- con llamadas que no dieron nada.
create or replace function public.devolver_credito_ia(p_negocio_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mes date := (date_trunc('month', (now() at time zone 'America/La_Paz')))::date;
  v_dia date := (now() at time zone 'America/Los_Angeles')::date;
begin
  update public.uso_ia_negocio
  set cantidad = greatest(0, cantidad - 1),
      cantidad_dia = case
        when dia = v_dia then greatest(0, cantidad_dia - 1)
        else cantidad_dia
      end
  where negocio_id = p_negocio_id and mes = v_mes;
end;
$$;

revoke all on function public.devolver_credito_ia(uuid) from public, anon, authenticated;
grant execute on function public.devolver_credito_ia(uuid) to service_role;
