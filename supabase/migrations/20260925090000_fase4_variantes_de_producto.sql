-- Las variantes de un producto.
--
-- Una remera en S, M y L. Una bolsa de alimento de 3 kg y de 7,5 kg. La
-- diferencia entre las dos es el precio: las tallas cuestan lo mismo, las bolsas
-- no. Por eso `precio` admite nulo y eso significa «el del producto».
--
-- Reemplaza al `variants: ['10:00','11:30']` del diseño de referencia, que
-- mezclaba presentaciones con horarios de agenda en el mismo campo. Acá las
-- presentaciones son esto y los horarios van a ser la agenda de la fase 5, que
-- es otra tabla y otro mecanismo.

-- El único compuesto en `productos`, que es lo que la clave foránea compuesta de
-- abajo necesita. **No existía**: se dio por sentado que lo había creado la fase
-- de pedidos y no era así, y el `create table` falló al aplicarse.
--
-- Es redundante con la clave primaria a propósito, igual que en `categorias`:
-- sin él, una tabla hija no puede exigirle al motor que el padre sea del mismo
-- negocio, y el aislamiento pasaría a depender de la aplicación.
alter table public.productos
  add constraint productos_id_negocio unique (id, negocio_id);

create table public.variantes_producto (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  producto_id uuid not null,

  nombre text not null,

  -- Nulo significa «el mismo precio que el producto», que es el caso común: una
  -- remera en tres tallas cuesta lo mismo. Guardar el precio repetido en las
  -- tres obligaría a corregirlo tres veces al cambiarlo.
  precio numeric(10, 2) check (precio is null or precio >= 0),

  -- Nulo significa «el producto no controla existencias, y esta tampoco». No se
  -- duplica la bandera `controla_stock`: ya vive en el producto, y tenerla en
  -- dos lugares permite que se contradigan.
  cantidad_stock integer check (cantidad_stock is null or cantidad_stock >= 0),

  visible boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),

  constraint variantes_padre
    foreign key (producto_id, negocio_id)
    references public.productos(id, negocio_id) on delete cascade,

  constraint variantes_nombre_unico unique (producto_id, nombre),
  constraint variantes_nombre_largo check (char_length(nombre) between 1 and 40)
);

create index idx_variantes_producto on public.variantes_producto(producto_id, orden);
create index idx_variantes_negocio on public.variantes_producto(negocio_id);

comment on table public.variantes_producto is
  'Presentaciones de un producto: talla, color, tamaño. Con precio y existencias propias.';
comment on column public.variantes_producto.precio is
  'Nulo: el mismo precio que el producto.';
comment on column public.variantes_producto.cantidad_stock is
  'Nulo: el producto no controla existencias. Todavía no participa de la reserva del carrito.';

alter table public.variantes_producto enable row level security;

create policy "variantes_publicas_activas"
on public.variantes_producto for select to anon
using (
  exists (
    select 1 from public.negocios
    where negocios.id = variantes_producto.negocio_id and negocios.activo = true
  )
);

create policy "administra_variantes_propias"
on public.variantes_producto for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = variantes_producto.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = variantes_producto.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

grant select on table public.variantes_producto to anon;
grant select, insert, update, delete on table public.variantes_producto to authenticated;
grant select, insert, update, delete on table public.variantes_producto to service_role;

-- Hasta doce por producto, y va en disparador por lo mismo que el tope de
-- campos: es una cuenta de filas y no cabe en una restricción de columna.
--
-- Doce porque es lo que entra en un selector sin volverse una lista para
-- desplazar: una remera tiene seis tallas y una bolsa cuatro tamaños. Un negocio
-- que necesite más está describiendo productos distintos, no presentaciones.
create or replace function public.limitar_variantes_por_producto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcion$
declare
  cantidad integer;
begin
  select count(*) into cantidad
  from public.variantes_producto
  where producto_id = new.producto_id;

  if cantidad > 12 then
    raise exception 'Un producto admite hasta 12 presentaciones.'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$funcion$;

-- Por fila y `after`, con la misma dependencia de orden que los campos: el
-- editor reemplaza el conjunto entero y **borra antes de insertar**, así que la
-- cuenta nunca pasa por un estado mayor al final.
create trigger variantes_dentro_del_tope
  after insert or update on public.variantes_producto
  for each row
  execute function public.limitar_variantes_por_producto();
