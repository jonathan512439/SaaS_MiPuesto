-- Cómo llegar al negocio.
--
-- Se guarda el enlace que el dueño pega —de Google Maps o del mapa que use— y
-- no coordenadas: geocodificar exige una API paga y una dirección escrita a
-- mano rara vez lleva a la puerta correcta en un barrio boliviano. El enlace
-- que el propio dueño verificó es el dato más confiable que hay disponible.
--
-- La columna se agrega sola, sin rubro ni identificador de Google: esos dos
-- sirven a funciones que todavía no existen, y una columna anulable se agrega
-- en cualquier momento sin reescribir la tabla.

alter table public.negocios
  add column ubicacion_url text;

comment on column public.negocios.ubicacion_url is
  'Enlace al mapa que el dueño eligió para el botón «Cómo llegar». Vacío significa que no lo publicó.';

-- El catálogo público necesita leerla: el `grant select` de `anon` es por lista
-- de columnas y sin esto quedaría fuera.
grant select (ubicacion_url) on table public.negocios to anon;

-- Y el dueño necesita poder escribirla, igual que sus redes sociales.
grant update (ubicacion_url) on table public.negocios to authenticated;
