-- La tercera forma de tarjeta pasa a ser la vitrina, con foto.
--
-- La «lista de precios» sin fotos salió el 22 de septiembre de 2026 y el dueño
-- del proyecto pidió cambiarla ese mismo día por una forma que llevara la foto,
-- presentada de otra manera: la vitrina, con la foto ocupando la tarjeta y el
-- nombre y el precio encima.
--
-- Ningún negocio la tenía elegida (se comprobó antes de correr esto), pero se
-- pasa a la cuadrícula igual por si alguno la eligió en el rato en que estuvo
-- publicada: la restricción nueva rechazaría la fila.
update public.negocios
  set forma_tarjeta = 'cuadricula'
  where forma_tarjeta = 'lista_precios';

alter table public.negocios
  drop constraint negocios_forma_tarjeta_check;

alter table public.negocios
  add constraint negocios_forma_tarjeta_check
    check (forma_tarjeta in ('cuadricula', 'fila', 'vitrina'));

comment on column public.negocios.forma_tarjeta is
  'Cómo se dibujan los productos en el catálogo: cuadricula, fila o vitrina. Solo cambia el aspecto; lo que se puede hacer lo decide la modalidad.';
