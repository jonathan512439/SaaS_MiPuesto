-- El cambio de rubro de un negocio, hecho por la plataforma.
--
-- El rubro se elige una vez, al darse de alta, y queda bloqueado: de él cuelgan
-- las categorías sembradas, sus campos y su agenda, y cambiarlo después no es
-- «editar un dato» sino **rehacer el catálogo**. Por eso el dueño no puede, y
-- por eso esto existe: el caso real es el comerciante que se equivocó al
-- registrarse, o el que cambió de giro, y hoy la única salida sería borrar la
-- cuenta y empezar de nuevo perdiendo su enlace, su QR y sus pedidos.
--
-- **Todo en una función y no en la ruta**, como el resto de las acciones de
-- plataforma: la autorización la exige la base y no se puede saltar con una
-- petición armada a mano. Y como es una sola transacción, un negocio nunca
-- queda con el catálogo borrado y el rubro viejo, ni sembrado dos veces.
--
-- **La siembra llega como `jsonb` desde el servidor** y no está escrita acá. Las
-- seis siembras viven en `lib/rubros/siembra/`, en TypeScript, porque son datos
-- que se corrigen sin desplegar la base. Copiarlas en SQL daría dos versiones de
-- la misma lista, y el día que se corrija el nombre de una categoría quedaría
-- bien para quien se da de alta y mal para quien cambia de rubro. Esta función
-- no sabe qué siembra está aplicando: sabe escribir la que le pasen.
--
-- Lo que se pierde al cambiar de rubro, y que el aviso al dueño tiene que decir
-- antes y no después: los productos con sus fotografías, los campos propios de
-- cada categoría, las presentaciones, y **las citas agendadas**, que cuelgan del
-- producto. Los pedidos no se pierden: guardan su propio detalle y solo quedan
-- sin el enlace al producto que ya no existe.

