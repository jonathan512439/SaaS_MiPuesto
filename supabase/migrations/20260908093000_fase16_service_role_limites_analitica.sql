-- El conteo por IP quedó sin permisos para `service_role`.
--
-- La función definer escribe igual, porque corre como su dueña, así que el
-- límite funcionaba. Lo que no se podía era mirarlo: ni para verificar que
-- cuenta bien, ni para diagnosticar una queja de «no me registra las visitas».
--
-- Es el mismo descuido que hubo con `plataforma_admins`: crear una tabla y
-- revocar sin devolverle a `service_role` lo que necesita. La tabla hermana,
-- `limites_pedidos_ip`, siempre lo tuvo.

grant select, insert, update, delete
  on table public.limites_analitica_ip to service_role;
