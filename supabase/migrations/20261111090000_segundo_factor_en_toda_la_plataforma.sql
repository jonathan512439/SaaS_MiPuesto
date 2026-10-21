-- El segundo factor de la plataforma, exigido por la base y no solo por la
-- pantalla.
--
-- Encontrado en la auditoría de seguridad del 2026-10-21. `/plataforma` pide el
-- segundo factor antes de mostrar nada, pero la base no: las funciones
-- `admin_*` —publicar o suspender un negocio, cambiarle el plan, renovarle la
-- suscripción, invitar— pasaban por `private.exigir_admin_plataforma()`, que
-- solo miraba si el usuario estaba en `plataforma_admins`, y las políticas de
-- lectura y escritura de la plataforma lo mismo. Con la contraseña sola
-- —filtrada, adivinada, reusada en otro sitio— se podía llamar a todo eso
-- directo contra la API, sin pasar por la pantalla que pide el código.
--
-- `es_admin_plataforma()` no cambia: dice si alguien está en la lista, y la
-- usan la pantalla —para saber si pedir el código o mostrar «no existe»— y el
-- enlace del panel. Lo que cambia es **lo que autoriza**: desde acá, todo pide
-- además `aal2`, como ya lo pedían los tutoriales.

create or replace function public.es_admin_plataforma_con_2fa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.es_admin_plataforma()
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

comment on function public.es_admin_plataforma_con_2fa() is
  'Administra la plataforma y la sesión completó el segundo factor. Es la que autoriza; es_admin_plataforma() solo dice si está en la lista.';

revoke all on function public.es_admin_plataforma_con_2fa() from public, anon;
grant execute on function public.es_admin_plataforma_con_2fa() to authenticated, service_role;

-- Las ocho funciones admin_*, uso_ia() y uso_almacenamiento() pasan por acá.
create or replace function private.exigir_admin_plataforma()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not public.es_admin_plataforma_con_2fa() then
    raise exception using errcode = '42501', message = 'NO_AUTORIZADO';
  end if;
  return v_actor;
end;
$$;

-- Las políticas, recreadas iguales salvo por la condición. Quedan como estaban
-- dos lecturas que no muestran nada sensible: los tutoriales en borrador y las
-- zonas inactivas.
alter policy bitacora_la_lee_la_plataforma on public.bitacora_plataforma
  using ((select public.es_admin_plataforma_con_2fa()));

alter policy plataforma_descarta_busquedas_sin_resultado on public.busquedas_sin_resultado
  using ((select public.es_admin_plataforma_con_2fa()));

alter policy plataforma_lee_busquedas_sin_resultado on public.busquedas_sin_resultado
  using ((select public.es_admin_plataforma_con_2fa()));

alter policy plataforma_administra_etiquetas on public.etiquetas
  using ((select public.es_admin_plataforma_con_2fa()))
  with check ((select public.es_admin_plataforma_con_2fa()));

alter policy plataforma_lee_negocios on public.negocios
  using ((select public.es_admin_plataforma_con_2fa()));

alter policy plataforma_administra_sinonimos on public.sinonimos_busqueda
  using ((select public.es_admin_plataforma_con_2fa()))
  with check ((select public.es_admin_plataforma_con_2fa()));

alter policy vigilancia_salud_lectura_admin on public.vigilancia_salud
  using ((select public.es_admin_plataforma_con_2fa()));

alter policy plataforma_administra_zonas on public.zonas
  using ((select public.es_admin_plataforma_con_2fa()))
  with check ((select public.es_admin_plataforma_con_2fa()));

-- ---------------------------------------------------------------------------
-- Dos ajustes chicos de la misma auditoría.

-- 1. La versión de crear_pedido_reservado con número de mesa nació sin quitarle
--    el permiso a la clave pública: el revoke de la fase 6 era para la firma de
--    seis argumentos. No se podía abusar —quien llama no tiene permiso de
--    escribir en ninguna tabla y la función corre con sus permisos—, pero no
--    tiene por qué estar abierta. La llama solo el servidor.
revoke all on function public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text)
  to service_role;

-- 2. contar_intento_publico era la única función con privilegios cuyo
--    search_path no estaba vacío. Su cuerpo ya usa nombres completos.
alter function public.contar_intento_publico(uuid, text) set search_path = '';

-- 3. Los enlaces que el dueño escribe y el catálogo publica tal cual. La ruta ya
--    exige https, pero el dueño puede escribir estas columnas con su sesión sin
--    pasar por ella; la base es la que no se puede saltar. Todos los guardados
--    hoy cumplen (comprobado antes de escribir esto).
alter table public.negocios
  add constraint negocios_resenas_url_https
    check (resenas_url is null or resenas_url ~ '^https://[^[:space:]]+$'),
  add constraint negocios_ubicacion_url_https
    check (ubicacion_url is null or ubicacion_url ~ '^https://[^[:space:]]+$');
