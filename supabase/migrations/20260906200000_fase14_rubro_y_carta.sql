-- Rubro del negocio y carta del día.
--
-- `tipo_negocio` describe **cómo vende** —lectura, acción, carrito—, no **qué
-- vende**. El rubro es ese segundo eje, y llega ahora porque llegó su primera
-- función: el panel de una barbería no tiene por qué ofrecer «carta del día».
--
-- Regla que no se rompe: **el rubro oculta interfaz, nunca datos ni permisos.**
-- Un negocio que cambia de rubro no pierde nada de lo que cargó, y por eso la
-- columna no tiene ningún efecto sobre las políticas de acceso.
--
-- Vacío es un valor legítimo: los negocios que ya existen no eligieron rubro y
-- no se les va a adivinar uno. Ven la interfaz completa, que es exactamente lo
-- que tienen hoy.

alter table public.negocios
  add column rubro text;

alter table public.negocios
  add constraint negocios_rubro_valido
  check (
    rubro is null
    or rubro in (
      'restaurante',
      'tienda_barrio',
      'ropa_y_calzado',
      'ferreteria',
      'servicios',
      'belleza',
      'otro'
    )
  );

comment on column public.negocios.rubro is
  'Qué vende el negocio. Decide qué funciones ofrece el panel. Nulo = no eligió, ve todo.';

-- El catálogo público no lo necesita: nada de lo que se muestra al comprador
-- depende del rubro, y una columna que no se sirve es una columna que no se
-- puede filtrar por error.
grant update (rubro) on table public.negocios to authenticated;
grant select (rubro) on table public.negocios to authenticated;

-- Carta del día.
--
-- Una fecha y no un `boolean`: un interruptor que hay que apagar a mano queda
-- encendido, y a los tres días la carta «de hoy» miente. Guardando el día en
-- que se marcó, la carta se vacía sola a la medianoche sin que nadie haga nada.
alter table public.productos
  add column en_carta_hasta date;

comment on column public.productos.en_carta_hasta is
  'Día —hora de Bolivia— en que este producto es parte de la carta del día. Vence solo.';

grant select (en_carta_hasta) on table public.productos to anon;
grant update (en_carta_hasta) on table public.productos to authenticated;

-- Parcial otra vez: la carta del día son unos pocos productos de unos pocos
-- negocios, y no debe pesar sobre las consultas de todos los demás.
create index if not exists idx_productos_carta_del_dia
  on public.productos (negocio_id, en_carta_hasta)
  where en_carta_hasta is not null;
