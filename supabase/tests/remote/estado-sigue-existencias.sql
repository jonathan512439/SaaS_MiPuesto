-- El estado de un producto sigue a sus existencias: pruebas de base.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:estado-existencias:ensayo
--
-- Un único bloque que deshace todo lo que escribe: termina lanzando una
-- excepción propia, que revierte la transacción, y la atrapa para decir que
-- todo pasó.

do $prueba$
declare
  v_producto uuid;
  v_estado text;
begin
  begin
    select id into v_producto
    from public.productos
    where not coalesce(con_presentaciones, false)
      and eliminado_en is null
    order by creado_en
    limit 1;
    if v_producto is null then
      raise exception 'FALLO: la base de ensayo no tiene productos sin presentaciones.';
    end if;

    update public.productos
    set controla_stock = true, cantidad_stock = 20, cantidad_reservada = 0
    where id = v_producto;

    -- 1. Lo que se encontró en Huellitas: vendido con existencias. La base lo
    --    corrige a disponible, lo escriba quien lo escriba.
    update public.productos set estado = 'vendido' where id = v_producto;
    select estado into v_estado from public.productos where id = v_producto;
    if v_estado <> 'disponible' then
      raise exception 'FALLO: con 20 unidades quedó «%» y no «disponible».', v_estado;
    end if;

    -- 2. En cero: agotado.
    update public.productos set cantidad_stock = 0 where id = v_producto;
    select estado into v_estado from public.productos where id = v_producto;
    if v_estado <> 'agotado' then
      raise exception 'FALLO: en cero quedó «%» y no «agotado».', v_estado;
    end if;

    -- 3. Lo que vendió una venta se queda vendido mientras esté en cero.
    update public.productos set estado = 'vendido' where id = v_producto;
    select estado into v_estado from public.productos where id = v_producto;
    if v_estado <> 'vendido' then
      raise exception 'FALLO: vendido en cero pasó a «%».', v_estado;
    end if;

    -- 4. Todo apartado en pedidos pendientes: reservado.
    update public.productos set cantidad_stock = 3, cantidad_reservada = 3 where id = v_producto;
    select estado into v_estado from public.productos where id = v_producto;
    if v_estado <> 'reservado' then
      raise exception 'FALLO: con todo apartado quedó «%» y no «reservado».', v_estado;
    end if;

    -- 5. Sin control de existencias, el estado es el que pone el dueño.
    update public.productos
    set controla_stock = false, cantidad_stock = null, cantidad_reservada = 0, estado = 'agotado'
    where id = v_producto;
    select estado into v_estado from public.productos where id = v_producto;
    if v_estado <> 'agotado' then
      raise exception 'FALLO: sin control de existencias, «agotado» a mano pasó a «%».', v_estado;
    end if;

    raise exception using errcode = 'P0001', message = 'ESTADO_EXISTENCIAS_TODO_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'ESTADO_EXISTENCIAS_TODO_EN_VERDE' then
        raise;
      end if;
      raise notice 'estado por existencias: todas las pruebas pasaron';
  end;
end
$prueba$;
