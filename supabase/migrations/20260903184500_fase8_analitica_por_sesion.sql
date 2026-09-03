alter table public.eventos_analitica
  add column sesion_id uuid;

update public.eventos_analitica
set sesion_id = gen_random_uuid()
where sesion_id is null;

alter table public.eventos_analitica
  alter column sesion_id set not null;

create unique index idx_analitica_evento_sesion
  on public.eventos_analitica (
    negocio_id,
    sesion_id,
    tipo,
    coalesce(producto_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create or replace function public.limitar_eventos_analitica_por_sesion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*)
    from public.eventos_analitica
    where negocio_id = new.negocio_id
      and sesion_id = new.sesion_id
      and creado_en >= now() - interval '1 hour'
  ) >= 60 then
    raise exception using
      errcode = 'P0001',
      message = 'Límite de eventos alcanzado para esta sesión.';
  end if;

  return new;
end;
$$;

revoke execute on function public.limitar_eventos_analitica_por_sesion()
  from public, anon, authenticated, service_role;

create trigger limitar_eventos_analitica_por_sesion
before insert on public.eventos_analitica
for each row execute function public.limitar_eventos_analitica_por_sesion();

drop policy "registra_eventos_publicos" on public.eventos_analitica;
drop policy "administra_analitica_propia" on public.eventos_analitica;

create policy "registra_eventos_publicos"
on public.eventos_analitica for insert to anon, authenticated
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = eventos_analitica.negocio_id
      and negocios.activo = true
  )
  and (
    producto_id is null
    or exists (
      select 1 from public.productos
      where productos.id = eventos_analitica.producto_id
        and productos.negocio_id = eventos_analitica.negocio_id
        and productos.visible = true
    )
  )
);

create policy "consulta_analitica_propia"
on public.eventos_analitica for select to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = eventos_analitica.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

revoke all on table public.eventos_analitica from anon, authenticated;
grant insert on table public.eventos_analitica to anon;
grant select, insert on table public.eventos_analitica to authenticated;
