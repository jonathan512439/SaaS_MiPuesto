-- Fase 7 · Identidad y apariencia.
--
-- Todo lo que el dueño controla de cómo se ve su catálogo y que hoy vive
-- prestado de otra columna: el renglón bajo el nombre, cuánto se nota el patrón
-- del fondo, y la ficha de Google.
--
-- Las columnas de Maps entran ahora aunque la calificación todavía no se pida a
-- nadie: son la mitad del trabajo de esa función y meterlas después obligaría a
-- una segunda migración sobre la misma tabla. El botón «Cómo llegar» ya existe
-- en su forma sin clave —enlaza al mapa y nada más—, así que estas columnas
-- quedan vacías hasta que se configure `GOOGLE_PLACES_API_KEY`.

alter table public.negocios
  -- El renglón bajo el nombre, en la cabecera. Hoy esa línea la ocupa
  -- `descripcion`, que es otra cosa: la descripción es el párrafo del negocio y
  -- el subnombre es el rótulo corto —«Pollos a la brasa», «Desde 1998»—.
  add column subnombre text,

  -- De 0 a 30 por ciento. Encima de 30 el patrón compite con el texto y el
  -- catálogo se vuelve ilegible; el techo es de la base y no solo del panel,
  -- para que no dependa de qué pantalla lo escribió.
  add column patron_opacidad smallint not null default 6
    check (patron_opacidad between 0 and 30),

  add column maps_place_id text,
  add column maps_nombre text,
  add column maps_direccion text,
  add column maps_calificacion numeric(2, 1)
    check (maps_calificacion is null or maps_calificacion between 0 and 5),
  add column maps_opiniones integer
    check (maps_opiniones is null or maps_opiniones >= 0),
  -- Cuándo se le preguntó a Google por última vez. Es lo que sostiene el tope de
  -- una consulta por negocio por semana: sin esta marca, cada visita al catálogo
  -- sería una consulta paga.
  add column maps_consultado_en timestamptz,
  add column maps_visible boolean not null default false,
  -- Para el negocio que no está en Maps. Sirve para decir la zona; no da
  -- calificación, porque no hay ficha detrás de la cual sacarla.
  add column direccion_manual text,

  -- No se puede mostrar una calificación de un lugar que no se resolvió. Sin
  -- esta restricción, alguien podría activar la estrella de un negocio sin
  -- ficha y el catálogo mostraría un número que no vino de ninguna parte.
  add constraint negocios_maps_visible_necesita_lugar
    check (maps_visible = false or maps_place_id is not null);

comment on column public.negocios.subnombre is
  'El renglón corto bajo el nombre, en la cabecera. Distinto de descripcion, que es el párrafo.';
comment on column public.negocios.patron_opacidad is
  'Cuánto se nota el patrón del fondo, de 0 a 30 por ciento. Encima de 30 compite con el texto.';
comment on column public.negocios.maps_consultado_en is
  'Última consulta a Google Places. Sostiene el tope de una consulta por negocio por semana.';
comment on column public.negocios.maps_visible is
  'Si se muestra la calificación. No se puede activar sin maps_place_id.';
