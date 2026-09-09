# MiPuesto — Instrucciones para agentes de código

## Orden de lectura obligatorio
1. `PROMPT-MAESTRO.md` — punto de entrada y reglas de trabajo
2. Este archivo — convenciones de código
3. `DESIGN.md` — antes de escribir cualquier interfaz
4. `SECURITY.md` — controles, parte del criterio de aceptación
5. `docs/plan/` — **el plan vigente**, en el orden de su `README.md`
6. `docs/AVANCE.md` — qué está cerrado y con qué evidencia

## Producto
SaaS de catálogos digitales para negocios locales en Bolivia. Los pedidos se cierran por
WhatsApp. No hay pasarela de pago. Moneda: bolivianos (Bs), con dólares donde el rubro lo
exige. Zona horaria: `America/La_Paz`. Todo el texto de interfaz va en español boliviano
natural.

## Stack
Next.js 16 (App Router, TypeScript) sobre Cloudflare Workers con vinext + Supabase
(Postgres 17, Auth, Storage). Módulos de CSS con tokens. Pruebas con Vitest.

## Convenciones de código
- Todo el acceso a datos pasa por los clientes de `lib/supabase/`, nunca `fetch` directo a
  PostgREST.
- **Nunca `select *`.** Las listas de columnas viven en `lib/catalogo/columnas.ts` y en
  ningún otro lado. Desde la fase 2 lo verifica `check-columnas.mjs`.
- Cada tabla nueva necesita su política RLS en la misma migración que la crea.
- **Toda tabla lleva `negocio_id`, y su coherencia se garantiza con clave foránea
  compuesta, no con disparador** (`docs/plan/01-MODELO-DE-DATOS.md` sección 2).
- Toda función de base es `security definer` con `set search_path = ''`.
- Los componentes de `components/templates/` reciben datos por props y nunca hacen fetch
  propio. Una pieza de `piezas/` no sabe en qué armazón está.
- **Toda la lógica de precios vive en `lib/precios.ts`.** No se duplica en componentes ni
  en rutas. Si un mecanismo nuevo quiere tocar el precio y no cabe ahí, el diseño está mal.
- Los totales de pedidos se recalculan en el servidor; nunca se confía en el navegador.
- Comprimí y validá imágenes en el cliente antes de subir (`lib/imagenes.ts`). Al borrar o
  reemplazar una imagen, borrá también el archivo en Storage.
- Fechas: guardar en UTC, convertir a `America/La_Paz` solo al mostrar.
- Todo dato del cliente se valida también en el servidor. Sin excepciones.
- Los topes —campos, variantes, escalas, fotos— van en la base con `check` o disparador,
  no solo en la ruta: la ruta se puede saltar con la clave privilegiada.
- Commits pequeños, uno por tarea de la fase en curso.

## Reglas de datos que no se rompen
- **El rubro oculta interfaz, nunca datos ni permisos.** Cambiar de rubro apaga botones.
- **Borrar una definición nunca borra un dato.** Quitar un campo de una categoría deja el
  valor guardado en el producto.
- **Una sola fuente de verdad para las existencias.** Si un producto tiene variantes, su
  `cantidad_stock` es `null` por restricción de la base.
- **Ninguna columna existente se borra ni cambia de tipo** sin que un negocio que hoy
  funciona siga funcionando con los valores por defecto.

## Interfaz
- `DESIGN.md` gana sobre cualquier default del framework.
- No introduzcas colores, tamaños de fuente ni espaciados fuera del sistema de tokens.
- La lista de prohibiciones de `DESIGN.md` sección 3 es obligatoria, no orientativa.
- Mobile-first real, hasta 360 px de ancho. Objetivo táctil mínimo 44 px.
- El color nunca es el único indicador de un estado.
- Filtros y paginación viven en la URL, no en estado local.
- El catálogo público se arma en el servidor. Solo cinco componentes llevan `"use client"`:
  carrito, filtros, selector de variante, galería y calendario.

## Pruebas
- Obligatorias y automáticas: políticas RLS, precios y promociones, expiración de
  reservas, horarios, disponibilidad de agenda, validadores.
- `npm run test:rls:linked` se corre al final de **cada** fase, sin excepción.
- Las pruebas de concurrencia corren contra la base de ensayo, nunca contra producción.
- **Toda guardia nueva se prueba rompiéndola a propósito** antes de darla por hecha.
- Sin pruebas de render de componentes: se validan a mano y con el control de contraste.

## Qué no hacer
- No agregues dependencias nuevas sin justificarlo primero por escrito.
- No cambies el esquema sin una migración versionada.
- No pongas `SUPABASE_SERVICE_ROLE_KEY` ni `GEMINI_API_KEY` en código que llegue al
  cliente.
- No avances a la siguiente fase si la actual no cumple su criterio de aceptación.
- No implementes lo que la sección final de `SECURITY.md` marca como prematuro.
- No crees una tabla para un solo rubro. Reusá un mecanismo o anotalo como excepción.
- No corras el seed contra la base enlazada: reescribiría los negocios reales.

## Cómo correr el proyecto
```
npm run dev              # requiere .env.local
npm test                 # contraste, tokens y unitarias
npm run typecheck
npm run lint
npm run build:vinext     # cerrá wrangler dev antes, o falla con EBUSY
npm run test:rls:linked
npm run types:db:linked  # después de cualquier migración
```

`supabase/seed.sql` carga negocios de prueba, uno por modalidad. **Solo contra la base
local.**

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
