-- Topes de productos y de fotos por producto, según el plan del negocio.
--
-- Decisión del dueño del proyecto (2026-09-25): el plan Catálogo incluye hasta
-- 150 productos con 3 fotos cada uno; el Catálogo Activo, hasta 300 con 4.
--
-- Hasta hoy los dos planes tenían lo mismo, y el tope de productos vivía **solo
-- en la ruta**: un script con la clave privilegiada lo saltaba, y la papelera
-- también —se mandaba un producto a la papelera, se creaba otro y se recuperaba
-- el primero—. Ahora lo hace cumplir la base, como todo tope de este proyecto.
--
-- Los números son los de `lib/planes.ts`, que es donde los leen la portada, los
-- términos y el panel; `topes-del-plan.test.ts` compara los dos lugares.
--
-- Tres reglas:
--
-- 1. **La papelera no cuenta.** Recuperar un producto sí: vuelve a ocupar lugar.
-- 2. **Nada se borra al bajar de plan.** Un negocio que pasa del Activo al
--    Catálogo con 200 productos los conserva todos; lo que no puede es agregar
--    otro hasta quedar debajo de 150. Lo mismo con las fotos: un producto con 4
--    se queda con 4, pero no suma una quinta, y puede quitar las que quiera.
-- 3. El techo físico sigue siendo el `check (cardinality(fotos) <= 4)` del
--    esquema inicial: ningún plan puede prometer más fotos que eso sin una
--    migración que lo cambie.

create or replace function private.topes_del_plan(
  p_plan text,
  out productos integer,
  out fotos_por_producto integer
)
language sql
immutable
security definer
set search_path = ''
as $$
  select
    case p_plan when 'activo' then 300 else 150 end,
    case p_plan when 'activo' then 4 else 3 end;
$$;

comment on function private.topes_del_plan(text) is
  'Productos y fotos por producto de cada plan. Los mismos números que lib/planes.ts; un plan desconocido recibe los del Catálogo.';

create or replace function private.controlar_topes_del_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_topes record;
  v_vivos integer;
  v_ocupa_lugar boolean;
  v_fotos_antes integer;
begin
  select plan_id into v_plan from public.negocios where id = new.negocio_id;
  select * into v_topes from private.topes_del_plan(v_plan);

  -- Ocupa un lugar nuevo el producto que se crea fuera de la papelera y el que
  -- sale de ella. Editar uno que ya estaba no cambia la cuenta.
  -- `old` no existe en un INSERT, así que los dos casos van separados.
  if tg_op = 'INSERT' then
    v_ocupa_lugar := new.eliminado_en is null;
    v_fotos_antes := 0;
  else
    v_ocupa_lugar := new.eliminado_en is null and old.eliminado_en is not null;
    v_fotos_antes := coalesce(cardinality(old.fotos), 0);
  end if;

  if v_ocupa_lugar then
    -- Una carga a la vez por negocio: sin esto, dos importaciones simultáneas
    -- contarían 149 las dos y dejarían 151. El bloqueo dura lo que la
    -- transacción y no toca la fila del negocio, así que no frena pedidos.
    perform pg_advisory_xact_lock(hashtext('mipuesto:productos:' || new.negocio_id::text));

    select count(*) into v_vivos
    from public.productos
    where negocio_id = new.negocio_id
      and eliminado_en is null
      and id <> new.id;

    if v_vivos >= v_topes.productos then
      raise exception using errcode = 'P0001', message = 'LIMITE_PRODUCTOS';
    end if;
  end if;

  -- Solo se rechaza **sumar** fotos por encima del tope. Quitar una a un
  -- producto que quedó con más —por un cambio de plan— siempre se puede.
  if coalesce(cardinality(new.fotos), 0) > v_topes.fotos_por_producto
     and coalesce(cardinality(new.fotos), 0) > v_fotos_antes then
    raise exception using errcode = 'P0001', message = 'LIMITE_FOTOS';
  end if;

  return new;
end;
$$;

drop trigger if exists productos_topes_del_plan on public.productos;
create trigger productos_topes_del_plan
  before insert or update of fotos, eliminado_en on public.productos
  for each row
  execute function private.controlar_topes_del_plan();
