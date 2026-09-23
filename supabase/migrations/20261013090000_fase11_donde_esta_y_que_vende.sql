-- Fase 11: dónde está cada negocio, qué vende, y si quiere que lo encuentren.
--
-- El detalle y las decisiones están en `docs/plan/09-DIRECTORIO-Y-FORMAS.md`.
-- Lo que esta migración deja:
--
--   1. `zonas`: la lista curada de zonas de cada ciudad, con su punto central.
--   2. En `negocios`: la ubicación, la zona, el rubro público y la decisión de
--      aparecer en el buscador.
--   3. Los permisos, **con las coordenadas cerradas al público**.
--   4. Lo que ya estaba guardado, puesto en su lugar.
--   5. La función con la que la plataforma asigna una zona.

-- ---------------------------------------------------------------------------
-- 1. Las zonas
--
-- Es un dato de la plataforma que comparten todos los negocios, como
-- `plataforma_admins`, y por eso **no lleva `negocio_id`**: es la excepción a la
-- regla de AGENTS.md, dicha acá en voz alta.

create table public.zonas (
  id uuid primary key default gen_random_uuid(),
  ciudad text not null check (
    ciudad in (
      'la_paz', 'el_alto', 'santa_cruz', 'cochabamba', 'sucre', 'oruro',
      'potosi', 'tarija', 'trinidad', 'cobija', 'otra'
    )
  ),
  nombre text not null check (char_length(trim(nombre)) between 2 and 60),
  latitud numeric(9, 6) not null check (latitud between -23.0 and -9.5),
  longitud numeric(9, 6) not null check (longitud between -69.8 and -57.3),
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

create unique index zonas_nombre_por_ciudad on public.zonas (ciudad, lower(trim(nombre)));

comment on table public.zonas is
  'Zonas de cada ciudad, curadas por la plataforma. El punto central sirve para asignar la zona a un negocio desde su ubicación.';

alter table public.zonas enable row level security;

-- La lee cualquiera, pero solo las activas: una zona dada de baja no se ofrece.
-- Son dos políticas y no una con `or`: `anon` no puede ejecutar
-- `es_admin_plataforma()`, y Postgres no promete cortar el `or` antes de
-- llamarla.
create policy "cualquiera_lee_zonas_activas"
on public.zonas for select to anon
using (activa);

create policy "el_panel_lee_zonas"
on public.zonas for select to authenticated
using (activa or public.es_admin_plataforma());

create policy "plataforma_administra_zonas"
on public.zonas for all to authenticated
using (public.es_admin_plataforma())
with check (public.es_admin_plataforma());

grant select on table public.zonas to anon, authenticated;
grant insert, update on table public.zonas to authenticated;
grant all on table public.zonas to service_role;

-- ---------------------------------------------------------------------------
-- 2. El negocio

alter table public.negocios
  -- Nulo = todavía no decidió. Nadie aparece en el buscador por omisión.
  add column aparece_en_directorio boolean,
  add column ubicacion_lat numeric(9, 6),
  add column ubicacion_lng numeric(9, 6),
  add column zona_id uuid references public.zonas (id) on delete set null,
  -- «Mi zona no está»: la escribe el dueño y la resuelve la plataforma.
  add column zona_propuesta text
    check (zona_propuesta is null or char_length(trim(zona_propuesta)) between 2 and 60),
  add column rubro_publico text,
  add column rubros_secundarios text[] not null default '{}';

-- La lista de rubros públicos es la de `lib/negocios/rubros-publicos.ts`; una
-- prueba compara las dos. Se escribe dos veces —principal y secundarios— porque
-- un `check` no puede nombrar una lista guardada en otro lado.
alter table public.negocios
  add constraint negocios_rubro_publico_valido check (
    rubro_publico is null or rubro_publico in (
      'restaurante', 'polleria', 'comida_rapida', 'salteneria', 'cafeteria', 'panaderia',
      'tienda_barrio', 'minimarket', 'licoreria', 'jugueteria', 'libreria', 'regalos',
      'electronica', 'muebles', 'artesanias',
      'ropa_y_calzado', 'accesorios',
      'ferreteria', 'distribuidora', 'repuestos', 'taller_mecanico',
      'barberia', 'salon_belleza',
      'consultorio', 'clases', 'otros_servicios',
      'veterinaria', 'mascotas',
      'otro'
    )
  ),
  add constraint negocios_rubros_secundarios_validos check (
    cardinality(rubros_secundarios) <= 2
    and rubros_secundarios <@ array[
      'restaurante', 'polleria', 'comida_rapida', 'salteneria', 'cafeteria', 'panaderia',
      'tienda_barrio', 'minimarket', 'licoreria', 'jugueteria', 'libreria', 'regalos',
      'electronica', 'muebles', 'artesanias',
      'ropa_y_calzado', 'accesorios',
      'ferreteria', 'distribuidora', 'repuestos', 'taller_mecanico',
      'barberia', 'salon_belleza',
      'consultorio', 'clases', 'otros_servicios',
      'veterinaria', 'mascotas',
      'otro'
    ]::text[]
  ),
  -- Dentro de Bolivia, con margen: un pin en el océano es un dedo que resbaló.
  add constraint negocios_ubicacion_en_bolivia check (
    (ubicacion_lat is null and ubicacion_lng is null)
    or (
      ubicacion_lat between -23.0 and -9.5
      and ubicacion_lng between -69.8 and -57.3
    )
  ),
  -- Aparecer en el buscador exige estar ubicado.
  add constraint negocios_aparecer_exige_ubicacion check (
    aparece_en_directorio is not true
    or (ciudad is not null and ubicacion_lat is not null)
  );

comment on column public.negocios.aparece_en_directorio is
  'Si el negocio quiere aparecer en el buscador de MiPuesto. Nulo: todavía no lo decidió.';
comment on column public.negocios.ubicacion_lat is
  'Latitud del local. NUNCA se concede a anon: el punto exacto no se publica.';
comment on column public.negocios.ubicacion_lng is
  'Longitud del local. NUNCA se concede a anon: el punto exacto no se publica.';
comment on column public.negocios.rubro_publico is
  'Lo que vende, en la lista que ve el cliente. Distinto de `rubro`, que es la siembra y queda fijo.';

-- ---------------------------------------------------------------------------
-- 3. Permisos
--
-- **Las coordenadas no se conceden a `anon`**, y una guardia lo vigila en cada
-- migración. La distancia la calculará la función del directorio (fase 12), que
-- devuelve una cifra redondeada y nunca el punto.

grant select (aparece_en_directorio, zona_id, rubro_publico, rubros_secundarios)
  on table public.negocios to anon;

grant select (
  aparece_en_directorio, ubicacion_lat, ubicacion_lng, zona_id, zona_propuesta,
  rubro_publico, rubros_secundarios
) on table public.negocios to authenticated;

grant update (
  aparece_en_directorio, ubicacion_lat, ubicacion_lng, zona_id, zona_propuesta,
  rubro_publico, rubros_secundarios
) on table public.negocios to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Lo que ya estaba guardado
--
-- La columna `zona` se usaba como dirección («6 de Octubre #2255»). No se borra:
-- se deja de leer, y lo que tiene pasa a `direccion_manual`, que es la columna
-- que el modelo ya tenía para eso, donde esté vacía.
update public.negocios
  set direccion_manual = zona
  where zona is not null
    and trim(zona) <> ''
    and (direccion_manual is null or trim(direccion_manual) = '');

-- El rubro público de los negocios que ya eligieron su siembra: el que tiene el
-- mismo nombre, o el más general de su grupo. El dueño lo puede afinar después
-- desde «Mi negocio».
update public.negocios
  set rubro_publico = case rubro
    when 'restaurante' then 'restaurante'
    when 'tienda_barrio' then 'tienda_barrio'
    when 'ropa_y_calzado' then 'ropa_y_calzado'
    when 'ferreteria' then 'ferreteria'
    when 'servicios' then 'otros_servicios'
    when 'belleza' then 'salon_belleza'
    when 'distribuidora' then 'distribuidora'
    when 'repuestos' then 'repuestos'
    when 'veterinaria' then 'veterinaria'
    when 'otro' then 'otro'
  end
  where rubro is not null and rubro_publico is null;

-- ---------------------------------------------------------------------------
-- 5. Asignar una zona desde la plataforma
--
-- Resuelve el «Mi zona no está» de un dueño: se le asigna una zona existente de
-- su ciudad y se limpia la propuesta. Queda en la bitácora, como toda acción de
-- la plataforma sobre un negocio.
create or replace function public.admin_asignar_zona(
  p_negocio_id uuid,
  p_zona_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.exigir_admin_plataforma();
  v_negocio public.negocios%rowtype;
  v_zona public.zonas%rowtype;
begin
  select * into v_negocio from public.negocios where id = p_negocio_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'NEGOCIO_NO_ENCONTRADO';
  end if;

  select * into v_zona from public.zonas where id = p_zona_id and activa;
  if not found then
    raise exception using errcode = 'P0002', message = 'ZONA_NO_ENCONTRADA';
  end if;

  -- Una zona de otra ciudad sería un negocio de Oruro apareciendo en La Paz.
  if v_negocio.ciudad is distinct from v_zona.ciudad then
    raise exception using errcode = 'P0001', message = 'ZONA_DE_OTRA_CIUDAD';
  end if;

  update public.negocios
    set zona_id = p_zona_id, zona_propuesta = null
    where id = p_negocio_id;

  insert into public.bitacora_plataforma (actor, accion, negocio_id, detalle)
  values (
    v_actor,
    'asignar_zona',
    p_negocio_id,
    jsonb_build_object('zona', v_zona.nombre, 'propuesta', v_negocio.zona_propuesta)
  );

  return jsonb_build_object('zona_id', p_zona_id, 'zona', v_zona.nombre);
end;
$$;

revoke all on function public.admin_asignar_zona(uuid, uuid) from public, anon;
grant execute on function public.admin_asignar_zona(uuid, uuid) to authenticated;
