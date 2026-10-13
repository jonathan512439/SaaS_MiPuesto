# Estado de MiPuesto — 2026-10-13

Cómo está el proyecto hoy, en una pantalla. El detalle y la evidencia de cada
cosa están en `docs/AVANCE.md`; los controles, en `SECURITY.md`. **Este archivo
se reescribe —no se le agrega— al cerrar cada tramo**, para que nunca diga algo
que ya no es cierto.

## Dónde corre

| | |
|---|---|
| Producción | `https://mipuesto-dev.mipuesto-app.workers.dev` (Cloudflare Workers, plan gratuito) |
| Base de producción | Supabase `afhnxjdqaruwccgsdxzb` (São Paulo) |
| Base de ensayo | Supabase `hwirzxnoyuuqgbwipiff` — recibe copias de los respaldos; credenciales rotadas el 2026-10-13 |
| Dominio propio | Ninguno todavía. Será `mi-puesto.com`, con guion |
| Última migración | `20261108090000` |
| Pruebas | 1226 en `npm run verificar` |

## Cómo se despliega

1. **Primero la migración**: `npm run supabase:push` (aplica y regenera los tipos).
2. **Después el código**: empujar a `main`. Workers Builds corre `verificar`,
   compila y despliega solo. Antes de desplegar, `predeploy:vinext` le pregunta
   a `/api/salud` qué migración tiene la base y **frena si falta alguna**.
3. Al cierre de cada fase: `npm run test:rls:linked`.

Los cambios a producción (`supabase:push`, `deploy`, la configuración del
vigilante) los corre el dueño: el agente los prepara y los verifica.

## Qué hay en producción

- Catálogo público con **un solo diseño** (plantilla MiPuesto), **tres formas de
  tarjeta** y **dieciséis paletas**, a elección del dueño.
- Tres modalidades: catálogo, acción por producto, y carrito con reserva temporal.
- Rubros con su preset; la categoría declara sus campos; presentaciones y tallas.
- Agenda de citas con cupos, horarios y reintento seguro.
- Directorio por ciudad y zona, con negocios «En mi local» y «Sin local». El
  punto exacto de un local nunca se publica.
- Etiquetas QR y NFC (`/t/CODIGO`), panel de plataforma con segundo factor,
  lectura de fotos con Gemini, ajuste masivo de precios todo o nada.
- Turnstile en `exigir` en pedidos y reservas.

## Quién vigila qué

| Qué | Cada cuánto | Avisa por |
|---|---|---|
| Vigilante en la base: `/api/salud` y el catálogo testigo `/kantuta-moda` | 5 minutos | ntfy, a la segunda falla seguida |
| `vigilar-salud.yml`, desde GitHub, por si cae Supabase entero | diario | correo de GitHub |
| Respaldo de la base a R2 (`respaldo.yml`) | diario, 07:00 UTC | correo de GitHub si falla |
| Revisión de archivos de Storage (`revisar-archivos.yml`) | lunes, 9:00 en La Paz | correo de GitHub si hay una foto rota |
| `verificar.yml`: tipos, lint y pruebas | cada empuje a `main` | correo de GitHub |

**El catálogo testigo tiene que tener siempre productos y el plan al día**: si
se vacía, el vigilante avisa.

## Lo que falta, en orden

1. **Workers Paid** (5 dólares al mes), antes del piloto. El CPU medido —P50
   7,7 ms, P90 15,8 ms— pasa los 10 ms del plan gratuito en una de cada cuatro
   visitas.
2. **Averiguar por qué un negocio perdía la modalidad al crearse.** La
   limpieza de demostración se hizo el 2026-10-13: se borró `brasa-urbana` (la
   copia sin pedidos; queda `brasaurbana`) con sus 14 archivos, los 3 banners
   sin uso, y el alimento de cachorro de Huellitas tiene stock. Las tiendas de
   prueba siguen con el WhatsApp del dueño, a propósito.
3. **Probar en un teléfono real** un catálogo grande, con datos móviles.
4. **Dominio `mi-puesto.com`**: conectarlo al Worker y mover todo lo que apunta a
   la dirección de hoy —`NEXT_PUBLIC_SITE_URL` del build, las direcciones de
   Supabase Auth, el permiso de Turnstile para el dominio nuevo, el vigilante
   (`--sitio` y `--catalogo`), la variable `SITIO_URL` de GitHub— y recién ahí
   imprimir QR y grabar etiquetas NFC.
5. **Alerta de errores 5xx** en Cloudflare, con el plan pago y el dominio.
6. **Piloto de siete días** con dos o tres negocios reales.
