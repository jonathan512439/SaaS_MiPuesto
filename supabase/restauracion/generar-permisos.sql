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

set search_path = '';

select linea from (
  select 0 as orden, 'set search_path = public, private, extensions;' as linea

  union all
  select 1, 'revoke all on all tables in schema public, private from public, anon, authenticated, service_role;'
  union all
  select 2, 'revoke all on all functions in schema public, private from public, anon, authenticated, service_role;'

  union all
  select 3, format('grant %s on table %s to %s;',
                   a.privilege_type,
                   c.oid::regclass,
                   case when a.grantee = 0 then 'public' else quote_ident(g.rolname) end)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname in ('public', 'private')
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
  left join pg_roles g on g.oid = a.grantee
  where c.relkind in ('r', 'v', 'm')
    and (a.grantee = 0 or g.rolname in ('anon', 'authenticated', 'service_role'))

  union all
  select 4, format('grant execute on function %s to %s;',
                   p.oid::regprocedure,
                   case when a.grantee = 0 then 'public' else quote_ident(g.rolname) end)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace and n.nspname in ('public', 'private')
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  left join pg_roles g on g.oid = a.grantee
  where a.privilege_type = 'EXECUTE'
    and (a.grantee = 0 or g.rolname in ('anon', 'authenticated', 'service_role'))
) generado
order by orden;
