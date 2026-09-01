# Registro de avance y auditorías — MiPuesto

Este archivo conserva el estado verificable del proyecto. Se actualiza al iniciar y cerrar cada fase.

## Estado actual

- Fase en curso: **Fase 0 — Setup e infraestructura**
- Inicio: 2026-09-01
- Estado: en ejecución
- Puerta de salida: compilar, conectar Supabase con datos seed y desplegar una URL de prueba.

## Decisiones registradas

### ADR-001 — Desarrollo local reproducible

- Se fija Node.js 22.23.1, compatible con Next.js 16.
- Las dependencias directas quedan fijadas sin rangos y se versiona `package-lock.json`.
- Supabase CLI se instala como dependencia de desarrollo del proyecto.

### ADR-002 — Clave pública de Supabase

- Se prefiere `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, recomendación vigente de Supabase.
- Se acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY` como compatibilidad temporal con el planning.
- La clave de rol de servicio nunca se expone con prefijo `NEXT_PUBLIC_`.

### ADR-003 — Cloudflare Pages y Next.js

- El planning indica Cloudflare Pages.
- La documentación vigente reserva Pages para exportaciones estáticas y dirige Next.js dinámico a Workers.
- MiPuesto requiere servidor para Auth, validación y recálculo de pedidos; no se fuerza una exportación estática.
- `vinext check` confirmó compatibilidad funcional: 2/2 imports, App Router, página, layout y Route Handler soportados; el único ajuste requerido era ESM.
- Se adopta vinext `1.0.0-beta.8` con Workers Cache, sin KV, Cloudflare Images ni funciones experimentales. Next.js estándar se conserva en paralelo mientras vinext permanezca beta.
- El Worker de desarrollo se llama `mipuesto-dev`, usa fecha de compatibilidad `2026-09-01`, `nodejs_compat` y observabilidad.

### ADR-004 — Supabase remoto como entorno de desarrollo

- Docker se difiere porque la unidad C: tiene solo 2,9 GB libres.
- Se usará un proyecto remoto independiente llamado `mipuesto-dev`; nunca se reutilizará `yapabot-dev`.
- Región recomendada: São Paulo (`sa-east-1`), la opción disponible más cercana a Bolivia.
- El seed se permite solo en este proyecto de desarrollo. Producción no recibirá datos de prueba.
- Lint y la auditoría SQL remota se ejecutarán con `--linked` al final de cada fase.
- `supabase test db --linked` todavía requiere Docker para levantar el runner de pgTAP; mientras Docker siga diferido, `npm run test:rls:linked` valida las mismas invariantes directamente en la base remota y falla ante cualquier incumplimiento.

## Auditoría de Fase 0

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| `.env.local` ignorado desde el primer commit | Cumplido | `git check-ignore -v .env.local` apunta a `.gitignore`. |
| No hay claves en el historial Git | Cumplido | No se encontraron asignaciones con valor ni JWT en archivos o historial. |
| Clave privilegiada ausente del cliente | Cumplido | El control revisa código y bundles cliente de Next/vinext; se ejecuta en lint, prebuild y postbuild de Workers. |
| RLS habilitado en todas las tablas | Cumplido | Auditoría remota: 7/7 tablas con RLS y políticas; permisos sensibles y función administrativa verificados. |
| Seed con tres modalidades | Cumplido | Auditoría remota: 3 negocios y las 3 modalidades presentes. |
| Build y pruebas locales | Cumplido | Next.js y vinext compilan; lint, TypeScript, Vitest, dry-run y chequeo de arranque pasaron el 2026-09-01. |
| Deploy de prueba | Cumplido | `https://mipuesto-dev.tienda-blanco.workers.dev` respondió HTTP 200; el endpoint de salud confirmó Supabase. |
| Proyecto Supabase remoto independiente | Cumplido | `mipuesto-dev` (`afhnxjdqaruwccgsdxzb`) enlazado en `sa-east-1`; `yapabot-dev` permanece fuera de alcance. |
| Conexión de la aplicación | Cumplido | `.env.local` configurado; `/api/salud/supabase` respondió HTTP 200 con estado `ok`. |
| Asesores de Supabase | Cumplido con limitación | Sin errores. La única advertencia de seguridad restante es la protección de contraseñas filtradas, disponible desde el plan Pro. |

