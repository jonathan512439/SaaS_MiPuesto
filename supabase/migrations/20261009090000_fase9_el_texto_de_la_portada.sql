-- El banner de arriba se va; lo que se escribía sobre él va sobre la portada.
--
-- Había tres franjas anchas seguidas al abrir un catálogo: la portada, el banner
-- de arriba y —más abajo— la publicidad. Las dos primeras iban casi pegadas y el
-- dueño pidió sacar la del medio y poder escribir sobre la portada lo mismo que
-- se podía escribir sobre el banner: antetítulo, título, bajada y un botón que
-- lleve a alguna parte. La portada ya está, ya se ve primero, y ya sirve de
-- cartel.
--
-- **Una columna propia y no el primer lugar del arreglo.** El texto de la
-- portada no tiene imagen propia —la imagen es `portada_url`— ni texto
-- alternativo que exigir, así que meterlo en `banners[0]` obligaría a que ese
-- lugar tuviera una forma distinta de la del otro. Un objeto `jsonb`, como
-- `redes_sociales`: cinco campos cortos que se leen siempre con el negocio.
--
-- La forma —`{eyebrow, titulo, copy, boton, enlace}`— se valida en
-- `lib/negocios/texto-sobre-imagen.ts`; acá solo se exige que sea un objeto.
alter table public.negocios
  add column portada_texto jsonb not null default '{}'::jsonb;

alter table public.negocios
  add constraint negocios_portada_texto_es_objeto check (
    jsonb_typeof(portada_texto) = 'object'
  );

comment on column public.negocios.portada_texto is
  'Lo que se escribe encima de la portada: {eyebrow, titulo, copy, boton, enlace}, todos opcionales. Vacío es una portada sin texto y sin cortina. La forma se valida en lib/negocios/texto-sobre-imagen.ts.';

-- Los permisos, columna por columna, como el resto de esta tabla: el dueño lo
-- escribe y lo lee, el catálogo público lo lee. Los dos `select` a propósito:
-- la fase 9 ya se llevó «Productos» entero por conceder la escritura y olvidar
-- la lectura.
grant select (portada_texto), update (portada_texto) on table public.negocios to authenticated;
grant select (portada_texto) on table public.negocios to anon;

-- Los banners quedan en un solo lugar: el de la mitad, que pasa a ser el primero.
--
-- Ningún negocio tenía cargado el de arriba cuando se escribió esto (se
-- comprobó en la base antes de correr la migración), así que no hay texto que
-- rescatar: el que había en el segundo lugar pasa al primero y el arreglo queda
-- de largo uno. El techo de la columna baja con él, para que nadie pueda volver
-- a guardar dos con la clave privilegiada.
update public.negocios
  set banners = case
    when jsonb_array_length(banners) >= 2 then jsonb_build_array(banners -> 1)
    else '[]'::jsonb
  end
  where jsonb_array_length(banners) >= 1;

alter table public.negocios
  drop constraint negocios_banners_es_lista_corta;

alter table public.negocios
  add constraint negocios_banners_es_lista_corta check (
    jsonb_typeof(banners) = 'array' and jsonb_array_length(banners) <= 1
  );

comment on column public.negocios.banners is
  'El banner de publicidad del catálogo, entre dos categorías; un solo lugar. {imagen, alt, eyebrow, titulo, copy, boton, enlace}. La forma se valida en lib/negocios/banners.ts; acá solo se acota el largo.';
