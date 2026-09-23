-- Fase 13, paso 1: el modelo de la talla.
--
-- Todo lo de esta migración es aditivo: ningún pedido de hoy cambia de forma de
-- funcionar. Lo que cambia el comportamiento —la fuente única de existencias, el
-- motor de compra que reserva por presentación y el editor que conserva los
-- identificadores— va junto en el paso 2, porque ninguna de las tres cosas se
-- puede desplegar sin las otras dos.
--
-- Ver docs/plan/10-TALLAS-Y-PRESENTACIONES.md.

-- ---------------------------------------------------------------------------
-- 1. El tipo de presentación del producto.
--
-- Una remera, una zapatilla y una bolsa de alimento no se eligen igual. El tipo
-- decide cómo se pregunta («Elige tu número»), cómo se ordena y qué se acepta.
-- ---------------------------------------------------------------------------

alter table public.productos
  add column tipo_presentacion text not null default 'presentacion',
  add constraint productos_tipo_presentacion_valido
    check (tipo_presentacion in ('talla', 'numero', 'tamano', 'presentacion'));

comment on column public.productos.tipo_presentacion is
  'Qué son sus presentaciones: talla (S, M, L), numero (calzado: 38, 40,5), tamano (3 kg) o presentacion (lo demás).';

-- El único producto con presentaciones que hay hoy es un vaso de agua «Grande».
update public.productos
set tipo_presentacion = 'tamano'
where id in (select distinct producto_id from public.variantes_producto);

-- ---------------------------------------------------------------------------
-- 2. El número de calzado, escrito siempre igual.
--
-- `38.5`, `38½` y `38,5` son el mismo número, y `40` y `40,0` también. Se
-- guardan de una sola forma —`38,5`, `40`— para que la restricción de nombre
-- único de cada producto los reconozca como repetidos. El calzado en Bolivia se
-- numera en europeo, de 16 a 50; las tallas americanas van como
-- `presentacion`, con el texto que ponga el dueño.
--
-- La misma regla vive en `lib/catalogo/variantes.ts` (`normalizarNumeroCalzado`),
-- y una prueba compara las dos.
-- ---------------------------------------------------------------------------

create or replace function public.normalizar_numero_calzado(p_texto text)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_limpio text;
  v_coincidencia text[];
  v_entero integer;
begin
  if p_texto is null then
    return null;
  end if;

  v_limpio := replace(replace(replace(trim(p_texto), '½', ',5'), '.', ','), ' ', '');
  v_coincidencia := regexp_match(v_limpio, '^([0-9]{2})(,([05]))?$');
  if v_coincidencia is null then
    return null;
  end if;

  v_entero := v_coincidencia[1]::integer;
  if v_entero < 16 or v_entero > 50 then
    return null;
  end if;
  -- El medio número más alto es 50: `50,5` ya está fuera.
  if v_entero = 50 and v_coincidencia[3] = '5' then
    return null;
  end if;

  if v_coincidencia[3] = '5' then
    return v_entero::text || ',5';
  end if;
  return v_entero::text;
end;
$$;

