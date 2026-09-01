# MiPuesto — Instrucciones para agentes de código

## Orden de lectura obligatorio
1. `PROMPT-MAESTRO.md` — punto de entrada y reglas de trabajo
2. Este archivo — convenciones de código
3. `DESIGN.md` — antes de escribir cualquier interfaz
4. `SECURITY.md` — controles por fase, parte del criterio de aceptación
5. `planning-mipuesto-v2.md` — las 9 fases

## Producto
SaaS de catálogos digitales para negocios locales en Bolivia (restaurantes, tiendas, dentistas, barberías). Los pedidos se cierran por WhatsApp. No hay pasarela de pago. Moneda: bolivianos (Bs). Zona horaria: `America/La_Paz`. Todo el texto de interfaz va en español boliviano natural.

## Stack
Next.js (App Router, TypeScript, Tailwind) + Supabase (DB, Auth, Storage) + Cloudflare Pages. Pruebas con Vitest.

## Convenciones de código
- Todo el acceso a datos pasa por los clientes de `lib/supabase/`, nunca fetch directo a la REST API.
- Cada tabla nueva necesita su política RLS en la misma migración que la crea.
- Los componentes de `components/templates/` reciben datos por props y nunca hacen fetch propio.
- Toda la lógica de precios y descuentos vive en `lib/precios.ts`. No la dupliques en componentes.
- Comprimí y validá imágenes en el cliente antes de subir (`lib/imagenes.ts`).
- Al borrar o reemplazar una imagen, borrá también el archivo en Storage.
- Fechas: guardar en UTC, convertir a `America/La_Paz` solo al mostrar.
- Todo dato que venga del cliente se valida también en el servidor. Sin excepciones.
- Los totales de pedidos se recalculan en el servidor; nunca se confía en el valor que manda el navegador.
- Commits pequeños, uno por tarea de la fase en curso.

## Interfaz
- `DESIGN.md` gana sobre cualquier default de Tailwind o del framework.
- No introduzcas colores, tamaños de fuente ni espaciados fuera del sistema de tokens de la Fase 1.
- La lista de prohibiciones de `DESIGN.md` sección 3 es obligatoria, no orientativa.
- Mobile-first real, hasta 360 px de ancho.

## Pruebas
- Obligatorias y automáticas: políticas RLS, cálculo de precios y promociones, expiración de reservas, lógica de horario.
- El script de pruebas de RLS se corre al final de **cada** fase, no solo cuando se escribe.
- El resto se verifica manualmente con checklist antes de cerrar la fase.

## Qué no hacer
- No agregues dependencias nuevas sin justificarlo primero.
- No cambies el esquema de la base sin una migración versionada.
- No pongas `SUPABASE_SERVICE_ROLE_KEY` en código que llegue al cliente.
- No uses `select *` en consultas de datos públicos; nombrá las columnas.
- No avances a la siguiente fase si la actual no cumple su criterio de aceptación.
- No implementes lo que la sección final de `SECURITY.md` marca como prematuro.

## Cómo correr el proyecto
`npm run dev` — requiere `.env.local` con las variables de la sección 7 del planning.
`npm run test` — suite de pruebas.
`supabase/seed.sql` carga 3 negocios de prueba, uno por cada modalidad.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
