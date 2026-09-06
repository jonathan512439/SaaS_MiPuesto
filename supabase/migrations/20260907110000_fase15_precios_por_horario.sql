-- Precios por horario.
--
-- La función más riesgosa del plan, y va última por eso: toca
-- `private.calcular_precio_producto`, que está en la ruta del dinero. Lo que
-- devuelve se cobra: es el precio que ve el comprador, el que se congela en el
-- pedido y el que se suma en el total reservado.
--
-- Tres decisiones que la hacen segura:
--
-- 1. **Se agregan columnas anulables.** Una promoción sin horario ni días se
--    comporta exactamente como antes. Ninguna de las que ya existen cambia de
--    precio por esta migración.
-- 2. **La hora es la de Bolivia**, escrita explícita. El servidor corre en UTC;
--    sin la conversión, una promoción de almuerzo de 12:00 a 14:00 se activaría
--    a las 08:00 de la mañana.
-- 3. **La madrugada pertenece al día anterior.** «Viernes de 22:00 a 02:00» es
--    una noche, no dos ventanas sueltas: a la 01:00 del sábado la promoción
--    sigue siendo la del viernes. Sin esta regla, el happy hour se corta a las
--    doce en punto y el cliente que ya estaba sentado paga otro precio.

alter table public.promociones
  add column hora_inicio time,
  add column hora_fin time,
  add column dias smallint[];

-- Las dos horas van juntas o no van: una sola no define ninguna ventana.
alter table public.promociones
  add constraint promociones_horario_completo
  check (num_nonnulls(hora_inicio, hora_fin) <> 1);

-- Iguales significaría una ventana de cero o de veinticuatro horas según cómo
-- se lea, y esa ambigüedad en la ruta del dinero no se deja abierta.
alter table public.promociones
  add constraint promociones_horario_distinto
  check (hora_inicio is null or hora_inicio <> hora_fin);

-- 0 es domingo, como `extract(dow)`.
alter table public.promociones
  add constraint promociones_dias_validos
  check (
    dias is null
    or (
      array_length(dias, 1) between 1 and 7
      and dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    )
  );

comment on column public.promociones.hora_inicio is
  'Hora de Bolivia en que empieza a aplicar. Nulo = todo el día.';
comment on column public.promociones.hora_fin is
  'Hora de Bolivia en que deja de aplicar. Si es menor que el inicio, la ventana cruza la medianoche.';
comment on column public.promociones.dias is
  'Días de la semana en que aplica, 0 = domingo. Nulo = todos.';

grant select (hora_inicio, hora_fin, dias) on table public.promociones to anon;
grant insert (hora_inicio, hora_fin, dias) on table public.promociones to authenticated;
grant update (hora_inicio, hora_fin, dias) on table public.promociones to authenticated;

create or replace function private.calcular_precio_producto(
  p_precio numeric,
  p_negocio_id uuid,
  p_producto_id uuid,
  p_categoria_id uuid,
  p_momento timestamptz default now()
)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  with reloj as (
    select
      (p_momento at time zone 'America/La_Paz') as local,
      (p_momento at time zone 'America/La_Paz')::time as hora,
      extract(dow from (p_momento at time zone 'America/La_Paz'))::smallint as dia,
      extract(
        dow from (p_momento at time zone 'America/La_Paz') - interval '1 day'
      )::smallint as dia_anterior
  )
  select greatest(
    0,
    least(
      p_precio,
      coalesce(
        min(
          case promocion.tipo
            when 'porcentaje' then round(p_precio * (1 - promocion.valor / 100), 2)
            when 'monto_fijo' then round(p_precio - promocion.valor, 2)
          end
        ),
        p_precio
      )
    )
  )
  from public.promociones as promocion, reloj
  where promocion.negocio_id = p_negocio_id
    and promocion.activo = true
    and (promocion.fecha_inicio is null or promocion.fecha_inicio <= p_momento)
    and (promocion.fecha_fin is null or promocion.fecha_fin > p_momento)
    and (
      promocion.producto_id = p_producto_id
      or (promocion.categoria_id is not null and promocion.categoria_id = p_categoria_id)
    )
    -- Ventana de horas. Cuando el fin es menor que el inicio, cruza la
    -- medianoche y la condición se invierte de «y» a «o».
    and (
      promocion.hora_inicio is null
      or (
        case
          when promocion.hora_inicio < promocion.hora_fin
            then reloj.hora >= promocion.hora_inicio and reloj.hora < promocion.hora_fin
          else reloj.hora >= promocion.hora_inicio or reloj.hora < promocion.hora_fin
        end
      )
    )
    -- Días. En una ventana que cruza la medianoche, la madrugada cuenta como el
    -- día anterior: a la 01:00 del sábado sigue siendo el viernes.
    and (
      promocion.dias is null
      or (
        case
          when promocion.hora_inicio is not null
               and promocion.hora_inicio > promocion.hora_fin
               and reloj.hora < promocion.hora_fin
            then reloj.dia_anterior
          else reloj.dia
        end
      ) = any (promocion.dias)
    );
$$;
