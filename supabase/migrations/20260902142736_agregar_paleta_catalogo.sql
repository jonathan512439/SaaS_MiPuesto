alter table public.negocios
  add column paleta_id text not null default 'mercado';

alter table public.negocios
  add constraint negocios_paleta_id_check
  check (paleta_id in ('mercado', 'tierra', 'oceano', 'noche'));

grant select (paleta_id) on table public.negocios to anon;

comment on column public.negocios.paleta_id is
  'Paleta cromatica predefinida del catalogo publico.';
