-- La bitácora la escriben solo funciones, nunca la aplicación: así ninguna fila
-- puede aparecer sin pasar por un control de quién la escribe. Faltaba la de
-- invitaciones, que es la única acción del panel que no toca un negocio.
create or replace function public.admin_registrar_invitacion(p_correo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.exigir_admin_plataforma();
begin
  insert into public.bitacora_plataforma (actor, accion, detalle)
  values (v_actor, 'invitar', jsonb_build_object('correo', p_correo));
end;
$$;

revoke all on function public.admin_registrar_invitacion(text) from public, anon;
grant execute on function public.admin_registrar_invitacion(text) to authenticated;

comment on function public.admin_registrar_invitacion(text) is
  'Anota en la bitácora una invitación enviada. Solo para administradores de la plataforma.';
