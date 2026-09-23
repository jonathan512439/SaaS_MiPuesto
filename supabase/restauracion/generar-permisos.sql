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

  -- Los permisos del ESQUEMA `private`. Faltaban, y fue el décimo defecto del
  -- respaldo: lo encontró la prueba de humo de la fase 13 el 2026-09-23, con
  -- «permission denied for schema private» al crear un pedido en la base de
  -- ensayo. La restauración saltea las entradas SCHEMA del volcado y crea
  -- `private` a mano en el preámbulo, así que el esquema quedaba sin el `usage`
  -- que producción le da a `service_role`. Las tablas y las funciones de adentro
  -- tenían sus permisos, pero no se podía entrar al esquema para llegar a ellas:
  -- el cálculo de precios y el motor de pedidos viven ahí. **Una restauración de
  -- producción habría dejado sin pedidos a todos los negocios.**
  --
  -- Solo `private`: `public` lo crea Supabase con sus permisos, y la restauración
  -- no lo toca.
  union all
  select 1, 'revoke all on schema private from public, anon, authenticated, service_role;'
  union all
  select 3, format('grant %s on schema %I to %s;',
                   a.privilege_type,
                   n.nspname,
                   case when a.grantee = 0 then 'public' else quote_ident(g.rolname) end)
  from pg_namespace n
  cross join lateral aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a
  left join pg_roles g on g.oid = a.grantee
  where n.nspname = 'private'
    and (a.grantee = 0 or g.rolname in ('anon', 'authenticated', 'service_role'))

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

  -- Los permisos POR COLUMNA, que son la mitad del modelo y la que menos se ve.
  --
  -- `has_table_privilege('anon', 'public.negocios', 'select')` da falso, y sin
  -- embargo el catálogo público lee esa tabla: lo hace por columnas. Y el dueño
  -- puede cambiar el nombre o la plantilla de su negocio pero **no** su fecha de
  -- vencimiento ni su marca de verificado, porque el permiso de escritura se
  -- otorgó columna por columna.
  --
  -- Son 31 columnas al 2026-09-09. Copiar solo los permisos de tabla las perdía
  -- todas, y la copia restaurada quedaba a la vez más cerrada —el catálogo no se
  -- podía leer— y con el modelo de escritura del dueño desdibujado.
  --
  -- Solo se emiten las columnas con permisos propios: una columna sin nada
  -- explícito hereda los de su tabla y no hay nada que decir de ella.
  union all
  select 5, format('grant %s (%I) on table %I.%I to %s;',
                   a.privilege_type,
                   att.attname,
                   n.nspname, c.relname,
                   case when a.grantee = 0 then 'public' else quote_ident(g.rolname) end)
  from pg_attribute att
  join pg_class c on c.oid = att.attrelid
  join pg_namespace n on n.oid = c.relnamespace and n.nspname in ('public', 'private')
  cross join lateral aclexplode(att.attacl) a
  left join pg_roles g on g.oid = a.grantee
  where att.attacl is not null
    and att.attnum > 0
    and not att.attisdropped
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
