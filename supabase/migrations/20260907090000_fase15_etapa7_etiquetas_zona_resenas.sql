-- Etapa 7: etiqueta NFC, directorio por zona y calificación en Google.
--
-- Las tres comparten una idea: el catálogo existe para que alguien llegue a él,
-- y hasta ahora la única puerta era que el dueño mandara el enlace por WhatsApp.

-- ---------------------------------------------------------------------------
-- 1. Etiquetas NFC y QR
--
-- El código es estable y reasignable: la etiqueta pegada en una mesa sobrevive
-- al negocio que la usaba. Si el local cambia de dueño, se reapunta el código y
-- la etiqueta física sigue sirviendo; imprimir el slug en el plástico obligaría
-- a tirar el lote entero.
--
-- Seis caracteres sin vocales ni caracteres que se confunden al dictarlos: un
-- código se lee por teléfono más veces de lo que uno cree.

create table public.etiquetas (
  codigo text primary key,
  negocio_id uuid references public.negocios (id) on delete set null,
  nota text,
  creado_en timestamptz not null default now(),
  reasignado_en timestamptz,
  ultimo_uso_en timestamptz,
  constraint etiquetas_codigo_formato check (codigo ~ '^[A-Z0-9]{6}$'),
  constraint etiquetas_nota_corta check (nota is null or char_length(nota) <= 120)
);

comment on table public.etiquetas is
  'Códigos de etiquetas NFC y QR. Apuntan a un negocio y se pueden reapuntar sin reimprimir.';

alter table public.etiquetas enable row level security;

-- Nadie las lee directamente. Resolver un código pasa por una función, que es
-- lo que impide enumerar la tabla entera y de paso permite anotar el uso.
revoke all on table public.etiquetas from anon, authenticated;

create policy "plataforma_administra_etiquetas"
on public.etiquetas for all to authenticated
using (public.es_admin_plataforma())
with check (public.es_admin_plataforma());

grant select, insert, update, delete on table public.etiquetas to authenticated;
grant select, insert, update, delete on table public.etiquetas to service_role;

create index if not exists idx_etiquetas_negocio on public.etiquetas (negocio_id);

-- Definer porque la tabla está cerrada. Devuelve solo el slug: quien escanea no
-- tiene por qué recibir el resto de la fila.
create or replace function public.resolver_etiqueta(p_codigo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text;
begin
  if p_codigo is null or p_codigo !~ '^[A-Z0-9]{6}$' then
    return null;
  end if;

  select negocio.slug into v_slug
  from public.etiquetas as etiqueta
  join public.negocios as negocio on negocio.id = etiqueta.negocio_id
  where etiqueta.codigo = p_codigo and negocio.activo = true;

  if v_slug is null then
    return null;
  end if;

  -- Sirve para saber si un lote de etiquetas se está usando o quedó en un cajón.
  update public.etiquetas set ultimo_uso_en = now() where codigo = p_codigo;

  return v_slug;
end;
$$;

grant execute on function public.resolver_etiqueta(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Dónde está el negocio
--
-- Ciudad de una lista cerrada y zona en texto libre. Al revés no funciona: un
-- directorio agrupa por ciudad, y si cada dueño escribe «Sta Cruz», «santa
-- cruz» o «SCZ» no hay agrupación posible. La zona, en cambio, es el barrio, y
-- los barrios bolivianos no entran en ninguna lista.

alter table public.negocios add column ciudad text;
alter table public.negocios add column zona text;

alter table public.negocios
  add constraint negocios_ciudad_valida
  check (
    ciudad is null
    or ciudad in (
      'la_paz',
      'el_alto',
      'santa_cruz',
      'cochabamba',
      'sucre',
      'oruro',
      'potosi',
      'tarija',
      'trinidad',
      'cobija',
      'otra'
    )
  );

alter table public.negocios
  add constraint negocios_zona_corta
  check (zona is null or char_length(zona) between 1 and 60);

comment on column public.negocios.ciudad is
  'Ciudad del negocio, de una lista cerrada para que el directorio pueda agrupar.';
comment on column public.negocios.zona is
  'Barrio o zona, en las palabras del dueño. Nulo significa que no la publicó.';

grant select (ciudad) on table public.negocios to anon;
grant select (zona) on table public.negocios to anon;
grant update (ciudad) on table public.negocios to authenticated;
grant update (zona) on table public.negocios to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Calificación en Google
--
-- Se guarda el enlace que el dueño pega y no un identificador de lugar, por el
-- mismo motivo que la ubicación: buscar el lugar por API cuesta y adivinarlo
-- sale mal. El enlace que el propio dueño verificó es el dato más confiable.

alter table public.negocios add column resenas_url text;

comment on column public.negocios.resenas_url is
  'Enlace para dejar una reseña en Google. Vacío significa que no lo publicó.';

grant select (resenas_url) on table public.negocios to anon;
grant update (resenas_url) on table public.negocios to authenticated;
