-- Número de mesa en el pedido.
--
-- Un mozo que recibe «pedido #A3F2» sin mesa tiene que salir a preguntar quién
-- pidió qué, y eso es exactamente el trabajo que el catálogo vino a ahorrar.
--
-- Se guarda texto y no un número: en los locales reales las mesas se llaman
-- «A1», «Barra» o «Terraza», y forzar un entero obliga al dueño a inventar una
-- numeración que su personal no usa.
--
-- Va detrás de un interruptor por negocio: pedirle la mesa a quien compra ropa
-- por WhatsApp es un campo más entre él y el pedido.

alter table public.negocios
  add column pide_numero_mesa boolean not null default false;

comment on column public.negocios.pide_numero_mesa is
  'Si el catálogo pide el número de mesa al confirmar. Solo tiene sentido donde se atiende en el local.';

-- El catálogo público necesita saberlo para decidir si muestra el campo.
grant select (pide_numero_mesa) on table public.negocios to anon;
grant update (pide_numero_mesa) on table public.negocios to authenticated;

alter table public.pedidos
  add column numero_mesa text;

alter table public.pedidos
  add constraint pedidos_numero_mesa_corto
  check (numero_mesa is null or char_length(numero_mesa) between 1 and 10);

comment on column public.pedidos.numero_mesa is
  'Mesa que escribió el comprador. Nulo si el negocio no las pide.';

-- Se reemplaza en vez de agregar una segunda versión: dos funciones con el
-- mismo nombre, una de seis parámetros y otra de siete con valor por defecto,
-- se vuelven ambiguas en cuanto alguien llama con seis.
drop function if exists public.crear_pedido_reservado(text, jsonb, text, text, uuid, text);

