-- El buscador aprende más palabras, y la lista de lo no encontrado se puede
-- atender.
--
-- 1. **Noventa sinónimos más** para lo que se busca en un catálogo boliviano:
--    comida, ropa, tiendas, construcción, belleza y mascotas. Se cargan sin
--    pisar los que la plataforma ya haya editado (`on conflict do nothing`).
-- 2. **Los sinónimos coinciden por la raíz**, igual que la búsqueda.
-- 3. **El tope de 5000 frena las palabras nuevas, no las que ya están.** Antes,
--    al llegar al tope, la función volvía sin hacer nada, y dejaban de contar
--    también las búsquedas que ya estaban anotadas: la lista se congelaba justo
--    cuando más decía.
-- 4. **La plataforma puede descartar una búsqueda** ya atendida, y se descarta
--    sola cuando se le carga un sinónimo (lo hace la ruta).

-- ---------------------------------------------------------------------------
-- 1. Los sinónimos

insert into public.sinonimos_busqueda (termino, equivalentes) values
  -- Comida
  ('almuerzo', array['menu', 'plato', 'sopa', 'segundo', 'comida', 'plato del dia']),
  ('desayuno', array['cafe', 'api', 'pastel', 'sandwich', 'tostada', 'jugo', 'empanada']),
  ('cena', array['plato', 'pizza', 'hamburguesa', 'pollo', 'comida']),
  ('comida', array['almuerzo', 'plato', 'menu', 'cena', 'platillo']),
  ('pollo', array['broaster', 'frito', 'alitas', 'pechuga', 'spiedo', 'a la brasa']),
  ('broaster', array['pollo', 'frito', 'alitas', 'pechuga']),
  ('alitas', array['pollo', 'broaster', 'wings']),
  ('pizza', array['pizzeria', 'calzone', 'lasana']),
  ('hamburguesa', array['burger', 'sandwich', 'papas fritas']),
  ('saltena', array['empanada', 'tucumana', 'api']),
  ('empanada', array['saltena', 'tucumana', 'pastel', 'cunape']),
  ('sandwich', array['sanduche', 'lomito', 'hamburguesa']),
  ('cafe', array['capuchino', 'expreso', 'americano', 'latte', 'cafeteria']),
  ('helado', array['heladeria', 'paleta', 'copa', 'cono']),
  ('postre', array['torta', 'helado', 'gelatina', 'flan', 'dulce', 'queque']),
  ('dulce', array['caramelo', 'chocolate', 'golosina', 'postre', 'confite']),
  ('galleta', array['masitas', 'bizcocho', 'galletas']),
  ('pan', array['panaderia', 'marraqueta', 'cunape', 'masitas']),
  ('jugo', array['licuado', 'batido', 'refresco', 'zumo']),
  ('refresco', array['gaseosa', 'soda', 'jugo', 'bebida']),
  ('bebida', array['refresco', 'gaseosa', 'jugo', 'agua']),
  ('licor', array['cerveza', 'vino', 'singani', 'whisky', 'ron', 'vodka']),
  ('cerveza', array['chela', 'bebida', 'licor']),
  ('vino', array['singani', 'tinto', 'licor']),
  ('fruta', array['manzana', 'platano', 'naranja', 'uva', 'papaya', 'pina']),
  ('verdura', array['tomate', 'cebolla', 'papa', 'lechuga', 'zanahoria', 'hortaliza']),
  ('carne', array['res', 'cerdo', 'pollo', 'chorizo', 'charque', 'carniceria']),
  ('chancho', array['cerdo', 'chicharron', 'lechon', 'fricase']),
  ('sopa', array['caldo', 'chairo', 'mani', 'crema']),
  ('pescado', array['trucha', 'pejerrey', 'marisco', 'ceviche']),
  -- Ropa y calzado
  ('polera', array['camiseta', 'playera', 'remera', 'top']),
  ('chompa', array['sueter', 'buzo', 'sweater', 'chaleco']),
  ('chamarra', array['chaqueta', 'campera', 'abrigo', 'casaca', 'parka']),
  ('pantalon', array['jean', 'jeans', 'buzo', 'short', 'bermuda']),
  ('vestido', array['falda', 'pollera', 'blusa', 'enterizo']),
  ('pollera', array['manta', 'sombrero', 'blusa', 'enagua']),
  ('zapatilla', array['tenis', 'deportivo', 'zapato', 'calzado']),
  ('uniforme', array['escolar', 'colegio', 'buzo', 'mandil']),
  ('bebe', array['panal', 'mameluco', 'biberon', 'cuna', 'body']),
  ('mochila', array['bolso', 'cartera', 'maleta', 'morral']),
  ('cartera', array['bolso', 'billetera', 'mochila', 'monedero']),
  ('lentes', array['gafas', 'anteojos', 'optica']),
  ('joya', array['anillo', 'collar', 'arete', 'pulsera', 'bisuteria']),
  ('gorra', array['sombrero', 'gorro', 'cachucha']),
  -- Tiendas
  ('telefono', array['celular', 'smartphone', 'funda', 'cargador']),
  ('computadora', array['laptop', 'notebook', 'pc', 'computacion', 'teclado', 'mouse']),
  ('impresora', array['tinta', 'toner', 'cartucho']),
  ('cargador', array['cable', 'usb', 'bateria']),
  ('audifono', array['auricular', 'parlante', 'bocina']),
  ('television', array['tv', 'televisor', 'pantalla']),
  ('electrodomestico', array['refrigerador', 'cocina', 'lavadora', 'licuadora', 'microondas']),
  ('mueble', array['sofa', 'cama', 'ropero', 'mesa', 'silla', 'velador']),
  ('colchon', array['cama', 'almohada', 'sabana']),
  ('regalo', array['detalle', 'peluche', 'taza', 'globo', 'cotillon']),
  ('fiesta', array['cotillon', 'globo', 'decoracion', 'pinata', 'vela']),
  ('cuaderno', array['libreta', 'utiles', 'papeleria', 'lapiz', 'boligrafo']),
  ('utiles', array['cuaderno', 'lapiz', 'mochila', 'colores', 'regla']),
  ('libro', array['libreria', 'texto', 'novela']),
  ('flor', array['rosa', 'ramo', 'arreglo', 'floreria', 'orquidea']),
  ('limpieza', array['detergente', 'lavandina', 'jabon', 'escoba', 'trapeador']),
  ('aseo', array['jabon', 'shampoo', 'papel higienico', 'pasta dental']),
  ('abarrotes', array['arroz', 'azucar', 'aceite', 'fideo', 'harina']),
  -- Construcción y vehículos
  ('cemento', array['ladrillo', 'arena', 'fierro', 'material de construccion']),
  ('pintura', array['latex', 'esmalte', 'brocha', 'rodillo']),
  ('herramienta', array['taladro', 'martillo', 'alicate', 'destornillador', 'llave']),
  ('tornillo', array['clavo', 'perno', 'tuerca', 'arandela']),
  ('foco', array['bombilla', 'luz', 'led', 'lampara']),
  ('cable', array['electrico', 'extension', 'enchufe']),
  ('tubo', array['caneria', 'pvc', 'llave de paso', 'grifo']),
  ('llanta', array['neumatico', 'goma', 'aro']),
  ('repuesto', array['pieza', 'filtro', 'freno', 'bujia']),
  ('moto', array['motocicleta', 'casco', 'repuesto']),
  ('auto', array['vehiculo', 'carro', 'coche', 'repuesto']),
  ('mecanico', array['taller', 'reparacion', 'cambio de aceite']),
  -- Belleza y servicios
  ('peluqueria', array['corte', 'barberia', 'peinado', 'tinte']),
  ('barberia', array['corte', 'barba', 'peluqueria']),
  ('unas', array['manicure', 'pedicure', 'esmalte', 'acrilicas']),
  ('maquillaje', array['cosmeticos', 'labial', 'base', 'rimel']),
  ('perfume', array['fragancia', 'colonia', 'perfumeria']),
  ('masaje', array['spa', 'relajante', 'terapia']),
  ('consulta', array['doctor', 'medico', 'consultorio', 'cita']),
  ('dentista', array['odontologo', 'dental', 'ortodoncia']),
  ('clase', array['curso', 'taller', 'tutoria', 'profesor']),
  ('reparacion', array['arreglo', 'tecnico', 'servicio tecnico']),
  ('foto', array['fotografia', 'fotografo', 'sesion', 'impresion']),
  ('fotocopia', array['copia', 'impresion', 'anillado']),
  -- Mascotas
  ('mascota', array['perro', 'gato', 'veterinaria', 'alimento']),
  ('perro', array['can', 'cachorro', 'mascota', 'croqueta']),
  ('gato', array['felino', 'mascota', 'arena']),
  ('vacuna', array['veterinaria', 'vacunacion', 'desparasitacion'])
