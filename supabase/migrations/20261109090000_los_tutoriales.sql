-- Los videos de «Aprende»: cómo se usa el Panel de administrador.
--
-- Son de la plataforma y no de un negocio, como los sinónimos del buscador y
-- las zonas: **no llevan `negocio_id`**, y es una excepción a propósito. Los
-- sube la plataforma y los ven todos los dueños.
--
-- El archivo vive en R2 (balde `mipuesto-tutoriales`) y acá solo su nombre:
-- `NN-<32 hex>.mp4`, con el número del video adelante para reconocerlo en el
-- balde y un trozo al azar para que reemplazar un video sea un archivo nuevo y
-- el viejo pueda guardarse en caché para siempre. La forma la exige la base:
-- el nombre termina en una dirección, y la ruta que entrega el archivo tampoco
-- acepta otra.
--
-- Quién hace qué lo decide la base:
--   - Un dueño con sesión lee los publicados. Un visitante anónimo, nada.
--   - Escribir es de la plataforma **y con segundo factor** (`aal2`). La página
--     de Plataforma ya lo exige, pero una ruta se puede llamar sin la página.

create table public.tutoriales (
  id uuid primary key default gen_random_uuid(),
  numero smallint not null unique check (numero between 1 and 99),
  titulo text not null check (char_length(titulo) between 3 and 80 and titulo = btrim(titulo)),
  descripcion text not null default '' check (char_length(descripcion) <= 280),
  video text check (video ~ '^[0-9]{2}-[0-9a-f]{32}\.mp4$'),
  portada text check (portada ~ '^[0-9]{2}-[0-9a-f]{32}\.jpg$'),
  duracion_segundos smallint check (duracion_segundos between 1 and 1800),
  publicado boolean not null default false,
  creado_en timestamptz not null default now(),
  -- Publicado sin video sería una tarjeta que no reproduce nada.
  constraint tutoriales_publicado_con_video check (not publicado or video is not null)
);

comment on table public.tutoriales is
  'Los videos de «Aprende», de la plataforma. Sin negocio_id a propósito: los ven todos los dueños. El archivo está en R2.';

alter table public.tutoriales enable row level security;

revoke all on table public.tutoriales from anon, authenticated;
grant select, insert, update, delete on table public.tutoriales to authenticated;

create policy "duenos_leen_tutoriales_publicados"
  on public.tutoriales for select to authenticated
  using (publicado or public.es_admin_plataforma());

create policy "plataforma_crea_tutoriales"
  on public.tutoriales for insert to authenticated
  with check (public.es_admin_plataforma() and (select auth.jwt() ->> 'aal') = 'aal2');

create policy "plataforma_cambia_tutoriales"
  on public.tutoriales for update to authenticated
  using (public.es_admin_plataforma() and (select auth.jwt() ->> 'aal') = 'aal2')
  with check (public.es_admin_plataforma() and (select auth.jwt() ->> 'aal') = 'aal2');

create policy "plataforma_borra_tutoriales"
  on public.tutoriales for delete to authenticated
  using (public.es_admin_plataforma() and (select auth.jwt() ->> 'aal') = 'aal2');
