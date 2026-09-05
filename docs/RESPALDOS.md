# Respaldos y restauración

Escrito el 2026-09-05, al cerrar la etapa 5 del plan de crecimiento.

## Qué se respalda y qué no

| | Estado |
|---|---|
| **Base de datos** — negocios, productos, pedidos, promociones, suscripciones | **Automático, diario** |
| **Fotografías** — logo, portada, QR y fotos de producto | **No respaldado todavía** |

La base es lo irreemplazable: si se pierde, se pierden los pedidos, los precios
y hasta cuándo pagó cada negocio. Las fotografías son recuperables pidiéndoselas
al dueño, con molestia pero sin pérdida definitiva. Por eso se automatizó
primero la base.

**El respaldo de fotografías queda pendiente y conviene no olvidarlo**: un dueño
que subió 300 fotos desde su celular hace seis meses probablemente ya no las
tenga. La opción más simple cuando se encare es sincronizar el depósito de
Supabase a R2 con un cliente compatible con S3, en el mismo flujo diario.

## Cómo funciona

`.github/workflows/respaldo.yml` corre todos los días a las **07:00 UTC** —03:00
en Bolivia—. Esa hora es a propósito: es **antes** de la purga de analítica
(08:30) y del corte por vencimiento (09:00), así que el respaldo del día refleja
el estado previo a cualquier borrado automático.

Usa `pg_dump` directo y no `supabase db dump`, que exige Docker. El cliente se
instala en la misma versión del servidor —Postgres 17— porque un `pg_dump` más
viejo se niega a volcar una base más nueva.

Antes de subir comprueba que los archivos pesen algo: un volcado de cero bytes
sube igual y da una falsa sensación de respaldo.

Genera dos archivos y los sube a R2 bajo la fecha del día:

- `respaldo-esquema.sql.gz` — la estructura
- `respaldo-datos.sql.gz` — el contenido

Se guardan separados porque restaurar solo los datos sobre un esquema sano es lo
que se necesita el 90 % de las veces.

## Lo que hay que configurar una sola vez

Nada de esto se puede hacer desde el repositorio; son pasos en las consolas.

### 1. Crear el balde en Cloudflare R2

Un balde privado, por ejemplo `mipuesto-respaldos`. R2 no cobra por salida de
datos y el plan gratuito cubre 10 GB, muy por encima de lo que estos volcados
ocupan.

### 2. Cargar los secretos en GitHub

En **Settings → Secrets and variables → Actions**:

| Secreto | De dónde sale |
|---|---|
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connection string (modo *session*) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens, con permiso de edición sobre R2 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Workers → Overview, a la derecha |

Y como **variable** (no secreto):

| Variable | Valor |
|---|---|
| `R2_BUCKET_RESPALDOS` | el nombre del balde, por ejemplo `mipuesto-respaldos` |

### 3. Correrlo a mano una vez

En **Actions → Respaldo diario de la base → Run workflow**. Si termina en verde,
la automatización quedó andando.

## El ensayo de restauración

**Un respaldo que nunca se restauró no es un respaldo.** Conviene hacer este
ensayo una vez ahora y repetirlo cada tanto.

No se restaura sobre la base real. Se crea un proyecto Supabase aparte —el plan
gratuito permite dos— y se prueba ahí:

```bash
# 1. Bajar el respaldo del día desde R2
npx wrangler r2 object get mipuesto-respaldos/2026-09-05/respaldo-esquema.sql.gz \
  --file esquema.sql.gz --remote
npx wrangler r2 object get mipuesto-respaldos/2026-09-05/respaldo-datos.sql.gz \
  --file datos.sql.gz --remote
gunzip esquema.sql.gz datos.sql.gz

# 2. Restaurar en el proyecto de prueba, en este orden
psql "<URL_DEL_PROYECTO_DE_PRUEBA>" -f esquema.sql
psql "<URL_DEL_PROYECTO_DE_PRUEBA>" -f datos.sql
```

Y se compara con la base real de un comando:

```bash
RESTAURADO_URL=https://<proyecto-de-prueba>.supabase.co RESTAURADO_KEY=<clave de servicio de ese proyecto> npm run respaldo:verificar
```

Imprime tabla por tabla cuántas filas hay en cada lado. Se admite que el
restaurado tenga **menos** —el respaldo es de ayer y la base real siguió
recibiendo pedidos—; lo que no se admite es una tabla vacía cuando la real tiene
contenido, y eso el comando lo marca y termina con error.

Se da por bueno cuando, además:

- Un catálogo se ve completo apuntando la aplicación a ese proyecto.
- Las políticas de RLS siguen en pie: `npm run test:rls:linked` pasa.

Anotá la fecha del último ensayo acá abajo. Un respaldo sin ensayo reciente es
una promesa, no una garantía.

| Fecha del ensayo | Resultado |
|---|---|
| — | pendiente |

## Qué hacer si hay que restaurar de verdad

1. **No borrar nada primero.** Renombrar o dejar la base dañada como está: puede
   contener datos posteriores al último respaldo que valga la pena rescatar.
2. Restaurar en un proyecto nuevo y verificar con la lista de arriba.
3. Recién entonces cambiar `NEXT_PUBLIC_SUPABASE_URL` y las claves en Cloudflare.
4. Avisar a los negocios afectados qué período se perdió. El respaldo es diario,
   así que la pérdida máxima es de un día.
