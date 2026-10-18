-- La clave de servicio también entra a `tutoriales`.
--
-- `20261109090000_los_tutoriales.sql` dio permisos a `authenticated` y se
-- olvidó de `service_role`, que en este proyecto no los recibe solo: cada tabla
-- de la plataforma se los da a mano (`sinonimos_busqueda`,
-- `busquedas_sin_resultado`). Lo encontró `npm run test:rls:linked`, que
-- siembra tutoriales de prueba con esa clave: «permission denied for table
-- tutoriales». La aplicación no la usa para los tutoriales —todo va con la
-- sesión de quien está—, pero los scripts de la plataforma y las pruebas sí.

grant all on table public.tutoriales to service_role;
