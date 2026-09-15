-- Tres rubros más: distribuidora, repuestos y veterinaria.
--
-- Salen del plan de rubros y son los que completan los seis que el alta siembra.
-- Cada uno trae algo que el modelo tenía que sostener y todavía no se había
-- ejercitado con un caso real:
--
--   · distribuidora — presentaciones con precio distinto («caja de 12») y el
--     campo «pedido mínimo», que es lo que separa a una distribuidora de una
--     tienda y hoy no se podía expresar.
--   · repuestos     — el buscador por atributo: nadie busca «filtro», busca
--     «filtro para Toyota Corolla 2015».
--   · veterinaria   — cosas y tiempo en el mismo catálogo: un alimento de 15 kg
--     y una consulta de las 10:00, en el mismo carrito de WhatsApp.
--
-- La restricción se reemplaza en vez de ampliarse porque Postgres no permite
-- editar un check existente. Los siete que ya estaban siguen en la lista, así
-- que ningún negocio queda inválido.
alter table public.negocios
  drop constraint negocios_rubro_valido;

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
      'distribuidora',
      'repuestos',
      'veterinaria',
      -- Ultimo, igual que en la lista de la aplicacion: es la opcion de
      -- descarte. Una prueba compara las dos listas en orden, para que el panel
      -- no pueda ofrecer un rubro que la base rechaza.
      'otro'
    )
  );
