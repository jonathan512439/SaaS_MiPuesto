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
- El adaptador se decidirá tras una prueba de compatibilidad. Por ahora se conserva Next.js estándar y portable.

## Auditoría de Fase 0

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| `.env.local` ignorado desde el primer commit | Cumplido | `git check-ignore -v .env.local` apunta a `.gitignore`. |
| No hay claves en el historial Git | Cumplido provisional | La auditoría no encontró coincidencias; repetir al cerrar la fase. |
| Clave privilegiada ausente del cliente | Cumplido | `npm run lint` y `npm run build` ejecutaron el control correctamente. |
| RLS habilitado en todas las tablas | Pendiente de ejecución | Migración y prueba pgTAP creadas; falta Docker para aplicarlas. |
| Seed con tres modalidades | Pendiente de ejecución | `seed.sql` contiene tres negocios; falta Docker para cargarlo. |
| Build y pruebas locales | Cumplido | Lint, TypeScript, Vitest y build pasaron el 2026-09-01. |
| Deploy de prueba | Pendiente manual | Requiere cuenta y repositorio remoto conectados a Cloudflare. |

## Pendientes manuales previstos

- Instalar e iniciar Docker Desktop para ejecutar Supabase localmente.
- Crear o seleccionar un proyecto remoto de Supabase y completar `.env.local`.
- Crear un repositorio remoto y conectar el despliegue de Cloudflare.

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