on conflict (termino) do nothing;

-- ---------------------------------------------------------------------------
-- 2. La búsqueda, con los sinónimos por raíz (misma firma y mismo resultado)

create or replace function public.buscar_en_directorio(
  p_palabras text[] default '{}',
  p_rubros_que_coinciden text[] default '{}',
  p_ciudad text default null,
  p_zona_id uuid default null,
  p_rubro text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_pagina integer default 1
)
returns table (
  id uuid,
  slug text,
  nombre text,
  descripcion text,
  logo_url text,
  portada_url text,
  horario jsonb,
  ciudad text,
  zona text,
  rubro_publico text,
  puntaje integer,
  coincidencias integer,
  productos jsonb,
  distancia_km numeric,
  palabra text,
  total bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with palabras as (
    select distinct w
    from unnest(coalesce(p_palabras, '{}')) as w
    where char_length(w) between 2 and 40
    limit 6
  ),
  /* Los sinónimos coinciden **por la raíz**, igual que la búsqueda: el
     sinónimo cargado como «juguetes» se activa también con «juguete», y el de
     «polera» con «poleras». Antes pedían la palabra exacta, y una letra de más
     los dejaba mudos. */
  expandidas as (
    select w from palabras
    union
    select unnest(s.equivalentes)
    from public.sinonimos_busqueda s
    join palabras p
      on (case when char_length(s.termino) > 4 then regexp_replace(s.termino, '(es|s)$', '') else s.termino end)
       = (case when char_length(p.w) > 4 then regexp_replace(p.w, '(es|s)$', '') else p.w end)
  ),
  raices as (
    select distinct
      w as original,
      case when char_length(w) > 4 then regexp_replace(w, '(es|s)$', '') else w end as r
    from expandidas
    where char_length(w) >= 3
  ),
  hay_texto as (
    select exists (select 1 from raices) as si
  ),
  candidatos as (
    select n.*
    from public.negocios n
    where n.activo
      and n.aparece_en_directorio is true
      and (p_ciudad is null or n.ciudad = p_ciudad)
      and (p_zona_id is null or n.zona_id = p_zona_id)
      and (
        p_rubro is null
        or n.rubro_publico = p_rubro
        or p_rubro = any (n.rubros_secundarios)
      )
  ),
  por_negocio as (
    select
      c.id,
      -- El nombre, el renglón y la descripción del negocio, o su rubro.
      (
        exists (
          select 1 from raices
          where lower(translate(
            coalesce(c.nombre, '') || ' ' || coalesce(c.subnombre, '') || ' ' || coalesce(c.descripcion, ''),
            'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'
          )) like '%' || raices.r || '%'
        )
        or c.rubro_publico = any (coalesce(p_rubros_que_coinciden, '{}'))
        or c.rubros_secundarios && coalesce(p_rubros_que_coinciden, '{}')
      ) as coincide_negocio,
      exists (
        select 1
        from public.categorias cat, raices
        where cat.negocio_id = c.id
          and cat.visible
          and lower(translate(cat.nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) like '%' || raices.r || '%'
      ) as coincide_categoria
    from candidatos c
  ),
  productos_que_coinciden as (
    select
      p.negocio_id,
      p.nombre,
      p.codigo,
      p.fotos[1] as foto,
      p.orden,
      /* La palabra con la que el catálogo lo va a encontrar: la escrita, si
         está tal cual en el producto; si no, la raíz. Nula si solo coincidió
         por parecido —un error de tipeo—, porque el filtro del catálogo compara
         por texto y con esa palabra no encontraría nada. */
      (
        select case
          when p.texto_busqueda like '%' || rx.original || '%' then rx.original
          else rx.r
        end
        from raices rx
        where p.texto_busqueda like '%' || rx.r || '%'
        order by char_length(rx.original) desc
        limit 1
      ) as palabra
    from public.productos p
    join candidatos c on c.id = p.negocio_id
    where p.visible
      and p.eliminado_en is null
      and exists (
        select 1 from raices
        where p.texto_busqueda like '%' || raices.r || '%'
           -- Con esquema: la función corre con `search_path` vacío y
           -- `pg_trgm` vive en `public`. Sin el prefijo el operador no existe.
           or raices.r operator(public.<%) p.texto_busqueda
      )
  ),
  resumen_productos as (
    select
      negocio_id,
      count(*)::integer as cantidad,
      mode() within group (order by palabra) filter (where palabra is not null) as palabra,
      (
        select jsonb_agg(jsonb_build_object('nombre', x.nombre, 'codigo', x.codigo, 'foto', x.foto))
        from (
          select pq2.nombre, pq2.codigo, pq2.foto
          from productos_que_coinciden pq2
          where pq2.negocio_id = pq.negocio_id
          -- Primero los que tienen foto: son los que se muestran.
          order by (pq2.foto is null), pq2.orden
          limit 3
        ) x
      ) as muestra
    from productos_que_coinciden pq
    group by negocio_id
  ),
  puntuados as (
    select
      c.*,
      case
        when not (select si from hay_texto) then 0
        when pn.coincide_negocio then 3
        when pn.coincide_categoria then 2
        when rp.cantidad > 0 then 1
        else 0
      end as puntaje_calc,
      coalesce(rp.cantidad, 0) as cantidad_productos,
      rp.muestra,
      rp.palabra,
      case
        when p_lat is null or p_lng is null or c.ubicacion_lat is null then null
        -- Redondeada a medio kilómetro: dice «a 1,5 km», no dónde está.
        else round(
          2 * 6371 * asin(sqrt(
            power(sin(radians((c.ubicacion_lat - p_lat) / 2)), 2)
            + cos(radians(p_lat)) * cos(radians(c.ubicacion_lat))
              * power(sin(radians((c.ubicacion_lng - p_lng) / 2)), 2)
          )) * 2
        ) / 2
      end as distancia
    from candidatos c
    join por_negocio pn on pn.id = c.id
    left join resumen_productos rp on rp.negocio_id = c.id
  ),
  filtrados as (
    select * from puntuados
    where not (select si from hay_texto) or puntaje_calc > 0
  )
  select
    f.id,
    f.slug,
    f.nombre,
    f.descripcion,
    f.logo_url,
    f.portada_url,
    f.horario,
    f.ciudad,
    z.nombre as zona,
    f.rubro_publico,
    f.puntaje_calc,
    f.cantidad_productos,
    coalesce(f.muestra, '[]'::jsonb),
    f.distancia::numeric,
    f.palabra,
    count(*) over ()
  from filtrados f
  left join public.zonas z on z.id = f.zona_id
  order by f.puntaje_calc desc, f.cantidad_productos desc, f.distancia asc nulls last, f.nombre
  limit 12
  offset (greatest(coalesce(p_pagina, 1), 1) - 1) * 12;
$$;

comment on function public.buscar_en_directorio(text[], text[], text, uuid, text, double precision, double precision, integer) is
  'El buscador del directorio. Solo negocios activos que eligieron aparecer, solo lo visible, y nunca coordenadas: la distancia sale redondeada a medio kilómetro.';

-- ---------------------------------------------------------------------------
-- 3. El tope, solo para las palabras nuevas

create or replace function public.registrar_busqueda_sin_resultado(
  p_termino text,
  p_ciudad text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_termino is null or char_length(p_termino) not between 2 and 60 then
    return;
  end if;

  -- La que ya está, suma siempre.
  update public.busquedas_sin_resultado
    set cantidad = cantidad + 1, ultima_vez = now()
    where termino = p_termino and ciudad = coalesce(p_ciudad, '');
  if found then
    return;
  end if;

  -- Una nueva entra solo si hay lugar: el techo es para que nadie llene la
  -- tabla de palabras inventadas, no para dejar de contar las de verdad.
  if (select count(*) from public.busquedas_sin_resultado) >= 5000 then
    return;
  end if;

  insert into public.busquedas_sin_resultado as b (termino, ciudad)
  values (p_termino, coalesce(p_ciudad, ''))
  on conflict (termino, ciudad) do update
    set cantidad = b.cantidad + 1, ultima_vez = now();
end;
$$;

revoke all on function public.registrar_busqueda_sin_resultado(text, text) from public, anon, authenticated;
grant execute on function public.registrar_busqueda_sin_resultado(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Descartar lo atendido

create policy "plataforma_descarta_busquedas_sin_resultado"
on public.busquedas_sin_resultado for delete to authenticated
using (public.es_admin_plataforma());

grant delete on table public.busquedas_sin_resultado to authenticated;
