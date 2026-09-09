-- La apariencia se parte en dos ejes: la plantilla y la tarjeta.
--
-- Hasta acá la plantilla decidía todo —cómo se recorre el catálogo y cómo se
-- presenta cada producto—, y eso alcanzaba para siete rubros. Las 44 fichas de
-- `Catalogos_Ejemplo/` piden unas seis formas de recorrer y unas seis de
-- presentar, combinadas distinto. Separarlas da dieciocho catálogos donde había
-- cuatro, sin dibujar dieciocho plantillas.
--
-- **Ningún negocio existente cambia de aspecto.** A cada uno se le asigna la
-- tarjeta que reproduce lo que su plantilla ya dibujaba. Ese es el criterio de
-- la fase y está escrito como prueba en `lib/apariencia.test.ts`.

-- El valor por defecto es el de la plantilla más común, pero no decide nada: el
-- `update` de abajo le da a cada negocio el que le corresponde, y los que se den
-- de alta después lo reciben del panel.
alter table public.negocios
  add column tarjeta_id text not null default 'cuadricula';

alter table public.negocios
  add constraint negocios_tarjeta_id_check check (
    tarjeta_id in ('lista', 'cuadricula', 'retrato', 'ficha', 'servicio', 'estadia')
  );

-- La equivalencia que conserva el aspecto de cada negocio.
--
-- No hay `else` con un valor cualquiera: se enumeran las cuatro plantillas, una
-- por una. Un `else` que adivina es cómo un negocio termina viéndose distinto
-- sin que nadie lo haya pedido, y además callaría el día que se agregue una
-- plantilla nueva: con el `case` completo, la fila queda en nulo y la
-- restricción `not null` lo detiene ahí mismo.
update public.negocios set tarjeta_id = case plantilla_id
  when 'clasica' then 'lista'
  when 'moderna' then 'cuadricula'
  when 'minimal' then 'servicio'
  when 'feria'   then 'lista'
end;

comment on column public.negocios.tarjeta_id is
  'Cómo se presenta cada producto dentro de la plantilla. No toda plantilla admite toda tarjeta: la lista válida vive en lib/apariencia.ts y el servidor corrige a la predeterminada lo que no corresponda.';

-- El dueño puede cambiar la forma de su catálogo, igual que ya podía cambiar la
-- plantilla y la paleta. No se otorga nada más: el permiso va por columna, que
-- es como está construido el resto de esta tabla.
grant update (tarjeta_id) on table public.negocios to authenticated;
grant select (tarjeta_id) on table public.negocios to anon;
