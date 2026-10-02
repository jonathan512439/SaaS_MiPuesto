-- El ajuste masivo de precios: todo o nada, y nunca dos veces.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:ajuste-precios:ensayo
--
-- El ajuste actualizaba producto por producto y sin transacción: si se cortaba
-- tras 80 de 300, esos 80 quedaban con el precio nuevo y el aviso decía «Vuelve
-- a intentarlo», que les aplicaba el porcentaje otra vez. Lo encontró la
-- auditoría del 2026-09-30. Ahora lo aplica `aplicar_ajuste_de_precios`, en una
-- transacción y con un identificador del intento. Un único bloque que deshace
-- todo lo que escribe.

do $prueba$
declare
  v_negocio uuid;
  v_duenio uuid;
  v_a uuid;
  v_b uuid;
  v_precio_a numeric;
  v_precio_b numeric;
  v_ajustados integer;
  v_intento uuid := gen_random_uuid();
begin
  begin
    select negocio.id, negocio.admin_user_id into v_negocio, v_duenio
    from public.negocios as negocio
    where (select count(*) from public.productos as producto
           where producto.negocio_id = negocio.id and producto.eliminado_en is null) >= 2
    limit 1;
    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo no tiene un negocio con dos productos.';
    end if;
    select id, precio into v_a, v_precio_a from public.productos
    where negocio_id = v_negocio and eliminado_en is null order by id limit 1;
    select id, precio into v_b, v_precio_b from public.productos
    where negocio_id = v_negocio and eliminado_en is null and id <> v_a order by id limit 1;

    perform set_config('request.jwt.claims', json_build_object('sub', v_duenio, 'role', 'authenticated')::text, true);

    -- 1. Todo o nada: con un precio imposible en el lote, no cambia ninguno.
    begin
      perform public.aplicar_ajuste_de_precios(
        gen_random_uuid(), 10,
        jsonb_build_array(
          jsonb_build_object('id', v_a, 'precio_actual', v_precio_a, 'precio_nuevo', v_precio_a + 1),
          jsonb_build_object('id', v_b, 'precio_actual', v_precio_b, 'precio_nuevo', -5)
        )
      );
      raise exception 'FALLO: un lote con un precio negativo se aplicó.';
    exception
      when check_violation then null;
    end;
    if (select precio from public.productos where id = v_a) <> v_precio_a then
      raise exception 'FALLO: el lote fallido dejó un producto ajustado a medias.';
    end if;

    -- 2. Un lote válido se aplica entero.
    v_ajustados := public.aplicar_ajuste_de_precios(
      v_intento, 10,
      jsonb_build_array(
        jsonb_build_object('id', v_a, 'precio_actual', v_precio_a, 'precio_nuevo', v_precio_a + 1),
        jsonb_build_object('id', v_b, 'precio_actual', v_precio_b, 'precio_nuevo', v_precio_b + 2)
      )
    );
    if v_ajustados <> 2 or (select precio from public.productos where id = v_a) <> v_precio_a + 1 then
      raise exception 'FALLO: el lote válido ajustó % productos.', v_ajustados;
    end if;

    -- 3. El mismo intento otra vez —el reintento después de un corte— no
    --    ajusta de nuevo y devuelve lo de la primera vez.
    v_ajustados := public.aplicar_ajuste_de_precios(
      v_intento, 10,
      jsonb_build_array(
        jsonb_build_object('id', v_a, 'precio_actual', v_precio_a + 1, 'precio_nuevo', v_precio_a + 9)
      )
    );
    if v_ajustados <> 2 or (select precio from public.productos where id = v_a) <> v_precio_a + 1 then
      raise exception 'FALLO: el reintento volvió a ajustar.';
    end if;

    -- 4. Un precio que ya no es el esperado se salta.
    v_ajustados := public.aplicar_ajuste_de_precios(
      gen_random_uuid(), 10,
      jsonb_build_array(
        jsonb_build_object('id', v_a, 'precio_actual', v_precio_a, 'precio_nuevo', v_precio_a + 50)
      )
    );
    if v_ajustados <> 0 or (select precio from public.productos where id = v_a) <> v_precio_a + 1 then
      raise exception 'FALLO: se ajustó un producto cuyo precio ya había cambiado.';
    end if;

    -- 5. Otro usuario no ajusta los productos de este negocio.
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    begin
      perform public.aplicar_ajuste_de_precios(
        gen_random_uuid(), 10,
        jsonb_build_array(
          jsonb_build_object('id', v_a, 'precio_actual', v_precio_a + 1, 'precio_nuevo', 1)
        )
      );
      raise exception 'FALLO: un usuario sin negocio ajustó precios.';
    exception
      when raise_exception then
        if sqlerrm <> 'NEGOCIO_NO_ENCONTRADO' then raise; end if;
    end;
    if (select precio from public.productos where id = v_a) <> v_precio_a + 1 then
      raise exception 'FALLO: otro usuario cambió un precio ajeno.';
    end if;

    raise exception using errcode = 'P0001', message = 'AJUSTE_PRECIOS_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'AJUSTE_PRECIOS_EN_VERDE' then
        raise;
      end if;
      raise notice 'el ajuste de precios es todo o nada y no se repite: todo en verde';
  end;
end
$prueba$;
