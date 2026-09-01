# MiPuesto

SaaS de catálogos digitales para negocios locales de Bolivia. El proyecto se desarrolla por fases según `planning-mipuesto-v2.md`.

## Requisitos

- Node.js 22.23.1 (o una versión compatible con `package.json`)
- npm
- Docker Desktop para la pila local de Supabase

## Preparación local

1. Ejecutá `npm install`.
2. Copiá `.env.example` como `.env.local` y completá las variables.
3. Con Docker Desktop iniciado, ejecutá `npm run supabase:start`.
4. Ejecutá `npm run dev`.
5. Abrí `http://localhost:3000/api/salud/supabase` para verificar la conexión.

## Verificaciones

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

El estado de fases, decisiones y auditorías se conserva en `docs/AVANCE.md`.
