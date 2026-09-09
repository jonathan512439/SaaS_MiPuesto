# MiPuesto

SaaS de catálogos digitales para negocios locales de Bolivia. Los pedidos se cierran por
WhatsApp.

**El plan vigente está en [`docs/plan/`](docs/plan/README.md).** Empezá por su `README.md`.
Si sos un agente de código, empezá por [`PROMPT-MAESTRO.md`](PROMPT-MAESTRO.md).

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

```
npm run lint
npm run typecheck
npm test
npm run build:vinext
npm run test:rls:linked   # al cierre de cada fase
```

## Documentación

| Archivo | Para qué |
|---|---|
| [`docs/plan/`](docs/plan/README.md) | El plan de proyecto: visión, datos, backend, frontend, fases y pruebas |
| [`AGENTS.md`](AGENTS.md) | Convenciones de código |
| [`DESIGN.md`](DESIGN.md) | Dirección visual |
| [`SECURITY.md`](SECURITY.md) | Controles de seguridad y auditorías |
| [`docs/AVANCE.md`](docs/AVANCE.md) | Estado, decisiones y registro histórico |
| [`docs/RESPALDOS.md`](docs/RESPALDOS.md) | Respaldos y ensayo de restauración |
| [`docs/CONFIGURACION-MANUAL.md`](docs/CONFIGURACION-MANUAL.md) | Lo que solo puede hacer el dueño |
| [`docs/PRUEBAS-LANZAMIENTO.md`](docs/PRUEBAS-LANZAMIENTO.md) | Checklist manual antes de cerrar una fase |
| [`docs/RLS-POLITICAS.md`](docs/RLS-POLITICAS.md) | Políticas de aislamiento entre negocios |
