-- La tabla de administradores quedó sin permisos también para `service_role`,
-- que es quien la administra desde la máquina de operación. El `revoke all` que
-- la cerró a la aplicación se llevó por delante los permisos que Supabase
-- concede por defecto, y el resultado fue una tabla que solo el dueño de la base
-- podía tocar: ni siquiera el script de alta funcionaba.
--
-- `anon` y `authenticated` siguen sin nada, que era el objetivo. `service_role`
-- ya puede leer todo lo demás del sistema, así que devolverle esta tabla no
-- amplía lo que una clave privilegiada filtrada podría hacer.
grant select, insert, update, delete on table public.plataforma_admins to service_role;
grant select, insert on table public.bitacora_plataforma to service_role;
