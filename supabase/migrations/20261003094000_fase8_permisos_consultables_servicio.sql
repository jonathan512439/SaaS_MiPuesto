-- La guarda de permisos corre con la clave de servicio, y el `revoke all ... from
-- public` de la migración anterior le sacó también a `service_role` el permiso
-- heredado de PUBLIC. Se le concede explícito: es el único rol que la usa.
grant execute on function public.permisos_de_columnas_negocios() to service_role;
