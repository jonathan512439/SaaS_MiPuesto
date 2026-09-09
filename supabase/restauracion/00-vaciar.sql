-- Deja la base de ensayo vacía de lo nuestro, para poder restaurar encima.
--
-- El primer intento usaba `pg_restore --clean --if-exists`, y no sirve: el
-- `if exists` de `drop policy` protege contra que falte **la política**, no
-- contra que falte **la tabla**. Sobre una base recién creada, la primera
-- sentencia del volcado muere con «relation public.vigilancia_salud does not
-- exist». Lo que prometía hacer el ensayo repetible lo hacía imposible la
-- primera vez.
--
-- La otra salida evidente —`drop schema public cascade`— es peor y de una forma
-- que no se ve: Supabase configura **privilegios por defecto sobre el esquema**
-- para que las tablas nuevas queden alcanzables por `anon` y `authenticated`.
-- Esa configuración vive atada al esquema, así que borrarlo la borra, y como el
-- volcado va con `--no-privileges`, la base restaurada quedaría con todas las
-- tablas y sin permisos: la API devolvería «permission denied» en vez de aplicar
-- RLS, y el ensayo daría por rota una restauración que en realidad estaba bien.
--
-- Entonces: se vacían los dos esquemas y **se los deja en pie**.
--
-- Los objetos que pertenecen a una extensión se saltan. `pg_trgm` instala varias
-- funciones en `public`; borrarlas rompería la extensión y el índice de búsqueda
-- no se podría recrear.

do $$
declare
  objeto record;
begin
  -- Vistas primero: dependen de las tablas y así el cascada tiene menos trabajo.
  for objeto in
    select schemaname as esquema, viewname as nombre
      from pg_views
     where schemaname in ('public', 'private')
  loop
    execute format('drop view if exists %I.%I cascade', objeto.esquema, objeto.nombre);
  end loop;

  for objeto in
    select t.schemaname as esquema, t.tablename as nombre
      from pg_tables t
      join pg_class c on c.relname = t.tablename
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
     where t.schemaname in ('public', 'private')
       and not exists (
         select 1 from pg_depend d
          where d.objid = c.oid and d.deptype = 'e'
       )
  loop
    execute format('drop table if exists %I.%I cascade', objeto.esquema, objeto.nombre);
  end loop;

  for objeto in
    select n.nspname as esquema,
           p.proname as nombre,
           pg_get_function_identity_arguments(p.oid) as argumentos
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private')
       and not exists (
         select 1 from pg_depend d
          where d.objid = p.oid and d.deptype = 'e'
       )
  loop
    execute format(
      'drop function if exists %I.%I(%s) cascade',
      objeto.esquema, objeto.nombre, objeto.argumentos
    );
  end loop;

  for objeto in
    select n.nspname as esquema, t.typname as nombre
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname in ('public', 'private')
       and t.typtype in ('e', 'c', 'd')
       -- Los tipos compuestos que Postgres crea junto con cada tabla se van con
       -- la tabla; listarlos acá daría un error por intentar borrarlos dos veces.
       and not exists (select 1 from pg_class c where c.reltype = t.oid)
       and not exists (
         select 1 from pg_depend d
          where d.objid = t.oid and d.deptype = 'e'
       )
  loop
    execute format('drop type if exists %I.%I cascade', objeto.esquema, objeto.nombre);
  end loop;
end;
$$;

-- Las cuentas también, porque también se restauran.
--
-- Siete claves foráneas de `public` apuntan a `auth.users`, y una es
-- `negocios.admin_user_id`, que es `not null`: sin las cuentas no hay
-- restauración. Se cargan antes del volcado, así que hay que dejar la tabla
-- vacía o el segundo ensayo choca contra las filas del primero.
--
-- Va **después** de vaciar `public`: con nuestras tablas ya borradas, el cascada
-- solo alcanza a las tablas internas de `auth` —sesiones, identidades, factores—
-- y no a datos del negocio.
--
-- Sobre un proyecto recién creado esto no hace nada: la tabla ya está vacía.
truncate table auth.users cascade;

-- Que quede en el registro que quedó vacío de verdad.
select
  (select count(*) from pg_tables where schemaname = 'public') as tablas_en_public,
  (select count(*) from pg_tables where schemaname = 'private') as tablas_en_private,
  (select count(*) from auth.users) as cuentas;
