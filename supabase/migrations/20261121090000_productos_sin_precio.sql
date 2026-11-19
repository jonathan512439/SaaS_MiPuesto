-- Fase 14: productos sin precio (`docs/plan/11-PRODUCTOS-SIN-PRECIO.md`).
--
-- Un producto se puede guardar sin precio. El catálogo lo muestra sin precio y
-- con un solo botón, «Consultar por WhatsApp»; lo que la base garantiza es que
-- **no se puede comprar**: eso lo hace cumplir el motor y no la pantalla,
-- porque una petición armada a mano salta la pantalla.
--
-- Sin precio es `precio` nulo **o 0**: las dos cosas significan lo mismo. La
-- aplicación guarda el 0 como nulo; la base acepta las dos y las trata igual,
-- por si una fila llega con 0 desde la clave privilegiada.
--
-- Qué no cambia: la lectura pública (`productos_publicos_visibles`, las
-- presentaciones y el directorio). El producto sin precio se publica.
--
-- Los turnos no están acá: los inserta solo la ruta pública con la clave de
-- servicio —el visitante no tiene permiso sobre `citas`—, así que «un servicio
-- sin precio no se agenda en línea» lo hace cumplir `obtenerProductoAgendable`,
-- en el servidor. Las citas que el dueño carga a mano siguen igual.
--
-- Compatible con el código que está en producción: ningún producto vivo tiene
-- precio 0 (medido el 2026-11-18), y mientras el código nuevo no salga, nadie
-- guarda uno nulo. Las firmas de las tres funciones no cambian.

-- ---------------------------------------------------------------------------
-- 1. El precio admite nulo. Ninguna columna cambia de tipo.
-- ---------------------------------------------------------------------------
alter table public.productos
  alter column precio drop not null;

alter table public.productos
  drop constraint productos_precio_check;

alter table public.productos
  add constraint productos_precio_check
  check (precio is null or precio >= 0);

comment on column public.productos.precio is
  'Precio en la moneda del negocio. Nulo o 0: sin precio, se consulta por WhatsApp y no se pide.';

-- ---------------------------------------------------------------------------
-- 2. La promoción no se aplica a un producto sin precio.
--
-- La versión de `20260907110000_fase15_precios_por_horario.sql`, copiada tal
-- cual, con un cambio: sin precio devuelve nulo.
-- ---------------------------------------------------------------------------
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
  -- Sin precio, no hay precio que rebajar: se devuelve nulo, no 0.
  -- `greatest(0, null)` da 0 en Postgres, y un renglón sin precio habría
  -- sumado Bs 0 al pedido.
  select case when p_precio is null or p_precio = 0 then null else greatest(
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
  ) end
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

