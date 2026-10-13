-- La última migración aplicada, para que un despliegue sepa si puede salir.
--
-- Subir a `main` despliega solo (Workers Builds), y las migraciones se aplican
-- aparte, a mano. El 2026-10-13 el código de la auditoría salió antes que sus
-- dos migraciones: hasta aplicarlas, el ajuste de precios y las fotos
-- respondieron 500, porque llamaban funciones que todavía no existían.
--
-- `/api/salud` informa esta versión y `scripts/check-migraciones-aplicadas.mjs`
-- la compara, antes de cada despliegue, con la última migración del
-- repositorio. El build de Cloudflare no tiene acceso a la base: por eso se
-- pregunta al sitio, que sí lo tiene.
--
-- Lo que se publica es una fecha de migración, que no dice nada que no diga el
-- repositorio. Solo la ejecuta la clave de servicio.

create or replace function public.esquema_aplicado()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select max(version) from supabase_migrations.schema_migrations;
$$;

revoke all on function public.esquema_aplicado() from public, anon, authenticated;
grant execute on function public.esquema_aplicado() to service_role;
