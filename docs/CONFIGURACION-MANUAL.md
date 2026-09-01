# Configuración manual de Fase 0

Estos pasos requieren acceso a cuentas, credenciales o software del equipo y no deben automatizarse sin supervisión.

## 1. Instalar Docker Desktop (opcional y diferido)

Supabase local necesita Docker Desktop o Podman. En Windows:

1. Instalá Docker Desktop desde <https://docs.docker.com/desktop/setup/install/windows-install/>.
2. Usá el motor WSL 2 cuando el instalador lo ofrezca.
3. Reiniciá la terminal y abrí Docker Desktop.
4. Verificá con `docker --version` y `docker info`.
5. Desde la raíz de MiPuesto, ejecutá:

```powershell
npm run supabase:start
npm run supabase:reset
npm run db:lint
npm run test:rls
```

`supabase:reset` elimina y reconstruye únicamente la base local. No uses `--linked` para esta comprobación.

Esta ruta no es necesaria por ahora: el desarrollo usa el proyecto remoto independiente `mipuesto-dev` para ahorrar espacio en C:.

## 2. Completar el entorno local con `mipuesto-dev`

Estado: **completado el 2026-09-01**. La ruta `/api/salud/supabase` respondió HTTP 200 y confirmó la conexión.

`.env.local` ya fue creado, está ignorado por Git y tiene la URL de `mipuesto-dev`. Desde **Connect** en el panel de Supabase, copiá únicamente la clave Publishable y pegala en:

```dotenv
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=PEGAR_AQUI
```

Dejá `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` vacías en esta fase. No compartás ni commiteés `.env.local`.

Luego ejecutá `npm run dev` y abrí <http://localhost:3000/api/salud/supabase>. Debe responder `{"estado":"ok","servicio":"supabase"}`.

Si más adelante se activa Supabase local, ejecutá `npx supabase status -o env` y reemplazá temporalmente:

- `NEXT_PUBLIC_SUPABASE_URL`: URL local mostrada por la CLI.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública/publishable. Si la salida local solo muestra una clave `anon`, podés usar temporalmente `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`: clave local de servicio, solo para código servidor futuro.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

## 3. Crear y vincular Supabase remoto

Estado: **completado el 2026-09-01**. El proyecto vinculado es `mipuesto-dev` (`afhnxjdqaruwccgsdxzb`) en `sa-east-1`.

1. Creá un proyecto desde <https://supabase.com/dashboard> con estos datos:
   - Organización: `JC-Dev`.
   - Nombre: `mipuesto-dev`.
   - Región: **South America (São Paulo)** / `sa-east-1`.
   - Plan: Free.
   - Contraseña de base: generá una nueva y guardala en un gestor seguro. No la compartás por chat ni la guardés en el repositorio.
   - Si aparece “Automatically expose new tables”, dejalo desactivado; la migración declara cada permiso explícitamente.
   - Si aparece “Enable RLS by default”, dejalo activado.
2. Ejecutá `npx supabase login` y completá el flujo del navegador.
3. Copiá el identificador del proyecto y ejecutá `npx supabase link --project-ref ID_DEL_PROYECTO`.
4. Previsualizá las migraciones con `npm run supabase:push:dry`.
5. Si el resultado es correcto, aplicá migración y seed con `npm run supabase:push:dev`.
6. Ejecutá `npm run db:lint:linked` y `npm run test:rls:linked`.
7. Obtené la clave Publishable desde **Connect** en Supabase y completá `.env.local` según la sección 2.

La verificación de email, contraseña mínima y recuperación se configurarán y auditarán en la Fase 2.

El asesor de seguridad muestra `Leaked Password Protection Disabled`. No es un error del esquema: esa función requiere el plan Pro. En Free se mantiene registrada como limitación aceptada y en Fase 2 se configurará una contraseña mínima robusta.

## 4. Publicar el repositorio Git

Estado: **completado el 2026-09-01**. El remoto es `https://github.com/jonathan512439/SaaS_MiPuesto.git`; `main` y `fase-1-sistema-diseno` están publicadas.

1. Creá un repositorio privado vacío en GitHub o GitLab.
2. Agregá el remoto: `git remote add origin URL_DEL_REPOSITORIO`.
3. Verificá: `git remote -v`.
4. Publicá: `git push -u origin main`.

No agregués `.env.local`, claves de Supabase ni tokens de Cloudflare al repositorio.

## 5. Decidir y conectar Cloudflare

Cloudflare Pages solo admite Next.js mediante exportación estática. MiPuesto necesita servidor para Auth, validaciones y pedidos, por lo que la ruta vigente es **Cloudflare Workers**.

Estado automatizable: **completado el 2026-09-01**. El Worker está publicado en `https://mipuesto-dev.tienda-blanco.workers.dev`; la portada y la conexión con Supabase respondieron HTTP 200. Falta conectar el repositorio para que cada push despliegue automáticamente:

1. Entrá a <https://dash.cloudflare.com/> y abrí **Workers & Pages**.
2. Abrí el Worker existente **mipuesto-dev**, entrá a **Settings → Build** y elegí la opción para conectar un repositorio. Autorizá GitHub si lo solicita.
3. Seleccioná `jonathan512439/SaaS_MiPuesto` y configurá:
   - Rama de producción: `main`.
   - Directorio raíz: `/` o vacío.
   - Comando de build: `npm run build:vinext`.
   - Comando de deploy: `npm run deploy:vinext`.
4. En **Settings → Build → Build variables and secrets**, agregá:
   - `NEXT_PUBLIC_SUPABASE_URL`: la URL de `mipuesto-dev`.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: la clave Publishable de `mipuesto-dev`.
   - `NEXT_PUBLIC_SITE_URL`: `https://mipuesto-dev.tienda-blanco.workers.dev`.
5. Las dos variables de Supabase ya están cargadas en **Settings → Variables & Secrets** del Worker. Agregá allí únicamente `NEXT_PUBLIC_SITE_URL` con la URL anterior. No agregués `SUPABASE_SERVICE_ROLE_KEY`: no se usa en esta fase.
6. Guardá y ejecutá **Retry deployment** para probar el flujo automático desde GitHub.
7. Abrí la URL asignada y comprobá:
   - `/` carga MiPuesto sin errores visibles.
   - `/api/salud/supabase` devuelve `{"estado":"ok","servicio":"supabase"}`.
   - En **Observability → Logs** no aparecen errores durante ambas visitas.
8. Copiá la URL exacta del despliegue y comunicala para registrar la evidencia y cerrar formalmente la Fase 0.

`.node-version` fija Node.js `22.23.1`. El deploy usa `--keep-vars` para conservar las variables de runtime administradas desde el panel.

Referencias vigentes:

- <https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/>
- <https://developers.cloudflare.com/workers/ci-cd/builds/>