create or replace function public.admin_cambiar_rubro(
  p_negocio_id uuid,
  p_rubro text,
  p_siembra jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.exigir_admin_plataforma();
  v_negocio public.negocios%rowtype;
  v_borrados jsonb;
  v_categoria jsonb;
  v_recurso jsonb;
  v_atributo jsonb;
  v_ids jsonb := '{}'::jsonb;
  v_id uuid;
  v_sembradas int := 0;
  v_atributos int := 0;
  v_recursos int := 0;
begin
  -- Se bloquea la fila del negocio para que dos cambios simultáneos no se
  -- pisen: el segundo esperaría, vería el catálogo ya vacío y sembraría encima
  -- de lo que acaba de sembrar el primero.
  select * into v_negocio
  from public.negocios
  where id = p_negocio_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'NEGOCIO_NO_ENCONTRADO';
  end if;

  if p_rubro is null or btrim(p_rubro) = '' then
    raise exception using errcode = 'P0001', message = 'RUBRO_VACIO';
  end if;

  -- Cambiar un negocio al rubro que ya tiene borraría su catálogo entero a
  -- cambio de nada. Es el error de dedo más fácil de cometer en una lista de
  -- diez rubros, y el más caro.
  if v_negocio.rubro is not distinct from p_rubro then
    raise exception using errcode = 'P0001', message = 'MISMO_RUBRO';
  end if;

  -- Qué se va a destruir, contado antes de destruirlo: va a la bitácora y a la
  -- respuesta, para que quede dicho en números y no como «se borró el catálogo».
  select jsonb_build_object(
    'productos', (select count(*) from public.productos where negocio_id = p_negocio_id),
    'categorias', (select count(*) from public.categorias where negocio_id = p_negocio_id),
    'recursos', (select count(*) from public.recursos where negocio_id = p_negocio_id),
    'citas', (
      select count(*)
      from public.citas
      where negocio_id = p_negocio_id and estado <> 'cancelada'
    )
  ) into v_borrados;

  -- El orden importa solo para leerlo: las dependencias caen en cascada.
  -- `pedido_items.producto_id` queda en nulo y el pedido conserva su detalle.
  delete from public.productos where negocio_id = p_negocio_id;
  delete from public.atributos_categoria where negocio_id = p_negocio_id;
  delete from public.categorias where negocio_id = p_negocio_id;
  delete from public.agenda_recurso where negocio_id = p_negocio_id;
  delete from public.recursos where negocio_id = p_negocio_id;

  update public.negocios
  set
    rubro = p_rubro,
    -- Vuelve a quedar bloqueado en el acto: el rubro no es un campo que se
    -- prueba. Si hace falta cambiarlo otra vez, se vuelve a pedir.
    rubro_bloqueado_en = now()
  where id = p_negocio_id;

  -- La siembra, si vino alguna. Cuatro de los diez rubros no tienen, y eso no
  -- es un error: el negocio queda con el catálogo vacío y lo arma el dueño.
  if p_siembra is not null then
    for v_categoria in select * from jsonb_array_elements(p_siembra -> 'categorias')
    loop
      insert into public.categorias (negocio_id, nombre, icono, vende, orden, visible)
      values (
        p_negocio_id,
        v_categoria ->> 'nombre',
        v_categoria ->> 'icono',
        v_categoria ->> 'vende',
        (v_categoria ->> 'orden')::int,
        (v_categoria ->> 'visible')::boolean
      )
      returning id into v_id;

      -- Los atributos vienen apuntando a su categoría por nombre, porque los
      -- ids no existían cuando se armó la lista.
      v_ids := v_ids || jsonb_build_object(v_categoria ->> 'nombre', v_id::text);
      v_sembradas := v_sembradas + 1;
    end loop;

    for v_atributo in select * from jsonb_array_elements(coalesce(p_siembra -> 'atributos', '[]'::jsonb))
    loop
      insert into public.atributos_categoria (
        negocio_id, categoria_id, clave, nombre, tipo, unidad, opciones,
        obligatorio, en_tarjeta, en_resumen, orden
      )
      values (
        p_negocio_id,
        (v_ids ->> (v_atributo ->> 'categoria'))::uuid,
        v_atributo ->> 'clave',
        v_atributo ->> 'nombre',
        v_atributo ->> 'tipo',
        v_atributo ->> 'unidad',
        (
          select coalesce(array_agg(valor), array[]::text[])
          from jsonb_array_elements_text(v_atributo -> 'opciones') as valor
        ),
        (v_atributo ->> 'obligatorio')::boolean,
        (v_atributo ->> 'en_tarjeta')::boolean,
        (v_atributo ->> 'en_resumen')::boolean,
        (v_atributo ->> 'orden')::int
      );
      v_atributos := v_atributos + 1;
    end loop;

    for v_recurso in select * from jsonb_array_elements(coalesce(p_siembra -> 'recursos', '[]'::jsonb))
    loop
      insert into public.recursos (negocio_id, nombre, orden, activo, acepta_reservas)
      values (
        p_negocio_id,
        v_recurso ->> 'nombre',
        (v_recurso ->> 'orden')::int,
        (v_recurso ->> 'activo')::boolean,
        (v_recurso ->> 'acepta_reservas')::boolean
      )
      returning id into v_id;

      insert into public.agenda_recurso (
        negocio_id, recurso_id, duracion_minutos, cupo_por_franja,
        anticipacion_minima_horas, dias_maximos, franjas
      )
      values (
        p_negocio_id,
        v_id,
        ((v_recurso -> 'agenda') ->> 'duracion_minutos')::int,
        ((v_recurso -> 'agenda') ->> 'cupo_por_franja')::int,
        ((v_recurso -> 'agenda') ->> 'anticipacion_minima_horas')::int,
        ((v_recurso -> 'agenda') ->> 'dias_maximos')::int,
        (v_recurso -> 'agenda') -> 'franjas'
      );
      v_recursos := v_recursos + 1;
    end loop;
  end if;

  insert into public.bitacora_plataforma (actor, negocio_id, accion, detalle)
  values (
    v_actor,
    p_negocio_id,
    'cambiar_rubro',
    jsonb_build_object(
      'rubro_anterior', v_negocio.rubro,
      'rubro_nuevo', p_rubro,
      'borrado', v_borrados,
      'sembrado', jsonb_build_object(
        'categorias', v_sembradas,
        'atributos', v_atributos,
        'recursos', v_recursos
      )
    )
  );

  return jsonb_build_object(
    'rubro_anterior', v_negocio.rubro,
    'rubro_nuevo', p_rubro,
    'borrado', v_borrados,
    'sembrado', jsonb_build_object(
      'categorias', v_sembradas,
      'atributos', v_atributos,
      'recursos', v_recursos
    )
  );
end;
$$;

-- Solo para quien tiene sesión. Adentro, la función exige ser administrador de
-- la plataforma; sin este `grant` ni siquiera se podría llamar para que lo diga.
revoke all on function public.admin_cambiar_rubro(uuid, text, jsonb) from public;
grant execute on function public.admin_cambiar_rubro(uuid, text, jsonb) to authenticated;
