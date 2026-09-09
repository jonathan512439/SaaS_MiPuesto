-- Lo que hay que crear ANTES de restaurar el volcado.
--
-- `pg_dump --schema=public --schema=private` **no emite `create extension`**:
-- las extensiones no pertenecen a esos esquemas. El volcado igual las usa —el
-- índice de búsqueda pide `gin_trgm_ops` y el vigilante llama a
-- `extensions.http_get`— así que restaurarlo sobre un proyecto recién creado
-- falla en la primera de las dos.
--
-- Se descubrió el 2026-09-09, preparando el ensayo de restauración. Es
-- exactamente para esto que el ensayo existe: el respaldo pesaba bien, subía
-- bien y no se podía usar.
--
-- Se aplica sobre el proyecto nuevo, antes de `pg_restore`.

-- Búsqueda por similitud. La usa el índice de `productos.texto_busqueda`.
create extension if not exists pg_trgm;

-- Tareas programadas. La usa el postámbulo, no el volcado.
create extension if not exists pg_cron;

-- Peticiones HTTP desde la base. Las usa el vigilante de salud.
-- Va en `extensions` y no en `public` a propósito: PostgREST expone `public`, y
-- una función que hace peticiones salientes no tiene por qué estar al alcance de
-- la API de datos. Es la contención real, verificada contra la API pública.
create schema if not exists extensions;
create extension if not exists http with schema extensions;
