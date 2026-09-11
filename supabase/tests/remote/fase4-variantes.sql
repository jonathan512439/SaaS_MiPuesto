-- Fase 4: las presentaciones de un producto.
--
-- Comprueba lo que el validador de TypeScript no garantiza: que la base rechace
-- por su cuenta una presentación imposible, y que una del negocio A no pueda
-- colgar de un producto del B.
--
-- Corre dentro de una transacción que termina en `rollback`.

begin;

do $$
declare
  negocio uuid;
  producto uuid;
  ajeno uuid;
  fallo boolean;
  i integer;
begin
  -- 1. El único compuesto en `productos`. Es lo que esta fase tuvo que agregar:
  --    se había dado por sentado que existía desde la fase de pedidos y no era
  --    así, y el `create table` falló al aplicarse. Queda vigilado.
  if not exists (
    select 1
    from pg_constraint as restriccion
    join pg_class as tabla on tabla.oid = restriccion.conrelid
    join pg_namespace as espacio on espacio.oid = tabla.relnamespace
    where espacio.nspname = 'public'
      and tabla.relname = 'productos'
      and restriccion.contype = 'u'
      and restriccion.conkey @> array[
        (select attnum from pg_attribute where attrelid = tabla.oid and attname = 'id'),
        (select attnum from pg_attribute where attrelid = tabla.oid and attname = 'negocio_id')
      ]::smallint[]
  ) then
    raise exception 'Fase 4: falta el único compuesto (id, negocio_id) en productos';
  end if;

  -- 2. La clave foránea de las presentaciones es compuesta.
  if not exists (
    select 1
    from pg_constraint as restriccion
    join pg_class as tabla on tabla.oid = restriccion.conrelid
    join pg_namespace as espacio on espacio.oid = tabla.relnamespace
    where espacio.nspname = 'public'
      and tabla.relname = 'variantes_producto'
      and restriccion.contype = 'f'
      and cardinality(restriccion.conkey) = 2
  ) then
    raise exception 'Fase 4: variantes_producto no tiene clave foránea compuesta';
  end if;

  -- 3. RLS encendido.
  if not exists (
    select 1 from pg_class as clase
    join pg_namespace as espacio on espacio.oid = clase.relnamespace
    where espacio.nspname = 'public'
      and clase.relname = 'variantes_producto'
      and clase.relrowsecurity = true
  ) then
    raise exception 'Fase 4: variantes_producto no tiene RLS';
  end if;

  -- 4. La función del tope fija `search_path` vacío. Postgres lo guarda como
  --    `search_path=""`, con las comillas adentro del texto.
  if not exists (
    select 1 from pg_proc as funcion
    join pg_namespace as espacio on espacio.oid = funcion.pronamespace
    where espacio.nspname = 'public'
      and funcion.proname = 'limitar_variantes_por_producto'
      and funcion.prosecdef = true
      and exists (
        select 1 from unnest(funcion.proconfig) as ajuste
        where ajuste in ('search_path=', 'search_path=""')
      )
  ) then
    raise exception 'Fase 4: limitar_variantes_por_producto no fija search_path vacío';
  end if;

  -- 5. Desde acá, comportamiento. Se usa un producto que ya existe: inventar uno
  --    obligaría a inventar un negocio y un usuario.
  select id, negocio_id into producto, negocio
  from public.productos where eliminado_en is null order by creado_en limit 1;

  if producto is null then
    raise notice 'Fase 4: no hay productos para probar el comportamiento. Solo se auditó la forma.';
    return;
  end if;

  -- 6. Dos presentaciones con el mismo nombre dejarían al comprador eligiendo
  --    entre dos opciones idénticas.
  insert into public.variantes_producto (negocio_id, producto_id, nombre)
  values (negocio, producto, 'Talla M');

  fallo := false;
  begin
    insert into public.variantes_producto (negocio_id, producto_id, nombre)
    values (negocio, producto, 'Talla M');
  exception when unique_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 4: la base aceptó dos presentaciones con el mismo nombre';
  end if;

  -- 7. Un precio negativo no es un precio.
  fallo := false;
  begin
    insert into public.variantes_producto (negocio_id, producto_id, nombre, precio)
    values (negocio, producto, 'Regalada', -10);
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 4: la base aceptó un precio negativo';
  end if;

  -- 8. El tope de doce, que lo hace cumplir el disparador.
  for i in 1..11 loop
    insert into public.variantes_producto (negocio_id, producto_id, nombre)
    values (negocio, producto, 'Presentación ' || i);
  end loop;

  fallo := false;
  begin
    insert into public.variantes_producto (negocio_id, producto_id, nombre)
    values (negocio, producto, 'Presentación 13');
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 4: la base aceptó la presentación trece';
  end if;

  -- 9. Una presentación del negocio A no puede colgar de un producto del B.
  --    Lo sostiene la clave foránea compuesta, no una política.
  select id into ajeno from public.productos
  where negocio_id <> negocio and eliminado_en is null limit 1;

  if ajeno is not null then
    fallo := false;
    begin
      insert into public.variantes_producto (negocio_id, producto_id, nombre)
      values (negocio, ajeno, 'Colada');
    exception when foreign_key_violation then
      fallo := true;
    end;
    if not fallo then
      raise exception 'Fase 4: una presentación pudo colgar del producto de otro negocio';
    end if;
  else
    raise notice 'Fase 4: hay un solo negocio con productos, no se probó el cruce.';
  end if;

  -- 10. Borrar el producto se lleva sus presentaciones. Sin esto quedarían filas
  --     apuntando a la nada, que nadie puede ver ni borrar desde el panel.
  delete from public.productos where id = producto;
  if exists (select 1 from public.variantes_producto where producto_id = producto) then
    raise exception 'Fase 4: las presentaciones sobrevivieron al borrado del producto';
  end if;

  raise notice 'Fase 4: las presentaciones están bien declaradas y la base las hace cumplir.';
end;
$$;

rollback;
