-- Las fotos de un producto se agregan y se quitan en la base, de a una.
--
-- La ruta leía la lista de fotos, le sumaba una y escribía la lista entera: dos
-- subidas a la vez leían la misma lista y la segunda pisaba a la primera, que
-- quedaba subida pero sin referencia. Y al borrar, primero se borraba el
-- archivo y después la referencia: si fallaba lo segundo, el catálogo mostraba
-- una foto rota. Lo encontró la auditoría del 2026-09-30.
--
-- Cada operación es ahora una sola sentencia sobre la fila —`array_append`,
-- `array_remove`—, así que dos subidas a la vez van en fila y ninguna pisa a la
-- otra. El tope de fotos del plan y el máximo de cuatro los siguen cuidando el
-- disparador y la comprobación que ya existían. La ruta quita la referencia
-- antes de borrar el archivo: si el borrado falla, queda un archivo sin uso,
-- nunca una foto rota.
--
-- Solo se vincula una ruta del propio negocio y del propio producto: nadie
-- puede colgarle a su producto el archivo de otro. Probada en ensayo con
-- `supabase/tests/remote/fotos-atomicas.sql`.

create or replace function public.agregar_foto_producto(p_producto_id uuid, p_ruta text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_negocio uuid;
  v_fotos text[];
begin
  select producto.negocio_id into v_negocio
  from public.productos as producto
  join public.negocios as negocio on negocio.id = producto.negocio_id
  where producto.id = p_producto_id
    and producto.eliminado_en is null
    and negocio.admin_user_id = (select auth.uid());
  if v_negocio is null then
    raise exception using errcode = 'P0001', message = 'PRODUCTO_NO_ENCONTRADO';
  end if;

  if p_ruta is null or p_ruta not like v_negocio::text || '/' || p_producto_id::text || '/%' then
    raise exception using errcode = 'P0001', message = 'RUTA_AJENA';
  end if;

  update public.productos
  set fotos = case when p_ruta = any (fotos) then fotos else array_append(fotos, p_ruta) end
  where id = p_producto_id
  returning fotos into v_fotos;

  return v_fotos;
end;
$$;

create or replace function public.quitar_foto_producto(p_producto_id uuid, p_ruta text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existe boolean;
  v_fotos text[];
begin
  select true into v_existe
  from public.productos as producto
  join public.negocios as negocio on negocio.id = producto.negocio_id
  where producto.id = p_producto_id
    and producto.eliminado_en is null
    and negocio.admin_user_id = (select auth.uid());
  if v_existe is null then
    raise exception using errcode = 'P0001', message = 'PRODUCTO_NO_ENCONTRADO';
  end if;

  update public.productos
  set fotos = array_remove(fotos, p_ruta)
  where id = p_producto_id
    and p_ruta = any (fotos)
  returning fotos into v_fotos;
  if not found then
    raise exception using errcode = 'P0001', message = 'FOTO_NO_ENCONTRADA';
  end if;

  return v_fotos;
end;
$$;

revoke all on function public.agregar_foto_producto(uuid, text) from public, anon;
revoke all on function public.quitar_foto_producto(uuid, text) from public, anon;
grant execute on function public.agregar_foto_producto(uuid, text) to authenticated, service_role;
grant execute on function public.quitar_foto_producto(uuid, text) to authenticated, service_role;
