-- Fase 1: la categoría toma identidad.
--
-- Lo que comprueba es lo que **no se puede comprobar desde TypeScript**: que la
-- base rechace por su cuenta lo que el validador rechaza desde afuera. Si solo
-- lo cuidara la aplicación, una petición armada a mano, una corrección desde el
-- panel de Supabase o un script de migración futuro lo saltearían.
--
-- Todo corre dentro de una transacción que termina en `rollback`: la auditoría
-- se puede repetir contra producción sin dejar nada escrito.

begin;

do $$
declare
  negocio_a uuid;
  negocio_b uuid;
  categoria_a uuid;
  fallo boolean;
begin
  -- 1. Las tres columnas existen, con el tipo y el valor por omisión esperados.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'categorias' and column_name = 'icono'
      and data_type = 'text' and is_nullable = 'NO'
  ) then
    raise exception 'Fase 1: categorias.icono no existe o admite nulos';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'categorias' and column_name = 'visible'
      and data_type = 'boolean' and is_nullable = 'NO'
  ) then
    raise exception 'Fase 1: categorias.visible no existe o admite nulos';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'categorias' and column_name = 'vende'
      and data_type = 'text' and is_nullable = 'NO'
  ) then
    raise exception 'Fase 1: categorias.vende no existe o admite nulos';
  end if;

  -- 2. El único compuesto, que es lo que van a necesitar `atributos_categoria`
  --    (fase 2) y `agenda_categoria` (fase 5) para exigirle al motor que el
  --    padre sea del mismo negocio. Se lee de `pg_constraint` y no de una lista
  --    escrita a mano: si alguien lo borra, esto falla solo.
  if not exists (
    select 1
    from pg_constraint as restriccion
    join pg_class as tabla on tabla.oid = restriccion.conrelid
    join pg_namespace as espacio on espacio.oid = tabla.relnamespace
    where espacio.nspname = 'public'
      and tabla.relname = 'categorias'
      and restriccion.contype = 'u'
      and restriccion.conkey @> array[
        (select attnum from pg_attribute where attrelid = tabla.oid and attname = 'id'),
        (select attnum from pg_attribute where attrelid = tabla.oid and attname = 'negocio_id')
      ]::smallint[]
  ) then
    raise exception 'Fase 1: falta el único compuesto (id, negocio_id) en categorias';
  end if;

  -- 3. Se comprueba el comportamiento, no solo la forma: una restricción puede
  --    estar declarada y no aplicarse —si alguien la dejó `not valid`— y eso
  --    solo se ve intentando escribir.
  --
  --    Se usa un negocio que ya existe en vez de crear uno. `negocios.admin_user_id`
  --    es obligatorio y apunta a `auth.users`, así que inventar un negocio
  --    obligaría a inventar también un usuario, dentro de una transacción que se
  --    va a deshacer igual. Todo lo que se escriba acá muere en el `rollback`.
  select id into negocio_a from public.negocios order by creado_en limit 1;
  select id into negocio_b from public.negocios order by creado_en desc limit 1;

  if negocio_a is null then
    raise notice 'Fase 1: no hay negocios para probar el comportamiento. Solo se auditó la forma.';
    return;
  end if;

  -- 4. Los valores por omisión: una categoría creada sin decir nada nace con
  --    ícono, visible y vendiendo cosas. De esto depende que los negocios que ya
  --    existen sigan mostrando sus esferas sin que nadie los toque.
  insert into public.categorias (negocio_id, nombre)
  values (negocio_a, 'Sin identidad')
  returning id into categoria_a;

  if not exists (
    select 1 from public.categorias
    where id = categoria_a and icono = 'caja' and visible = true and vende = 'cosas'
  ) then
    raise exception 'Fase 1: los valores por omisión de categorias no son los esperados';
  end if;

  -- 5. El formato del ícono lo hace cumplir la base, no solo el validador.
  fallo := false;
  begin
    insert into public.categorias (negocio_id, nombre, icono)
    values (negocio_a, 'Ícono con mayúsculas', 'Martillo');
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 1: la base aceptó un ícono con mayúsculas';
  end if;

  fallo := false;
  begin
    insert into public.categorias (negocio_id, nombre, icono)
    values (negocio_a, 'Ícono con etiqueta', '<script>alert(1)</script>');
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 1: la base aceptó un ícono que parece HTML';
  end if;

  -- 6. Solo las dos formas de vender que el sistema conoce.
  fallo := false;
  begin
    insert into public.categorias (negocio_id, nombre, vende)
    values (negocio_a, 'Vende cualquier cosa', 'servicios');
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 1: la base aceptó una forma de vender inventada';
  end if;

  -- 7. Que el único compuesto de verdad impida repetir el par. Es lo que las
  --    tablas hijas de las fases 2 y 5 van a usar para exigirle al motor que el
  --    padre sea del mismo negocio; si no fuera único, la clave foránea
  --    compuesta ni siquiera se podría declarar.
  fallo := false;
  begin
    insert into public.categorias (id, negocio_id, nombre)
    values (categoria_a, negocio_a, 'Repetida');
  exception when unique_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 1: se pudo repetir el par (id, negocio_id)';
  end if;

  if negocio_b is not null and negocio_b <> negocio_a then
    raise notice 'Fase 1: se probó con dos negocios distintos.';
  end if;

  raise notice 'Fase 1: la identidad de las categorías está bien declarada y se aplica.';
end;
$$;

rollback;