## Pendientes manuales previstos

- Docker queda opcional y diferido hasta disponer de más espacio en C:.
- Conectar `jonathan512439/SaaS_MiPuesto` al Worker existente en Workers Builds y verificar un despliegue automático desde `main`.
- Registrar `NEXT_PUBLIC_SITE_URL` en las variables de build y runtime con la URL `workers.dev` ya asignada.

## Registro de verificaciones

### 2026-09-01

- Node.js `22.23.1`, npm `10.9.8` y Supabase CLI `2.116.0` detectados.
- Dependencias directas fijadas; `npm audit` informó 0 vulnerabilidades.
- ESLint y TypeScript se ajustaron a versiones compatibles con el toolchain de Next.js.
- `npm run lint`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run test`: aprobado, todavía sin pruebas unitarias de lógica de negocio.
- `npm run build`: aprobado; `/` estática y `/api/salud/supabase` dinámica.
- `npx supabase start`: bloqueado porque Docker/Podman no está instalado.
- Verificación HTTP local: `/` respondió 200; salud de Supabase respondió 503 `sin_configurar`, como corresponde sin `.env.local`.
- Next.js 16 añadió a `AGENTS.md` su bloque administrado sin alterar las reglas originales; se conserva para usar documentación versionada.
- Commits: `21391e9` (base Next.js), `faeb0f7` (esquema y RLS), `cc2c558` (registro y pasos manuales).
- Se detectó `yapabot-dev` en la cuenta Supabase y se dejó explícitamente fuera del alcance.
- La migración se adaptó al cambio de Data API de 2026 con permisos explícitos para `anon`, `authenticated` y `service_role`.
- `mipuesto-dev` quedó enlazado y recibió las migraciones `20260901085203` y `20260901143000`, además del seed idempotente.
- `npm run db:lint:linked`: aprobado, sin errores de esquema.
- `npm run test:rls:linked`: aprobado; 7 tablas con RLS, 7 con políticas, 6 índices de FK agregados, 3 negocios y 3 modalidades.
- Los asesores dejaron de reportar claves foráneas sin índice y funciones `SECURITY DEFINER` expuestas.
- Tipos TypeScript generados desde el esquema remoto e integrados en los clientes de navegador y servidor.
- Validación posterior al enlace: secretos de cliente, ESLint, TypeScript, Vitest y build aprobados.
- Conexión real desde Next.js validada: `GET /api/salud/supabase` respondió HTTP 200 con `{"estado":"ok","servicio":"supabase"}`; la clave de servicio permanece vacía.
- Repositorio GitHub vinculado y ramas `main` y `fase-1-sistema-diseno` publicadas sin `.env.local` ni secretos.
- `vinext check`: el informe inicial fue 89 % por faltar ESM; después de `vinext init`, la comprobación final alcanzó 100 % (8 soportados, 0 parciales, 0 problemas).
- `npm run build:vinext`: aprobado; el control posterior confirmó que el bundle cliente no contiene la clave privilegiada.
- Worker local: `/` respondió HTTP 200 y `/api/salud/supabase` respondió HTTP 200 con estado `ok`.
- `wrangler deploy --dry-run`: aprobado; 928 KiB totales y 266,65 KiB comprimidos.
- `wrangler check startup`: aprobado; 74,2 ms de CPU activa en la medición local.
- Auditoría final repetida: lint, TypeScript, Vitest, build Next.js, build vinext, DB lint y RLS remoto aprobados.
- Primer despliegue real completado en `https://mipuesto-dev.tienda-blanco.workers.dev`; portada y salud de Supabase respondieron HTTP 200.
- Se cargaron en runtime únicamente `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; ninguna clave de servicio fue enviada a Cloudflare.
