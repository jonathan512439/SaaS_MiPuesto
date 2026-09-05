-- Papelera de productos: borrar deja de ser definitivo.
--
-- Hasta acá, borrar un producto borraba la fila y, antes, sus fotografías del
-- almacenamiento. Un toque equivocado a las once de la noche no tenía vuelta:
-- la única copia estaba en el respaldo diario, y sacar una fila de un volcado
-- comprimido es cirugía a mano sobre la base viva, con la clave de servicio.
-- Eso no es una función, es un favor que no escala.
--
-- Ahora el borrado marca una fecha. El producto desaparece del catálogo y del
-- panel, y el dueño lo recupera solo, sin escribirnos.
--
-- Treinta días y no noventa: un arrepentimiento ocurre en horas o en días, y a
-- los tres meses nadie recuerda qué borró. Los noventa siguen siendo el plazo
-- de guarda de un negocio dado de baja, que es otro problema.

alter table public.productos
  add column if not exists eliminado_en timestamptz;

comment on column public.productos.eliminado_en is
  'Fecha en que el dueño lo mandó a la papelera. Nulo = producto vivo. Se purga a los 30 días.';

-- Parcial: la papelera es la excepción, no el caso común. Un índice sobre toda
-- la tabla haría trabajar a cada consulta del catálogo para servir a una
-- pantalla que se abre una vez al mes.
create index if not exists idx_productos_papelera
  on public.productos (negocio_id, eliminado_en)
  where eliminado_en is not null;

-- El filtro vive en la política y no solo en las consultas: si mañana alguien
-- escribe una pantalla nueva y se olvida del `is null`, un producto borrado no
-- reaparece en el catálogo de nadie.
drop policy if exists "productos_publicos_visibles" on public.productos;

create policy "productos_publicos_visibles"
on public.productos for select to anon
using (
  visible = true
  and eliminado_en is null
  and exists (
    select 1 from public.negocios
    where negocios.id = productos.negocio_id and negocios.activo = true
  )
);

-- El código sigue ocupado mientras el producto esté en la papelera, a
-- propósito: si se liberara, recuperarlo chocaría contra el que tomó su lugar y
-- la recuperación fallaría justo cuando más se la necesita.
