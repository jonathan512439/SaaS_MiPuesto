-- Fase 10: el dueño elige cómo se ven sus productos.
--
-- Tres formas sobre un solo componente: la cuadrícula de hoy, una por fila con
-- miniatura, y una lista de precios sin foto. Es **un solo eje dentro de la
-- única plantilla**, no los tres ejes que la fase 6 podó —plantilla × tarjeta ×
-- paleta—, que rompían por combinaciones. El detalle y las reglas están en
-- `docs/plan/09-DIRECTORIO-Y-FORMAS.md`.
--
-- La lista vive también en `FORMAS_TARJETA` de `lib/apariencia.ts`, y una
-- prueba compara las dos: si se agrega una forma allá y no acá, la base rechaza
-- el guardado sin que nada lo avise.
alter table public.negocios
  add column forma_tarjeta text not null default 'cuadricula'
    check (forma_tarjeta in ('cuadricula', 'fila', 'lista_precios'));

comment on column public.negocios.forma_tarjeta is
  'Cómo se dibujan los productos en el catálogo: cuadricula, fila o lista_precios. Solo cambia el aspecto; lo que se puede hacer lo decide la modalidad.';

-- Los dos `select`, y no solo el `update`. Una columna sin `select` para `anon`
-- dejó el catálogo público entero sin cargar en la fase 7, y una sin `select`
-- para `authenticated` se llevó «Productos» en la fase 9.
grant select (forma_tarjeta) on table public.negocios to anon, authenticated;
grant update (forma_tarjeta) on table public.negocios to authenticated;
