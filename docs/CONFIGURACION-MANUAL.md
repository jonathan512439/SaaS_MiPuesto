# Configuración manual de Fase 0

Estos pasos requieren acceso a cuentas, credenciales o software del equipo y no deben automatizarse sin supervisión.

## 1. Instalar Docker Desktop

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

## 2. Completar el entorno local

Después de iniciar Supabase local, ejecutá `npx supabase status -o env`. Copiá `.env.example` como `.env.local` y completá:

- `NEXT_PUBLIC_SUPABASE_URL`: URL local mostrada por la CLI.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública/publishable. Si la salida local solo muestra una clave `anon`, podés usar temporalmente `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`: clave local de servicio, solo para código servidor futuro.
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

No compartás ni commiteés `.env.local`.

Luego ejecutá `npm run dev` y abrí <http://localhost:3000/api/salud/supabase>. Debe responder `{"estado":"ok","servicio":"supabase"}`.

## 3. Crear y vincular Supabase remoto

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
7. Obtené la URL y clave publishable desde **Connect** en Supabase y completá `.env.local`.

La verificación de email, contraseña mínima y recuperación se configurarán y auditarán en la Fase 2.

## 4. Publicar el repositorio Git

1. Creá un repositorio privado vacío en GitHub o GitLab.
2. Agregá el remoto: `git remote add origin URL_DEL_REPOSITORIO`.
3. Verificá: `git remote -v`.
4. Publicá: `git push -u origin main`.

No agregués `.env.local`, claves de Supabase ni tokens de Cloudflare al repositorio.

## 5. Decidir y conectar Cloudflare

Cloudflare Pages solo admite Next.js mediante exportación estática. MiPuesto necesita servidor para Auth, validaciones y pedidos, por lo que la ruta vigente es **Cloudflare Workers**.

Antes de agregar el adaptador se debe aprobar esta desviación del planning. La opción recomendada por Cloudflare para proyectos nuevos es vinext, actualmente beta. Cuando se apruebe:

1. Ejecutar la comprobación de compatibilidad de vinext.
2. Revisar el informe antes de instalar o migrar.
3. Generar la configuración de Workers y verificar el build local.
4. En Cloudflare, ir a **Workers & Pages → Create application → Import a repository**.
5. Conectar el repositorio y la rama `main`.
6. Agregar las variables públicas como variables de build y runtime. La clave de servicio, si llegara a usarse, debe ser un secreto de runtime, nunca una variable pública.
7. Confirmar el deploy en el subdominio `workers.dev` antes de conectar `mipuesto.com`.

Referencias vigentes:

- <https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/>
- <https://developers.cloudflare.com/workers/ci-cd/builds/>
