-- Un tope de espacio para las fotos de cada negocio.
--
-- Hasta ahora el techo era indirecto —2 MB por foto, 4 por producto, 300
-- productos—, que suma hasta 2,4 GB por negocio contra 1 GB de Storage en el
-- plan gratuito para todos juntos. Nadie lo alcanza usando el sistema como se
-- pensó: la foto media pesa 92 KB (comprimida en el teléfono), y Brasa Urbana,
-- el negocio con más fotos al 2026-09-24, ocupa 4,8 MB. Pero un solo negocio
-- que suba fotos sin comprimir podía llenar el espacio de todos.
--
-- **150 MB por negocio**: un catálogo lleno con cuatro fotos por producto ronda
-- los 110 MB, así que ningún uso legítimo lo toca. El mismo número vive en
-- `lib/catalogo/almacenamiento.ts` para avisar antes, y una prueba compara los
-- dos.
--
-- Va en la base y no solo en la ruta, como todo tope de este proyecto: una
-- regla **restrictiva** de Storage se suma a las que ya dicen de quién es la
-- carpeta, y bloquea la subida aunque alguien se saltee las rutas. Mide lo que
-- ya hay: la foto que llega cuando falta poco entra, y la siguiente no.

create or replace function public.tope_almacenamiento_negocio()
returns bigint
language sql
immutable
set search_path = ''
as $$ select (150 * 1024 * 1024)::bigint $$;

revoke all on function public.tope_almacenamiento_negocio() from public;
grant execute on function public.tope_almacenamiento_negocio() to authenticated, service_role;

-- Lo que ocupa un negocio en sus dos depósitos. Se identifica por la primera
-- carpeta de la ruta, que es el id del negocio —así escriben las rutas y así
-- lo comprueban las políticas—. Se recibe como texto porque la carpeta es
-- texto: convertirla a uuid haría fallar la consulta con una ruta rara, en vez
-- de simplemente no contarla.
--
-- Solo el dueño de ese negocio, o la clave de servicio: para cualquier otro
-- devuelve nulo, y cuánto ocupa un negocio ajeno no es asunto suyo.
create or replace function public.uso_almacenamiento_negocio(p_carpeta text)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' and not exists (
    select 1 from public.negocios
    where id::text = p_carpeta and admin_user_id = (select auth.uid())
  ) then
    return null;
  end if;

  return coalesce((
    select sum((objeto.metadata->>'size')::bigint)
    from storage.objects as objeto
    where objeto.bucket_id in ('productos', 'negocios')
      and (storage.foldername(objeto.name))[1] = p_carpeta
  ), 0);
end;
$$;

comment on function public.uso_almacenamiento_negocio(text) is
  'Bytes que ocupan las fotos de un negocio en sus dos depósitos. Solo para su dueño o la clave de servicio.';

revoke all on function public.uso_almacenamiento_negocio(text) from public, anon;
grant execute on function public.uso_almacenamiento_negocio(text) to authenticated, service_role;

-- La regla. Restrictiva: se cumple **además** de las que ya existen. Para los
-- demás depósitos no dice nada.
drop policy if exists tope_de_almacenamiento_por_negocio on storage.objects;
create policy tope_de_almacenamiento_por_negocio
  on storage.objects
  as restrictive
  for insert
  to authenticated
  with check (
    bucket_id not in ('productos', 'negocios')
    or coalesce(
      public.uso_almacenamiento_negocio((storage.foldername(name))[1]),
      0
    ) < public.tope_almacenamiento_negocio()
  );
