-- Borrar productos ya no choca con la analítica.
--
-- «Cambiar rubro» fallaba con un «no se pudo» y nada más. La causa, reproducida
-- contra la base: al borrar los productos, `eventos_analitica.producto_id` pasa
-- a nulo (`on delete set null`, para que las visitas y los clics sigan
-- contando en el panel). Pero el índice único que evita contar dos veces el
-- mismo evento de una sesión trata el nulo como un producto más: si un
-- comprador tocó dos productos en la misma visita, al borrar los dos quedan dos
-- «clic_producto sin producto» de la misma sesión, y el índice rechaza el
-- segundo. El borrado entero se cae. Le pasaba también a «Vaciar la papelera».
--
-- El índice tiene que distinguir dos nulos que no son lo mismo: el evento que
-- nunca tuvo producto —una visita al catálogo, el botón general de WhatsApp—,
-- que sí se cuenta una vez por sesión, y el que lo tuvo y lo perdió al borrarse
-- el producto, que ya se contó cuando entró y no tiene con quién repetirse.
-- Para eso cada evento recuerda, al entrar, si era de un producto.

alter table public.eventos_analitica
  add column era_de_producto boolean not null default false;

comment on column public.eventos_analitica.era_de_producto is
  'Si el evento entró con un producto. Distingue la visita sin producto del clic cuyo producto se borró.';

-- Los que hoy tienen producto. Los que ya lo perdieron quedan en falso: ya
-- cumplen el índice, porque entraron uno por sesión.
update public.eventos_analitica
set era_de_producto = true
where producto_id is not null;

-- Lo pone la base y no quien inserta: un evento anónimo no decide cómo se
-- cuenta.
create or replace function public.marcar_evento_de_producto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.era_de_producto := new.producto_id is not null;
  return new;
end;
$$;

revoke execute on function public.marcar_evento_de_producto()
  from public, anon, authenticated, service_role;

create trigger marcar_evento_de_producto
before insert on public.eventos_analitica
for each row execute function public.marcar_evento_de_producto();

-- El mismo nombre, que la auditoría de la fase 8 busca, y la misma regla para
-- todo evento menos el que perdió su producto.
drop index public.idx_analitica_evento_sesion;

create unique index idx_analitica_evento_sesion
  on public.eventos_analitica (
    negocio_id,
    sesion_id,
    tipo,
    coalesce(producto_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where producto_id is not null or not era_de_producto;
