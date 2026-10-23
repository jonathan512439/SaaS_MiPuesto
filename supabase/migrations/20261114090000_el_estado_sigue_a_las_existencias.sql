-- El estado de un producto sigue a sus existencias, lo cambie quien lo cambie.
--
-- Encontrado el 2026-10-22 al grabar el video de la portada: en Huellitas,
-- «Alimento cachorro 3 kg» tenía 20 unidades disponibles y el estado
-- `vendido`. El catálogo mostraba «Quedan 20 unidades» y el botón de agregar
-- apagado, sin decir por qué: un cliente no podía comprarlo.
--
-- `vendido` lo pone `liberar_reservas_del_pedido` cuando una venta deja las
-- existencias en cero. Después las existencias volvieron a subir por un camino
-- que no recalcula el estado —la ruta del panel sí lo hace, pero no es el único
-- que escribe la tabla— y el producto quedó vendido para siempre.
--
-- Igual que con las presentaciones (`ajustar_producto_con_presentaciones`), el
-- estado de un producto que lleva sus propias existencias lo decide la base
-- antes de guardar, con la misma regla que ya aplicaban las funciones de
-- pedidos y la ruta del panel (`estadoPorStock`):
--
--   * en cero: `agotado`, salvo que ya diga `vendido` (lo vendió una venta);
--   * con todo lo que queda apartado en pedidos pendientes: `reservado`;
--   * si no: `disponible`.
--
-- Los productos que no controlan existencias no se tocan: ahí «Agotado» es una
-- marca que pone el dueño a mano. Y los que tienen presentaciones tampoco: su
-- estado lo calcula `estado_por_presentaciones`.

create or replace function public.estado_por_existencias()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.controla_stock is not true
     or coalesce(new.con_presentaciones, false)
     or new.cantidad_stock is null then
    return new;
  end if;

  if new.cantidad_stock = 0 then
    if new.estado not in ('agotado', 'vendido') then
      new.estado := 'agotado';
    end if;
  elsif new.cantidad_stock - coalesce(new.cantidad_reservada, 0) <= 0 then
    new.estado := 'reservado';
  else
    new.estado := 'disponible';
  end if;

  return new;
end;
$$;

comment on function public.estado_por_existencias() is
  'Antes de guardar un producto que lleva sus propias existencias, deja su estado de acuerdo con ellas: agotado o vendido en cero, reservado si todo está apartado, disponible si no.';

-- El nombre va después de `productos_ajustados_a_sus_presentaciones` en orden
-- alfabético, que es el orden en que Postgres corre los disparadores del mismo
-- momento: cuando corre este, `con_presentaciones` ya está calculado.
drop trigger if exists productos_estado_por_existencias on public.productos;
create trigger productos_estado_por_existencias
  before insert or update of cantidad_stock, cantidad_reservada, controla_stock, estado
  on public.productos
  for each row
  execute function public.estado_por_existencias();

-- Los que ya quedaron mal. Solo se tocan las filas cuyo estado no coincide con
-- sus existencias: el disparador de arriba calcula el correcto.
update public.productos
set estado = estado
where controla_stock = true
  and not coalesce(con_presentaciones, false)
  and cantidad_stock is not null
  and estado <> case
    when cantidad_stock = 0 and estado in ('agotado', 'vendido') then estado
    when cantidad_stock = 0 then 'agotado'
    when cantidad_stock - coalesce(cantidad_reservada, 0) <= 0 then 'reservado'
    else 'disponible'
  end;