-- La talla de ropa, en mayúsculas cuando es una de las de siempre. Lo demás
-- —«2 años», «Talla única»— queda como lo escribió el dueño.
create or replace function public.normalizar_talla(p_texto text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when p_texto is null then null
    when upper(trim(p_texto)) in ('XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL') then upper(trim(p_texto))
    when lower(trim(p_texto)) in ('unica', 'única') then 'Única'
    else trim(p_texto)
  end
$$;

revoke all on function public.normalizar_numero_calzado(text) from public;
revoke all on function public.normalizar_talla(text) from public;
grant execute on function public.normalizar_numero_calzado(text) to anon, authenticated, service_role;
grant execute on function public.normalizar_talla(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Las presentaciones: reservas propias, tope de 24, nombre normalizado y
--    la pareja (id, producto_id) para que el pedido pueda exigir que la
--    presentación sea de ese producto.
-- ---------------------------------------------------------------------------

alter table public.variantes_producto
  add column cantidad_reservada integer not null default 0,
  add constraint variantes_reserva_consistente
    check (
      cantidad_reservada >= 0
      and (
        (cantidad_stock is null and cantidad_reservada = 0)
        or (cantidad_stock is not null and cantidad_reservada <= cantidad_stock)
      )
    ),
  add constraint variantes_id_producto unique (id, producto_id);

comment on column public.variantes_producto.cantidad_reservada is
  'Unidades apartadas por pedidos pendientes. La escribe solo el motor de compra.';
comment on column public.variantes_producto.cantidad_stock is
  'Existencias de esta presentación. Nulo: el producto no controla existencias.';

-- El dueño escribe sus presentaciones, pero no sus reservas: esas son del
-- motor de compra. Con el permiso sobre la tabla entera podía ponerlas en cero
-- desde la API y liberar lo que un comprador ya había apartado.
revoke insert, update on table public.variantes_producto from authenticated;
grant insert (id, negocio_id, producto_id, nombre, precio, cantidad_stock, visible, orden)
  on table public.variantes_producto to authenticated;
grant update (nombre, precio, cantidad_stock, visible, orden)
  on table public.variantes_producto to authenticated;

-- El tope sube de 12 a 24: de 35 a 45 con medios números son 21.
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
  if cantidad > 24 then
    raise exception 'Un producto admite hasta 24 presentaciones.'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$funcion$;

-- El nombre se escribe según el tipo del producto: un número de calzado que no
-- es un número se rechaza, y una talla de las de siempre va en mayúsculas.
create or replace function public.normalizar_nombre_de_presentacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcion$
declare
  v_tipo text;
  v_normalizado text;
begin
  select tipo_presentacion into v_tipo
  from public.productos
  where id = new.producto_id;

  if v_tipo = 'numero' then
    v_normalizado := public.normalizar_numero_calzado(new.nombre);
    if v_normalizado is null then
      raise exception using
        errcode = 'check_violation',
        message = 'NUMERO_INVALIDO',
        detail = format('«%s» no es un número de calzado entre 16 y 50.', new.nombre);
    end if;
    new.nombre := v_normalizado;
  elsif v_tipo = 'talla' then
    new.nombre := public.normalizar_talla(new.nombre);
  else
    new.nombre := trim(new.nombre);
  end if;

  return new;
end;
$funcion$;

create trigger variantes_nombre_normalizado
  before insert or update of nombre, producto_id on public.variantes_producto
  for each row
  execute function public.normalizar_nombre_de_presentacion();

-- Pasar un producto a «número» con presentaciones que no son números dejaría
-- una lista que ya no se puede ordenar ni validar. Se rechaza el cambio: el
-- editor guarda el tipo y las presentaciones juntos.
create or replace function public.validar_cambio_de_tipo_de_presentacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcion$
begin
  if new.tipo_presentacion = 'numero'
     and new.tipo_presentacion is distinct from old.tipo_presentacion
     and exists (
       select 1
       from public.variantes_producto
       where producto_id = new.id
         and public.normalizar_numero_calzado(nombre) is distinct from nombre
     ) then
    raise exception using
      errcode = 'check_violation',
      message = 'NUMERO_INVALIDO',
      detail = 'El producto tiene presentaciones que no son números de calzado.';
  end if;
  return new;
end;
$funcion$;

create trigger productos_tipo_de_presentacion_coherente
  before update of tipo_presentacion on public.productos
  for each row
  execute function public.validar_cambio_de_tipo_de_presentacion();

-- Una presentación con unidades apartadas no se borra: hay un comprador
-- esperando que se le confirme, y su pedido tiene que poder devolverlas o
-- descontarlas. Se oculta, que la saca del catálogo sin romper nada.
create or replace function public.proteger_presentacion_reservada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcion$
begin
  if old.cantidad_reservada > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'PRESENTACION_RESERVADA',
      detail = format('«%s» tiene %s unidad(es) apartadas en pedidos pendientes.', old.nombre, old.cantidad_reservada);
  end if;
  return old;
end;
$funcion$;

create trigger variantes_reservadas_no_se_borran
  before delete on public.variantes_producto
  for each row
  execute function public.proteger_presentacion_reservada();

-- ---------------------------------------------------------------------------
-- 4. El renglón del pedido guarda la presentación.
--
-- El identificador, para reservar y devolver; y una copia del nombre y del
-- tipo, por lo mismo que el renglón ya copia el nombre y el precio: es lo que
-- se pidió y lo que el dueño tiene que leer aunque mañana la talla cambie o se
-- borre.
-- ---------------------------------------------------------------------------

alter table public.pedido_items
  add column variante_id uuid,
  add column variante_nombre text,
  add column tipo_presentacion text,
  add constraint pedido_items_variante_nombre_largo
    check (variante_nombre is null or char_length(variante_nombre) between 1 and 40),
  add constraint pedido_items_tipo_presentacion_valido
    check (tipo_presentacion is null or tipo_presentacion in ('talla', 'numero', 'tamano', 'presentacion')),
  -- Con presentación elegida, su nombre se copia siempre. Al revés no: si la
  -- presentación se borra, el identificador pasa a nulo y el nombre queda.
  add constraint pedido_items_variante_con_nombre
    check (variante_id is null or (variante_nombre is not null and tipo_presentacion is not null)),
  -- La presentación tiene que ser **de ese producto**, y eso lo exige el motor
  -- con la pareja (id, producto_id), no la aplicación. Si se borra, solo su
  -- identificador pasa a nulo: el producto del renglón no se toca.
  add constraint pedido_items_variante_del_producto
    foreign key (variante_id, producto_id)
    references public.variantes_producto (id, producto_id)
    on delete set null (variante_id);

-- La M y la L del mismo producto son dos renglones. La unicidad va sobre el
-- nombre copiado y no sobre el identificador: si se borraran las dos, sus
-- identificadores pasarían a nulo a la vez y chocarían entre sí.
alter table public.pedido_items
  drop constraint pedido_items_producto_unico,
  add constraint pedido_items_producto_y_presentacion_unicos
    unique nulls not distinct (pedido_id, producto_codigo, variante_nombre);

create index idx_pedido_items_variante_reservas
  on public.pedido_items (variante_id)
  where reserva_activa = true;

create index idx_pedido_items_variante
  on public.pedido_items (variante_id);
