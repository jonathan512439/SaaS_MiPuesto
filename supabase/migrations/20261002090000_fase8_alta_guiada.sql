-- Fase 8 · El alta guiada.
--
-- El panel deja de ser un menú de pantallas sueltas y pasa a ser un camino de
-- cuatro pasos. Estas columnas son lo que ese camino necesita recordar.

alter table public.negocios
  -- Para llamar al dueño por su nombre. «Bienvenido, Jonathan», no
  -- «Bienvenido, usuario». Se pide en el primer paso.
  add column nombre_admin text,

  -- En qué paso quedó.
  --
  -- El plan lo deducía de los datos cargados, y para tres de los cuatro pasos
  -- alcanza: el 1 tiene el nombre, el 2 el rubro y el 4 el primer producto. El
  -- paso 3 —logo, subnombre, paleta— **no tiene ningún dato obligatorio**, así
  -- que quien lo abandona ahí no deja rastro y volvería al 4. El plan pide lo
  -- contrario, textual: «si cierra el navegador en el paso 3, vuelve al paso 3».
  -- Se guarda el paso en vez de adivinarlo.
  add column alta_paso smallint not null default 1
    check (alta_paso between 1 and 4),

  -- Cuándo terminó. Hasta que no esté, el panel abre siempre en el alta.
  add column alta_completada_en timestamptz,

  -- Cuándo quedó fijo el rubro. Nulo hasta que lo elige.
  add column rubro_bloqueado_en timestamptz,

  -- No se puede bloquear un rubro que no se eligió. Sin esto, una fila con el
  -- rubro nulo y la fecha puesta dejaría al dueño sin rubro y sin poder elegir.
  add constraint negocios_rubro_bloqueado_necesita_rubro
    check (rubro_bloqueado_en is null or rubro is not null);

comment on column public.negocios.nombre_admin is
  'El nombre de la persona, para tratarla por su nombre. Distinto del nombre del negocio.';
comment on column public.negocios.alta_paso is
  'En qué paso del alta quedó, de 1 a 4. Se guarda porque el paso 3 no deja rastro en los datos.';
comment on column public.negocios.alta_completada_en is
  'Cuándo terminó el alta. Nulo: el panel abre en el alta.';
comment on column public.negocios.rubro_bloqueado_en is
  'Cuándo quedó fijo el rubro. Cambiarlo después reinicia el catálogo y lo hace el equipo.';
