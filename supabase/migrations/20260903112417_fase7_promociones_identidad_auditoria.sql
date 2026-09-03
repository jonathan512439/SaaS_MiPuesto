create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

alter table public.productos
  add column precio_anterior numeric(10, 2),
  add column precio_actualizado_en timestamptz,
  add column precio_actualizado_por uuid references auth.users(id) on delete set null;

alter table public.negocios
  add column activo_anterior boolean,
  add column activo_actualizado_en timestamptz,
  add column activo_actualizado_por uuid references auth.users(id) on delete set null;

alter table public.productos
  add constraint productos_precio_anterior_no_negativo_check
  check (precio_anterior is null or precio_anterior >= 0);

alter table public.negocios
  add constraint negocios_descripcion_longitud_check
  check (descripcion is null or char_length(descripcion) <= 500),
  add constraint negocios_redes_sociales_objeto_check
  check (jsonb_typeof(redes_sociales) = 'object');

create index idx_productos_precio_actualizado
  on public.productos (negocio_id, precio_actualizado_en desc)
  where precio_actualizado_en is not null;

create index idx_promociones_producto_activas
  on public.promociones (negocio_id, producto_id, fecha_inicio, fecha_fin)
  where activo = true and producto_id is not null;

create index idx_promociones_categoria_activas
  on public.promociones (negocio_id, categoria_id, fecha_inicio, fecha_fin)
  where activo = true and categoria_id is not null;

create or replace function private.registrar_cambio_precio_producto()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.precio is distinct from old.precio then
    new.precio_anterior := old.precio;
    new.precio_actualizado_en := now();
    new.precio_actualizado_por := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger productos_registrar_cambio_precio
before update of precio on public.productos
for each row
execute function private.registrar_cambio_precio_producto();

create or replace function private.registrar_cambio_activo_negocio()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.activo is distinct from old.activo then
    new.activo_anterior := old.activo;
    new.activo_actualizado_en := now();
    new.activo_actualizado_por := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger negocios_registrar_cambio_activo
before update of activo on public.negocios
for each row
execute function private.registrar_cambio_activo_negocio();

create or replace function private.validar_destino_promocion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.producto_id is not null and not exists (
    select 1
    from public.productos
    where productos.id = new.producto_id
      and productos.negocio_id = new.negocio_id
  ) then
    raise exception using errcode = '23514', message = 'La promoción y el producto deben pertenecer al mismo negocio.';
  end if;

  if new.categoria_id is not null and not exists (
    select 1
    from public.categorias
    where categorias.id = new.categoria_id
      and categorias.negocio_id = new.negocio_id
  ) then
    raise exception using errcode = '23514', message = 'La promoción y la categoría deben pertenecer al mismo negocio.';
  end if;

  return new;
end;
$$;

create trigger promociones_validar_destino
before insert or update of negocio_id, producto_id, categoria_id
on public.promociones
for each row
execute function private.validar_destino_promocion();

drop policy if exists "administra_promociones_propias" on public.promociones;

create policy "administra_promociones_propias"
on public.promociones for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = promociones.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = promociones.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
  and (
    producto_id is null
    or exists (
      select 1 from public.productos
      where productos.id = promociones.producto_id
        and productos.negocio_id = promociones.negocio_id
    )
  )
  and (
    categoria_id is null
    or exists (
      select 1 from public.categorias
      where categorias.id = promociones.categoria_id
        and categorias.negocio_id = promociones.negocio_id
    )
  )
);

revoke update on table public.negocios from authenticated;
grant update (
  slug,
  nombre,
  descripcion,
  tipo_negocio,
  logo_url,
  portada_url,
  telefono_whatsapp,
  redes_sociales,
  horario,
  qr_pago_url,
  plantilla_id,
  paleta_id,
  reserva_minutos
) on table public.negocios to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'negocios',
  'negocios',
  true,
  2097152,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "admin_lee_imagenes_negocio"
on storage.objects for select to authenticated
using (
  bucket_id = 'negocios'
  and (storage.foldername(name))[1] in (
    select negocios.id::text
    from public.negocios
    where negocios.admin_user_id = (select auth.uid())
  )
);

create policy "admin_sube_imagenes_negocio"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'negocios'
  and (storage.foldername(name))[1] in (
    select negocios.id::text
    from public.negocios
    where negocios.admin_user_id = (select auth.uid())
  )
);

create policy "admin_actualiza_imagenes_negocio"
on storage.objects for update to authenticated
using (
  bucket_id = 'negocios'
  and (storage.foldername(name))[1] in (
    select negocios.id::text
    from public.negocios
    where negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'negocios'
  and (storage.foldername(name))[1] in (
    select negocios.id::text
    from public.negocios
    where negocios.admin_user_id = (select auth.uid())
  )
);

create policy "admin_borra_imagenes_negocio"
on storage.objects for delete to authenticated
using (
  bucket_id = 'negocios'
  and (storage.foldername(name))[1] in (
    select negocios.id::text
    from public.negocios
    where negocios.admin_user_id = (select auth.uid())
  )
);

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
  from public.promociones as promocion
  where promocion.negocio_id = p_negocio_id
    and promocion.activo = true
    and (promocion.fecha_inicio is null or promocion.fecha_inicio <= p_momento)
    and (promocion.fecha_fin is null or promocion.fecha_fin > p_momento)
    and (
      promocion.producto_id = p_producto_id
      or (promocion.categoria_id is not null and promocion.categoria_id = p_categoria_id)
    );
$$;

comment on column public.productos.precio_anterior is
  'Último precio reemplazado; auditoría mínima de Fase 7.';
comment on column public.negocios.activo_anterior is
  'Último estado de publicación reemplazado; auditoría mínima de Fase 7.';
comment on column public.negocios.logo_url is
  'Ruta interna del logo en el bucket público negocios.';
comment on column public.negocios.portada_url is
  'Ruta interna de la portada en el bucket público negocios.';
comment on column public.negocios.qr_pago_url is
  'Ruta interna del QR de cobro en el bucket público negocios.';

create or replace function public.crear_pedido_reservado(
  p_slug text,
  p_items jsonb,
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_idempotencia uuid,
  p_huella_ip text
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
    idempotencia
  ) values (
    v_negocio.id,
    nullif(trim(p_cliente_nombre), ''),
    p_cliente_telefono,
    v_items,
    v_total,
    'pendiente',
    v_expira_en,
    p_idempotencia
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
    'repetido', false
  );
end;
$$;

grant usage on schema private to service_role;
grant execute on function private.calcular_precio_producto(numeric, uuid, uuid, uuid, timestamptz)
  to service_role;

revoke execute on function private.calcular_precio_producto(numeric, uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;
revoke execute on function private.registrar_cambio_precio_producto()
  from public, anon, authenticated;
revoke execute on function private.registrar_cambio_activo_negocio()
  from public, anon, authenticated;
revoke execute on function private.validar_destino_promocion()
  from public, anon, authenticated;