create or replace function public.crear_pedido_reservado(
  p_slug text,
  p_items jsonb,
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_idempotencia uuid,
  p_huella_ip text,
  p_numero_mesa text default null
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
  v_cantidad_productos integer;
  v_expira_en timestamptz;
  v_limite integer;
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
      'repetido', true
    );
  end if;

  if p_cliente_nombre is not null and char_length(trim(p_cliente_nombre)) > 80 then
    raise exception using errcode = 'P0001', message = 'NOMBRE_INVALIDO';
  end if;

  if p_cliente_telefono is not null and p_cliente_telefono !~ '^591[67][0-9]{7}$' then
    raise exception using errcode = 'P0001', message = 'TELEFONO_INVALIDO';
  end if;

  select count(*), count(distinct solicitado.producto_id)
  into v_cantidad_solicitados, v_cantidad_productos
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
  where solicitado.producto_id is not null
    and solicitado.cantidad between 1 and 99;

  if v_cantidad_solicitados <> jsonb_array_length(p_items)
     or v_cantidad_productos <> v_cantidad_solicitados then
    raise exception using errcode = 'P0001', message = 'PEDIDO_INVALIDO';
  end if;

  perform producto.id
  from public.productos as producto
  join jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
    on solicitado.producto_id = producto.id
  where producto.negocio_id = v_negocio.id
  order by producto.id
  for update of producto;

  select count(*) into v_cantidad_productos
  from public.productos as producto
  join jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
    on solicitado.producto_id = producto.id
  where producto.negocio_id = v_negocio.id
    and producto.visible = true
    and producto.eliminado_en is null
    and producto.estado not in ('agotado', 'vendido');

  if v_cantidad_productos <> v_cantidad_solicitados then
    raise exception using errcode = 'P0001', message = 'PRODUCTO_NO_DISPONIBLE';
  end if;

  if exists (
    select 1
    from public.productos as producto
    join jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
      on solicitado.producto_id = producto.id
    where producto.negocio_id = v_negocio.id
      and producto.controla_stock = true
      and producto.cantidad_stock - producto.cantidad_reservada < solicitado.cantidad
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

  if v_limite > 5 then
    raise exception using errcode = 'P0001', message = 'LIMITE_PEDIDOS';
  end if;

  -- La mesa solo se acepta si el negocio la pide. Sin esto, cualquiera podría
  -- escribir un texto arbitrario en el pedido de un negocio que no atiende
  -- mesas, y ese texto se muestra en el panel del dueño.
  if p_numero_mesa is not null and nullif(trim(p_numero_mesa), '') is not null then
    if not v_negocio.pide_numero_mesa then
      raise exception using errcode = 'P0001', message = 'MESA_NO_PERMITIDA';
    end if;
    if char_length(trim(p_numero_mesa)) > 10 then
      raise exception using errcode = 'P0001', message = 'MESA_INVALIDA';
    end if;
  end if;

  v_expira_en := now() + make_interval(mins => v_negocio.reserva_minutos);

  select
    jsonb_agg(
      jsonb_build_object(
        'producto_id', producto.id,
        'codigo', producto.codigo,
        'nombre', producto.nombre,
        'precio_unitario', precio.valor,
        'precio_original', producto.precio,
        'cantidad', solicitado.cantidad,
        'subtotal', round(precio.valor * solicitado.cantidad, 2),
        'controla_stock', producto.controla_stock
      ) order by producto.id
    ),
    round(sum(precio.valor * solicitado.cantidad), 2)
  into v_items, v_total
  from public.productos as producto
  join jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
    on solicitado.producto_id = producto.id
  cross join lateral (
    select private.calcular_precio_producto(
      producto.precio,
      producto.negocio_id,
      producto.id,
      producto.categoria_id,
      now()
    ) as valor
  ) as precio
  where producto.negocio_id = v_negocio.id;

  insert into public.pedidos (
    negocio_id,
    cliente_nombre,
    cliente_telefono,
    items,
    total,
    estado,
    expira_en,
    idempotencia,
    numero_mesa
  ) values (
    v_negocio.id,
    nullif(trim(p_cliente_nombre), ''),
    p_cliente_telefono,
    v_items,
    v_total,
    'pendiente',
    v_expira_en,
    p_idempotencia,
    nullif(trim(p_numero_mesa), '')
  )
  returning * into v_pedido;

  insert into public.pedido_items (
    pedido_id,
    producto_id,
    producto_codigo,
    nombre,
    precio_unitario,
    cantidad,
    subtotal,
    controla_stock,
    reserva_activa
  )
  select
    v_pedido.id,
    producto.id,
    producto.codigo,
    producto.nombre,
    precio.valor,
    solicitado.cantidad,
    round(precio.valor * solicitado.cantidad, 2),
    producto.controla_stock,
    producto.controla_stock
  from public.productos as producto
  join jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
    on solicitado.producto_id = producto.id
  cross join lateral (
    select private.calcular_precio_producto(
      producto.precio,
      producto.negocio_id,
      producto.id,
      producto.categoria_id,
      now()
    ) as valor
  ) as precio
  where producto.negocio_id = v_negocio.id;

  update public.productos as producto
  set
    cantidad_reservada = producto.cantidad_reservada + solicitado.cantidad,
    estado = case
      when producto.cantidad_stock - producto.cantidad_reservada - solicitado.cantidad <= 0
        then 'reservado'
      else 'disponible'
    end,
    reservado_hasta = greatest(
      coalesce(producto.reservado_hasta, v_expira_en),
      v_expira_en
    )
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
  where producto.id = solicitado.producto_id
    and producto.negocio_id = v_negocio.id
    and producto.controla_stock = true;

  return jsonb_build_object(
    'id', v_pedido.id,
    'codigo', v_pedido.codigo,
    'total', v_pedido.total,
    'expira_en', v_pedido.expira_en,
    'items', v_pedido.items,
    'numero_mesa', v_pedido.numero_mesa,
    'repetido', false
  );
end;
$$;

-- El agujero que abrió la papelera, cerrado acá: un producto mandado a la
-- papelera conserva `visible = true`, así que un comprador con la página vieja
-- abierta podía pedirlo igual. La comprobación de disponibilidad ahora exige
-- `eliminado_en is null`.
