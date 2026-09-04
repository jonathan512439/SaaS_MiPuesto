-- Cuarta plantilla del catalogo publico. La restriccion venia sin nombre propio
-- desde el esquema inicial, asi que se reemplaza por el nombre que Postgres le
-- puso; las tres anteriores siguen en la lista y ningun negocio queda invalido.
alter table public.negocios
  drop constraint negocios_plantilla_id_check;

alter table public.negocios
  add constraint negocios_plantilla_id_check
  check (plantilla_id in ('clasica', 'moderna', 'minimal', 'feria'));
