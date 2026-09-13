-- Una cita a mano puede no ser de ningún producto.
--
-- El dueño bloquea las 10:00 porque tiene reunión, o porque alguien llamó por
-- teléfono y pidió «una hora con el doctor» sin decir para qué. En los dos casos
-- hay que ocupar el calendario del recurso, y no hay producto ni categoría que
-- poner. Las dos columnas pasan a admitir nulo; las citas del catálogo las siguen
-- llevando siempre, porque el catálogo siempre sabe qué se agendó.

alter table public.citas
  alter column producto_id drop not null,
  alter column categoria_id drop not null;

-- Lo que no puede faltar nunca es el recurso: sin recurso no hay calendario que
-- ocupar, y la restricción de exclusión no tendría sobre qué actuar.
alter table public.citas
  add constraint citas_catalogo_con_producto
    check (origen <> 'catalogo' or producto_id is not null);

comment on column public.citas.producto_id is
  'Nulo solo en citas cargadas a mano: un bloqueo o una llamada sin servicio definido.';
