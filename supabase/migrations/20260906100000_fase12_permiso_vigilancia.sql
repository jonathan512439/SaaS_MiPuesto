-- La vigilancia se revocó de todos, incluida la clave de servicio, que es
-- justamente quien tiene que leerla: el endpoint de salud y el script de
-- operación corren con ella. Sin este permiso la función existe pero nadie
-- puede llamarla.
--
-- Se concede solo a `service_role`: `anon` y `authenticated` siguen sin poder,
-- que es lo que se buscaba al revocar.
grant execute on function public.estado_tareas() to service_role;