-- ---------------------------------------------------------------------------
-- 3. crear_pedido_reservado rechaza un renglón sin precio.
--
-- La versión de `20261118090000_notas_del_pedido.sql`, copiada tal cual, con
-- un cambio: `PRODUCTO_SIN_PRECIO`, después de comprobar que el producto está
-- a la vista y antes de mirar presentaciones y existencias. Misma firma, así
-- que conserva sus permisos; se repiten igual para que se lean acá.
-- ---------------------------------------------------------------------------
create or replace function public.crear_pedido_reservado(
  p_slug text,
  p_items jsonb,
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_idempotencia uuid,
  p_huella_ip text,
  p_numero_mesa text default null,
  p_nota text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_negocio public.negocios%rowtype;
  v_pedido public.pedidos%rowtype;
  v_items jsonb;
  v_total numeric(10, 2);
  v_cantidad_solicitados integer;
  v_cantidad_distintos integer;
  v_cantidad_validos integer;
  v_expira_en timestamptz;
  v_limite integer;
  v_unidades integer;
begin
  if p_idempotencia is null then
    raise exception using errcode = 'P0001', message = 'PEDIDO_INVALIDO';
  end if;

  if p_huella_ip is null or p_huella_ip !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'P0001', message = 'PEDIDO_INVALIDO';
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 30 then
    raise exception using errcode = 'P0001', message = 'PEDIDO_INVALIDO';
  end if;

  select * into v_negocio
  from public.negocios
  where slug = lower(trim(p_slug)) and activo = true
  for share;

  if not found then
    raise exception using errcode = 'P0001', message = 'NEGOCIO_NO_DISPONIBLE';
  end if;

  if v_negocio.tipo_negocio <> 'tienda_virtual' then
    raise exception using errcode = 'P0001', message = 'MODALIDAD_NO_PERMITE_PEDIDOS';
  end if;

  select * into v_pedido
  from public.pedidos
  where negocio_id = v_negocio.id and idempotencia = p_idempotencia;

  if found then
    return jsonb_build_object(
      'id', v_pedido.id,
      'codigo', v_pedido.codigo,
      'total', v_pedido.total,
      'expira_en', v_pedido.expira_en,
      'items', v_pedido.items,
      'numero_mesa', v_pedido.numero_mesa,
      'nota', v_pedido.nota,
      'repetido', true
    );
  end if;

  -- El nombre es opcional, como dice el formulario («Nombre · Opcional») y la
  -- política de privacidad. Solo se rechaza si es demasiado largo.
  if p_cliente_nombre is not null and char_length(trim(p_cliente_nombre)) > 80 then
    raise exception using errcode = 'P0001', message = 'NOMBRE_INVALIDO';
  end if;

  if p_cliente_telefono is not null and p_cliente_telefono !~ '^591[67][0-9]{7}$' then
    raise exception using errcode = 'P0001', message = 'TELEFONO_INVALIDO';
  end if;

  -- La nota, hasta 300 caracteres como la de las citas. El largo se revisa
  -- siempre: más de eso es un pedido mal armado, pida o no notas el negocio.
  if p_nota is not null and char_length(trim(p_nota)) > 300 then
    raise exception using errcode = 'P0001', message = 'NOTA_INVALIDA';
  end if;

  -- Un renglón por producto y presentación. La M y la L del mismo producto son
  -- dos renglones; la M dos veces, no.
  select
    count(*),
    count(distinct (solicitado.producto_id, coalesce(solicitado.variante_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  into v_cantidad_solicitados, v_cantidad_distintos
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid, cantidad integer)
  where solicitado.producto_id is not null
    and solicitado.cantidad between 1 and 99;

  if v_cantidad_solicitados <> jsonb_array_length(p_items)
     or v_cantidad_distintos <> v_cantidad_solicitados then
    raise exception using errcode = 'P0001', message = 'PEDIDO_INVALIDO';
  end if;

  -- El tope de unidades del negocio, si puso uno. Cuenta todas las unidades del
  -- pedido, no los renglones: tres camisas M y dos L son cinco. Va antes del
  -- contador por IP, porque es un pedido mal armado y no un intento de más.
  if v_negocio.tope_unidades_pedido is not null then
    select sum(solicitado.cantidad) into v_unidades
    from jsonb_to_recordset(p_items) as solicitado(cantidad integer);

    if v_unidades > v_negocio.tope_unidades_pedido then
      raise exception using errcode = 'P0001', message = 'TOPE_UNIDADES';
    end if;
  end if;

  -- Se bloquea en un orden fijo —productos y después presentaciones, cada uno
  -- por identificador— para que dos pedidos que se cruzan no se esperen el uno
  -- al otro para siempre. Las mismas reglas en `liberar_reservas_del_pedido`.
  perform producto.id
  from public.productos as producto
  where producto.id in (
      select solicitado.producto_id
      from jsonb_to_recordset(p_items) as solicitado(producto_id uuid)
    )
    and producto.negocio_id = v_negocio.id
  order by producto.id
  for update of producto;

  perform variante.id
  from public.variantes_producto as variante
  where variante.id in (
      select solicitado.variante_id
      from jsonb_to_recordset(p_items) as solicitado(variante_id uuid)
      where solicitado.variante_id is not null
    )
  order by variante.id
  for update of variante;

  -- Cada producto pedido: del negocio, a la vista y sin marcar agotado.
  select count(*) into v_cantidad_validos
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid)
  join public.productos as producto on producto.id = solicitado.producto_id
  where producto.negocio_id = v_negocio.id
    and producto.visible = true
    and producto.eliminado_en is null
    and producto.estado not in ('agotado', 'vendido');

  if v_cantidad_validos <> v_cantidad_solicitados then
    raise exception using errcode = 'P0001', message = 'PRODUCTO_NO_DISPONIBLE';
  end if;

  -- Un producto sin precio no se pide: se consulta por WhatsApp. El catálogo
  -- no lo deja entrar al carrito; esto cubre el carrito que quedó guardado en
  -- un teléfono antes de que el dueño quitara el precio, y la petición armada
  -- a mano. Cuenta el precio del producto y no el de la talla: con tallas de
  -- precio propio y sin precio base, también se consulta (decisión 4).
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as solicitado(producto_id uuid)
    join public.productos as producto on producto.id = solicitado.producto_id
    where producto.negocio_id = v_negocio.id
      and coalesce(producto.precio, 0) = 0
  ) then
    raise exception using errcode = 'P0001', message = 'PRODUCTO_SIN_PRECIO';
  end if;

  -- Un producto con presentaciones se pide eligiendo una.
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid)
    join public.productos as producto on producto.id = solicitado.producto_id
    where solicitado.variante_id is null
      and producto.con_presentaciones
  ) then
    raise exception using errcode = 'P0001', message = 'PRESENTACION_REQUERIDA';
  end if;

  -- La presentación elegida tiene que ser de ese producto, de este negocio y
  -- estar a la vista.
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid)
    left join public.variantes_producto as variante
      on variante.id = solicitado.variante_id
     and variante.producto_id = solicitado.producto_id
     and variante.negocio_id = v_negocio.id
     and variante.visible = true
    where solicitado.variante_id is not null
      and variante.id is null
  ) then
    raise exception using errcode = 'P0001', message = 'PRESENTACION_NO_DISPONIBLE';
  end if;

  -- Existencias: las del producto o las de la presentación, según dónde vivan.
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid, cantidad integer)
    join public.productos as producto on producto.id = solicitado.producto_id
    left join public.variantes_producto as variante on variante.id = solicitado.variante_id
    where producto.controla_stock = true
      and (
        (solicitado.variante_id is null
          and producto.cantidad_stock - producto.cantidad_reservada < solicitado.cantidad)
        or (solicitado.variante_id is not null
          and variante.cantidad_stock - variante.cantidad_reservada < solicitado.cantidad)
      )
  ) then
    raise exception using errcode = 'P0001', message = 'STOCK_INSUFICIENTE';
  end if;

  insert into public.limites_pedidos_ip as limite (
    negocio_id, huella_ip, ventana_inicio, cantidad
  ) values (
    v_negocio.id, p_huella_ip, now(), 1
  )
  on conflict (negocio_id, huella_ip) do update
  set
    ventana_inicio = case
      when limite.ventana_inicio <= now() - interval '15 minutes' then now()
      else limite.ventana_inicio
    end,
    cantidad = case
      when limite.ventana_inicio <= now() - interval '15 minutes' then 1
      else limite.cantidad + 1
    end
  returning cantidad into v_limite;

  -- Quince por IP y por negocio cada quince minutos (antes, cinco). Desde que
  -- Turnstile exige verificar a una persona, este tope es la segunda línea; y
  -- con cinco, las redes móviles —que ponen a muchos clientes detrás de una
  -- misma IP— podían dejar afuera a clientes reales de un negocio concurrido.
  if v_limite > 15 then
    raise exception using errcode = 'P0001', message = 'LIMITE_PEDIDOS';
  end if;

  if p_numero_mesa is not null and nullif(trim(p_numero_mesa), '') is not null then
    if not v_negocio.pide_numero_mesa then
      raise exception using errcode = 'P0001', message = 'MESA_NO_PERMITIDA';
    end if;
    if char_length(trim(p_numero_mesa)) > 10 then
      raise exception using errcode = 'P0001', message = 'MESA_INVALIDA';
    end if;
  end if;

  v_expira_en := now() + make_interval(mins => v_negocio.reserva_minutos);

  -- El precio lo pone la base. La presentación con precio propio cobra el suyo,
  -- sin promoción: quien fijó un precio para «7,5 kg» fijó ese. La que no tiene
  -- el suyo cobra el del producto, con la promoción que corresponda. Es la misma
  -- regla que muestra el catálogo (`lib/catalogo/publico.ts`).
  select
    jsonb_agg(
      jsonb_build_object(
        'producto_id', renglon.producto_id,
        'codigo', renglon.codigo,
        'nombre', renglon.nombre,
        'variante_id', renglon.variante_id,
        'variante_nombre', renglon.variante_nombre,
        'tipo_presentacion', renglon.tipo_presentacion,
        'precio_unitario', renglon.precio_unitario,
        'precio_original', renglon.precio_original,
        'cantidad', renglon.cantidad,
        'subtotal', round(renglon.precio_unitario * renglon.cantidad, 2),
        'controla_stock', renglon.controla_stock
      ) order by renglon.orden
    ),
    round(sum(renglon.precio_unitario * renglon.cantidad), 2)
  into v_items, v_total
  from (
    select
      solicitado.orden,
      producto.id as producto_id,
      producto.codigo,
      producto.nombre,
      producto.precio as precio_original,
      producto.controla_stock,
      variante.id as variante_id,
      variante.nombre as variante_nombre,
      case when variante.id is not null then producto.tipo_presentacion end as tipo_presentacion,
      solicitado.cantidad,
      case
        when variante.id is not null and variante.precio is not null then variante.precio
        else private.calcular_precio_producto(
          producto.precio, producto.negocio_id, producto.id, producto.categoria_id, now()
        )
      end as precio_unitario
    -- `rows from` porque `with ordinality` no acepta la lista de columnas pegada
    -- a la función: va adentro, y el número de orden se nombra afuera.
    from rows from (
        jsonb_to_recordset(p_items) as (producto_id uuid, variante_id uuid, cantidad integer)
      ) with ordinality as solicitado(producto_id, variante_id, cantidad, orden)
    join public.productos as producto on producto.id = solicitado.producto_id
    left join public.variantes_producto as variante on variante.id = solicitado.variante_id
    where producto.negocio_id = v_negocio.id
  ) as renglon;

  insert into public.pedidos (
    negocio_id,
    cliente_nombre,
    cliente_telefono,
    items,
    total,
    estado,
    expira_en,
    idempotencia,
    numero_mesa,
    nota
  ) values (
    v_negocio.id,
    nullif(trim(p_cliente_nombre), ''),
    p_cliente_telefono,
    v_items,
    v_total,
    'pendiente',
    v_expira_en,
    p_idempotencia,
    nullif(trim(p_numero_mesa), ''),
    -- Si el negocio apagó las notas mientras el cliente escribía, el pedido
    -- sale igual, sin la nota: perder una venta por una aclaración sería peor.
    -- El mensaje de WhatsApp se arma con lo guardado, así que el cliente ve
    -- que no llegó y puede escribirla ahí.
    case when v_negocio.pide_nota_pedido then nullif(trim(p_nota), '') end
  )
  returning * into v_pedido;

  -- Los renglones salen del JSON ya calculado: el precio que se guarda es
  -- exactamente el que se sumó en el total, sin volver a calcularlo.
  insert into public.pedido_items (
    pedido_id,
    producto_id,
    producto_codigo,
    nombre,
    precio_unitario,
    cantidad,
    subtotal,
    controla_stock,
    reserva_activa,
    variante_id,
    variante_nombre,
    tipo_presentacion
  )
  select
    v_pedido.id,
    renglon.producto_id,
    renglon.codigo,
    renglon.nombre,
    renglon.precio_unitario,
    renglon.cantidad,
    renglon.subtotal,
    renglon.controla_stock,
    renglon.controla_stock,
    renglon.variante_id,
    renglon.variante_nombre,
    renglon.tipo_presentacion
  from jsonb_to_recordset(v_items) as renglon(
    producto_id uuid,
    codigo text,
    nombre text,
    variante_id uuid,
    variante_nombre text,
    tipo_presentacion text,
    precio_unitario numeric,
    cantidad integer,
    subtotal numeric,
    controla_stock boolean
  );

  -- Reservar: en el producto los renglones sin presentación, y en la
  -- presentación los que la tienen. El disparador de la presentación vuelve a
  -- calcular el estado de su producto.
  update public.productos as producto
  set
    cantidad_reservada = producto.cantidad_reservada + solicitado.cantidad,
    estado = case
      when producto.cantidad_stock - producto.cantidad_reservada - solicitado.cantidad <= 0
        then 'reservado'
      else 'disponible'
    end
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid, cantidad integer)
  where producto.id = solicitado.producto_id
    and solicitado.variante_id is null
    and producto.negocio_id = v_negocio.id
    and producto.controla_stock = true;

  update public.variantes_producto as variante
  set cantidad_reservada = variante.cantidad_reservada + solicitado.cantidad
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid, cantidad integer),
       public.productos as producto
  where variante.id = solicitado.variante_id
    and producto.id = variante.producto_id
    and producto.controla_stock = true;

  update public.productos as producto
  set reservado_hasta = greatest(coalesce(producto.reservado_hasta, v_expira_en), v_expira_en)
  where producto.negocio_id = v_negocio.id
    and producto.controla_stock = true
    and producto.id in (
      select solicitado.producto_id
      from jsonb_to_recordset(p_items) as solicitado(producto_id uuid)
    );

  return jsonb_build_object(
    'id', v_pedido.id,
    'codigo', v_pedido.codigo,
    'total', v_pedido.total,
    'expira_en', v_pedido.expira_en,
    'items', v_pedido.items,
    'numero_mesa', v_pedido.numero_mesa,
    'nota', v_pedido.nota,
    'repetido', false
  );
