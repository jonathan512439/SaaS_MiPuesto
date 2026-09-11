-- Fase 2: los campos de la categoría.
--
-- Comprueba lo que el validador de TypeScript no puede garantizar: que la base
-- rechace por su cuenta una definición imposible. El validador cuida al dueño;
-- esto cuida al sistema de una petición armada a mano, de una corrección desde
-- el panel de Supabase o de una migración futura mal escrita.
--
-- Corre dentro de una transacción que termina en `rollback`, así que se puede
-- repetir contra producción sin dejar nada escrito.

begin;

do $$
declare
  negocio uuid;
  categoria uuid;
  ajena uuid;
  fallo boolean;
  i integer;
begin
  -- 1. La clave foránea es compuesta. Es la regla de aislamiento del proyecto y
  --    se lee del catálogo del sistema, no de una lista escrita a mano: si
  --    alguien la reemplaza por una simple, esto falla solo.
  if not exists (
    select 1
    from pg_constraint as restriccion
    join pg_class as tabla on tabla.oid = restriccion.conrelid
    join pg_namespace as espacio on espacio.oid = tabla.relnamespace
    where espacio.nspname = 'public'
      and tabla.relname = 'atributos_categoria'
      and restriccion.contype = 'f'
      and cardinality(restriccion.conkey) = 2
  ) then
    raise exception 'Fase 2: atributos_categoria no tiene clave foránea compuesta';
  end if;

  -- 2. RLS encendido. Una tabla con negocio_id sin RLS deja ver los campos de
  --    todos los negocios a cualquiera que tenga sesión.
  if not exists (
    select 1 from pg_class as clase
    join pg_namespace as espacio on espacio.oid = clase.relnamespace
    where espacio.nspname = 'public'
      and clase.relname = 'atributos_categoria'
      and clase.relrowsecurity = true
  ) then
    raise exception 'Fase 2: atributos_categoria no tiene RLS';
  end if;

  -- 3. El disparador del tope existe y su función está bien declarada. Una
  --    función `security definer` sin `search_path` vacío es un agujero, y en
  --    este proyecto ya se revisó dos veces por lo mismo.
  if not exists (
    select 1 from pg_trigger
    where tgname = 'atributos_dentro_del_tope' and not tgisinternal
  ) then
    raise exception 'Fase 2: falta el disparador del tope de campos';
  end if;

  if not exists (
    select 1 from pg_proc as funcion
    join pg_namespace as espacio on espacio.oid = funcion.pronamespace
    where espacio.nspname = 'public'
      and funcion.proname = 'limitar_atributos_por_categoria'
      and funcion.prosecdef = true
      -- Postgres normaliza `set search_path = ''` y lo guarda como
      -- `search_path=""`, con las comillas adentro del texto. Se aceptan las dos
      -- formas porque las dos significan lo mismo: sin esto, la comprobación
      -- fallaba sobre una función que estaba bien escrita.
      and exists (
        select 1 from unnest(funcion.proconfig) as ajuste
        where ajuste in ('search_path=', 'search_path=""')
      )
  ) then
    raise exception 'Fase 2: limitar_atributos_por_categoria no fija search_path vacío';
  end if;

  -- 4. La columna de valores y su índice.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'productos'
      and column_name = 'atributos' and data_type = 'jsonb' and is_nullable = 'NO'
  ) then
    raise exception 'Fase 2: productos.atributos no existe o admite nulos';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'productos'
      and indexname = 'idx_productos_atributos'
  ) then
    raise exception 'Fase 2: falta el índice gin de productos.atributos';
  end if;

  -- 5. Desde acá se prueba el comportamiento. Se usa un negocio y una categoría
  --    que ya existen: `negocios.admin_user_id` es obligatorio y apunta a
  --    `auth.users`, así que inventar un negocio obligaría a inventar un usuario.
  select id, negocio_id into categoria, negocio
  from public.categorias order by nombre limit 1;

  if categoria is null then
    raise notice 'Fase 2: no hay categorías para probar el comportamiento. Solo se auditó la forma.';
    return;
  end if;

  -- 6. Un campo de lista sin opciones no se puede completar: se rechaza.
  fallo := false;
  begin
    insert into public.atributos_categoria (negocio_id, categoria_id, clave, nombre, tipo)
    values (negocio, categoria, 'casquillo', 'Casquillo', 'opcion');
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 2: la base aceptó un campo de lista sin opciones';
  end if;

  -- 7. Una unidad en un campo que no es número no significa nada.
  fallo := false;
  begin
    insert into public.atributos_categoria (negocio_id, categoria_id, clave, nombre, tipo, unidad)
    values (negocio, categoria, 'material', 'Material', 'texto', 'kg');
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 2: la base aceptó una unidad en un campo de texto';
  end if;

  -- 8. Solo los cuatro tipos que el sistema sabe dibujar.
  fallo := false;
  begin
    insert into public.atributos_categoria (negocio_id, categoria_id, clave, nombre, tipo)
    values (negocio, categoria, 'vence', 'Vence', 'fecha');
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 2: la base aceptó un tipo de campo inventado';
  end if;

  -- 9. El tope de diez, que es lo que hace cumplir el disparador. Se insertan
  --    diez y se comprueba que el once no entra.
  for i in 1..10 loop
    insert into public.atributos_categoria (negocio_id, categoria_id, clave, nombre, tipo)
    values (negocio, categoria, 'campo_' || i, 'Campo ' || i, 'texto');
  end loop;

  fallo := false;
  begin
    insert into public.atributos_categoria (negocio_id, categoria_id, clave, nombre, tipo)
    values (negocio, categoria, 'campo_11', 'Campo 11', 'texto');
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 2: la base aceptó el campo once';
  end if;

  -- 10. La misma clave dos veces en la misma categoría pisaría el valor de una
  --     con el de la otra en todos los productos.
  fallo := false;
  begin
    insert into public.atributos_categoria (negocio_id, categoria_id, clave, nombre, tipo)
    values (negocio, categoria, 'campo_1', 'Otro campo 1', 'texto');
  exception when unique_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 2: la base aceptó dos campos con la misma clave';
  end if;

  -- 10 bis. El otro tope: hasta seis en la tarjeta. Es una rama distinta del
  --     disparador y sin esto quedaría sin probar del lado de la base. Se vacía
  --     primero porque la categoría ya tiene los diez de arriba.
  delete from public.atributos_categoria where categoria_id = categoria;

  for i in 1..6 loop
    insert into public.atributos_categoria
      (negocio_id, categoria_id, clave, nombre, tipo, en_tarjeta)
    values (negocio, categoria, 'visible_' || i, 'Visible ' || i, 'texto', true);
  end loop;

  fallo := false;
  begin
    insert into public.atributos_categoria
      (negocio_id, categoria_id, clave, nombre, tipo, en_tarjeta)
    values (negocio, categoria, 'visible_7', 'Visible 7', 'texto', true);
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 2: la base aceptó el séptimo campo en la tarjeta';
  end if;

  -- 11. Un campo del negocio A no puede colgar de una categoría del negocio B.
  --     Esto lo sostiene la clave foránea compuesta, no una política.
  select id into ajena from public.categorias where negocio_id <> negocio limit 1;
  if ajena is not null then
    fallo := false;
    begin
      insert into public.atributos_categoria (negocio_id, categoria_id, clave, nombre, tipo)
      values (negocio, ajena, 'colado', 'Colado', 'texto');
    exception when foreign_key_violation then
      fallo := true;
    end;
    if not fallo then
      raise exception 'Fase 2: un campo pudo colgar de la categoría de otro negocio';
    end if;
  else
    raise notice 'Fase 2: hay un solo negocio, no se pudo probar el cruce entre negocios.';
  end if;

  -- 12. Los valores del producto son un objeto, no una lista ni un número.
  fallo := false;
  begin
    update public.productos set atributos = '[]'::jsonb
    where negocio_id = negocio and id = (
      select id from public.productos where negocio_id = negocio limit 1
    );
  exception when check_violation then
    fallo := true;
  end;
  if not fallo and exists (select 1 from public.productos where negocio_id = negocio) then
    raise exception 'Fase 2: productos.atributos aceptó una lista';
  end if;

  raise notice 'Fase 2: los campos de categoría están bien declarados y la base los hace cumplir.';
end;
$$;

rollback;
