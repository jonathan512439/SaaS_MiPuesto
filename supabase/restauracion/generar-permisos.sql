-- Genera el guion que reproduce los permisos de la base.
--
-- Lo corre el respaldo contra producción y guarda su salida en
-- `respaldo-permisos.sql`. **No modifica nada**: solo lee catálogos.
--
-- Por qué existe
-- --------------
-- `pg_dump --no-privileges` descarta los permisos, y este sistema depende de
-- ellos. Varias migraciones **revocan** a propósito: `authenticated` tiene
-- únicamente `select` sobre `pedidos` y `pedido_items`, y sobre `negocios` no
-- tiene `update` —los cambios pasan por funciones que auditan—. Al restaurar sin
-- permisos, Supabase repone los suyos por defecto y **la base queda más
-- permisiva que el original**: un respaldo que restaura un sistema menos seguro
-- que el que respaldó.
--
-- Lo encontró el recorrido de aislamiento el 2026-09-09, con «pedidos: la
-- actualización sin permiso no fue rechazada como se esperaba».
--
-- Por qué se genera y no se escribe a mano
-- ---------------------------------------
-- Mismo motivo que las políticas de Storage: una lista escrita a mano se
-- desincroniza en silencio, y una fase que agregue una tabla dejaría el respaldo
-- corto sin que nada avise. Lo que se respalda es lo que hay.
--
-- Cómo funciona
-- -------------
-- Primero revoca todo para los cuatro destinatarios que importan, y después
-- vuelve a otorgar exactamente lo que tiene producción. Sin la revocación previa,
-- los permisos por defecto de Supabase quedarían sumados a los reales.
--
-- `acldefault` es la pieza no obvia: cuando una tabla o función nunca tuvo un
-- `grant` explícito, su columna de permisos es nula, y nula no significa «sin
-- permisos» sino «los de fábrica» —que en una función son `execute` para todos—.
-- Sin ese `coalesce`, esas quedarían fuera del guion y se perderían al restaurar.

-- El camino de búsqueda vacío lo fija quien invoca este guion, con `PGOPTIONS`,
-- y **no se pone acá**. Con un `set search_path = ''` en este archivo, psql
-- escribe la etiqueta de estado «SET» en su salida, y como esa salida es el
-- archivo de respaldo, quedaba una línea suelta arriba de todo que Postgres leía
-- pegada a la sentencia siguiente. Pasó dos veces el 2026-09-09, de dos formas
-- distintas: la segunda fue esta.

select linea from (
  select 0 as orden, 'set search_path = public, private, extensions;' as linea

  union all
  select 1, 'revoke all on all tables in schema public, private from public, anon, authenticated, service_role;'
  union all
  select 2, 'revoke all on all functions in schema public, private from public, anon, authenticated, service_role;'

  -- Los nombres se arman con el esquema y el objeto por separado, y **no** con
  -- `::regclass` ni `::regprocedure`. Esos dos omiten el esquema de lo que ya
  -- está visible en el camino de búsqueda, así que el guion salía calificado o
  -- sin calificar según quién lo invocara. Un archivo de respaldo no puede
  -- depender de eso: escrito así, dice lo mismo desde cualquier sesión.
  union all
  select 3, format('grant %s on table %I.%I to %s;',
                   a.privilege_type,
                   n.nspname, c.relname,
                   case when a.grantee = 0 then 'public' else quote_ident(g.rolname) end)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname in ('public', 'private')
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
  left join pg_roles g on g.oid = a.grantee
  where c.relkind in ('r', 'v', 'm')
    and (a.grantee = 0 or g.rolname in ('anon', 'authenticated', 'service_role'))

  union all
  select 4, format('grant execute on function %I.%I(%s) to %s;',
                   n.nspname, p.proname,
                   pg_get_function_identity_arguments(p.oid),
                   case when a.grantee = 0 then 'public' else quote_ident(g.rolname) end)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace and n.nspname in ('public', 'private')
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  left join pg_roles g on g.oid = a.grantee
  where a.privilege_type = 'EXECUTE'
    and (a.grantee = 0 or g.rolname in ('anon', 'authenticated', 'service_role'))
) generado
order by orden;