end;
$$;

revoke all on function public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4. El ajuste masivo de precios salta los productos sin precio.
--
-- La versión de `20261104090000_el_ajuste_de_precios_es_todo_o_nada.sql`,
-- copiada tal cual, con un cambio: `producto.precio > 0`.
-- ---------------------------------------------------------------------------
create or replace function public.aplicar_ajuste_de_precios(
  p_idempotencia uuid,
  p_porcentaje numeric,
  p_cambios jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_negocio uuid;
  v_ajustados integer;
begin
  if p_idempotencia is null
     or p_cambios is null
     or jsonb_typeof(p_cambios) <> 'array'
     or jsonb_array_length(p_cambios) > 1000 then
    raise exception using errcode = 'P0001', message = 'AJUSTE_INVALIDO';
  end if;

  select negocio.id into v_negocio
  from public.negocios as negocio
  where negocio.admin_user_id = (select auth.uid());
  if v_negocio is null then
    raise exception using errcode = 'P0001', message = 'NEGOCIO_NO_ENCONTRADO';
  end if;

  -- Dos ajustes del mismo negocio al mismo tiempo van en fila: el segundo ve
  -- los precios que dejó el primero, y su lista de precios esperados ya no
  -- coincide, así que no ajusta sobre lo ajustado.
  perform pg_advisory_xact_lock(hashtext('ajuste_de_precios:' || v_negocio::text));

  select ajuste.ajustados into v_ajustados
  from public.ajustes_de_precios as ajuste
  where ajuste.negocio_id = v_negocio and ajuste.idempotencia = p_idempotencia;
  if found then
    return v_ajustados;
  end if;

  update public.productos as producto
  set precio = cambio.precio_nuevo
  from jsonb_to_recordset(p_cambios) as cambio(id uuid, precio_actual numeric, precio_nuevo numeric)
  where producto.id = cambio.id
    and producto.negocio_id = v_negocio
    and producto.eliminado_en is null
    -- Uno sin precio no se ajusta: un porcentaje de nada sigue siendo nada,
    -- y uno en 0 subiría a un precio que el dueño nunca puso.
    and producto.precio > 0
    and producto.precio = cambio.precio_actual
    and cambio.precio_nuevo is distinct from cambio.precio_actual;
  get diagnostics v_ajustados = row_count;

  insert into public.ajustes_de_precios (negocio_id, idempotencia, porcentaje, ajustados)
  values (v_negocio, p_idempotencia, p_porcentaje, v_ajustados);

  return v_ajustados;
end;
$$;


notify pgrst, 'reload schema';
