-- Notas del pedido: lo que el cliente quiere aclarar al pedir con carrito.
--
-- «Sin cebolla», «entregar después de las 18:00», «es para regalo». Hasta hoy
-- eso se escribía aparte en WhatsApp, después del pedido, y el dueño tenía que
-- juntar las dos cosas. Ahora va en el pedido y en el mensaje.
--
-- Va detrás de un interruptor por negocio, apagado: nada cambia para quien no
-- lo toca. Es texto del cliente, así que hasta 300 caracteres —como la nota de
-- las citas— y se borra con su nombre y su teléfono, a los seis meses o cuando
-- lo pide (`20261024090000_datos_de_clientes_seis_meses.sql`).
--
-- Compatible con el código que ya está en producción: `p_nota` va al final y
-- con valor por omisión, y la ruta llama por nombre de parámetro. El código de
-- antes sigue creando pedidos sin nota hasta que salga el nuevo.

alter table public.negocios
  add column pide_nota_pedido boolean not null default false;

comment on column public.negocios.pide_nota_pedido is
  'Si el carrito ofrece el campo «Notas del pedido». Solo tiene sentido con carrito.';

-- El catálogo lo lee para mostrar el campo; el dueño lo cambia desde
-- «Atención y reservas».
grant select (pide_nota_pedido) on table public.negocios to anon, authenticated;
grant update (pide_nota_pedido) on table public.negocios to authenticated;

alter table public.pedidos
  add column nota text;

alter table public.pedidos
  add constraint pedidos_nota_corta
  check (nota is null or char_length(nota) between 1 and 300);

comment on column public.pedidos.nota is
  'Lo que el cliente escribió en «Notas del pedido». Nulo si no escribió o el negocio no las pide. Se borra con sus datos.';

-- ---------------------------------------------------------------------------
-- 1. crear_pedido_reservado con la nota.
--
-- La versión de `20261028090000_tope_de_unidades_por_pedido.sql`, copiada tal
-- cual, con tres cambios: el parámetro `p_nota`, su tope (`NOTA_INVALIDA`) y la
-- columna en el `insert` y en las dos respuestas.
--
-- Se borra la de siete parámetros en vez de dejar las dos: con una de siete y
-- otra de ocho con valor por omisión, una llamada con siete sería ambigua.
-- ---------------------------------------------------------------------------
drop function if exists public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text);

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

-- La llama solo el servidor. La firma es nueva, así que los permisos también:
-- la versión con mesa nació abierta por olvidar esto (ver
-- `20261111090000_segundo_factor_en_toda_la_plataforma.sql`).
revoke all on function public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Los dos borrados de datos del cliente también vacían la nota: la escribe
--    el cliente y puede traer una dirección o un teléfono. Las mismas
--    funciones de `20261024090000_datos_de_clientes_seis_meses.sql`, con la
--    nota agregada.
-- ---------------------------------------------------------------------------
create or replace function public.borrar_datos_de_clientes_viejos(p_meses integer default 6)
returns table (pedidos integer, citas integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedidos integer;
  v_citas integer;
  v_corte timestamptz;
begin
  if p_meses is null or p_meses < 1 then
    raise exception using errcode = 'P0001', message = 'PLAZO_INVALIDO';
  end if;
  v_corte := now() - make_interval(months => p_meses);

  update public.pedidos
  set cliente_nombre = null,
      cliente_telefono = null,
      nota = null,
      datos_cliente_borrados_en = now()
  where creado_en < v_corte
    and estado <> 'pendiente'
    and datos_cliente_borrados_en is null
    and (cliente_nombre is not null or cliente_telefono is not null or nota is not null);
  get diagnostics v_pedidos = row_count;

  update public.citas
  set nombre_cliente = public.texto_datos_borrados(),
      telefono_cliente = null,
      nota = null,
      datos_cliente_borrados_en = now()
  where upper(rango) < v_corte
    and datos_cliente_borrados_en is null;
  get diagnostics v_citas = row_count;

  return query select v_pedidos, v_citas;
end;
$$;

create or replace function public.borrar_datos_de_un_cliente(p_telefono text)
returns table (pedidos integer, citas integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedidos integer;
  v_citas integer;
begin
  if p_telefono is null or p_telefono !~ '^591[67][0-9]{7}$' then
    raise exception using errcode = 'P0001', message = 'TELEFONO_INVALIDO';
  end if;

  update public.pedidos
  set cliente_nombre = null,
      cliente_telefono = null,
      nota = null,
      datos_cliente_borrados_en = now()
  where cliente_telefono = p_telefono;
  get diagnostics v_pedidos = row_count;

  update public.citas
  set nombre_cliente = public.texto_datos_borrados(),
      telefono_cliente = null,
      nota = null,
      datos_cliente_borrados_en = now()
  where telefono_cliente = p_telefono;
  get diagnostics v_citas = row_count;

  return query select v_pedidos, v_citas;
end;
$$;

comment on function public.borrar_datos_de_clientes_viejos(integer) is
  'Borra nombre, teléfono y nota de los clientes en pedidos cerrados y citas pasadas hace más del plazo, en meses. Seis por omisión, como promete la política de privacidad.';
comment on function public.borrar_datos_de_un_cliente(text) is
  'Borra nombre, teléfono y nota de un cliente final en todos los negocios, por su teléfono. Para cuando el cliente lo pide.';

notify pgrst, 'reload schema';
