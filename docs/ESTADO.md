# Estado de MiPuesto — 2026-11-18

Cómo está el proyecto hoy, en una pantalla. El detalle y la evidencia de cada
cosa están en `docs/AVANCE.md`; los controles, en `SECURITY.md`. **Este archivo
se reescribe —no se le agrega— al cerrar cada tramo**, para que nunca diga algo
que ya no es cierto.

## Dónde corre

| | |
|---|---|
| Producción | `https://mi-puesto.com` (Cloudflare Workers). La dirección anterior, `mipuesto-dev.mipuesto-app.workers.dev`, y `www` redirigen con 308 |
| Base de producción | Supabase `afhnxjdqaruwccgsdxzb` (São Paulo) |
| Base de ensayo | Supabase `hwirzxnoyuuqgbwipiff` — recibe copias de los respaldos. Contraseña de `ENSAYO_DB_URL` renovada el 2026-11-18; al día hasta `20261121090000` |
| Última migración aplicada en producción | `20261120090000`, la segunda de la auditoría (lo dice `supabase migration list --linked`) |
| Migraciones en el repositorio, sin aplicar | `20261121090000`, productos sin precio (fase 14). **Probada en ensayo** |
| Pruebas | 1613 en `npm run verificar`, en la rama `fase-14-productos-sin-precio` |

## Cómo se despliega

1. **Primero la migración**: `npm run supabase:push` (aplica y regenera los tipos).
2. **Después el código**: empujar a `main`. Workers Builds corre `verificar`,
   compila y despliega solo. Antes de desplegar, `predeploy:vinext` le pregunta
   a `/api/salud` qué migración tiene la base y **frena si falta alguna**.
3. Al cierre de cada fase: `npm run test:rls:linked`, que desde el 2026-11-15
   empieza por comprobar que el registro de usuarios esté cerrado.

Los cambios a producción (`supabase:push`, `deploy`, la configuración del
vigilante) los corre el dueño: el agente los prepara y los verifica.

## Qué hay en producción

- Catálogo público con **un solo diseño** (plantilla MiPuesto), **tres formas de
  tarjeta** y **dieciséis paletas**, a elección del dueño. Dos banners, el
  superior y el inferior.
- Tres modalidades: catálogo, acción por producto, y carrito con reserva
  temporal. El carrito puede pedir **notas del pedido**, detrás de un
  interruptor del negocio.
- Rubros con su preset —los últimos, mochilas y cosméticos—; la categoría
  declara sus campos; presentaciones y tallas. El estado de un producto sigue a
  sus existencias en la base.
- **Prueba gratis de quince días**: todo negocio nace en el plan `prueba`, con
  15 productos y 5 lecturas con IA en total. El primer pago lo pasa al plan
  Catálogo.
- Agenda de citas con cupos, horarios y reintento seguro.
- Directorio por ciudad y zona, con negocios «En mi local» y «Sin local». El
  punto exacto de un local nunca se publica.
- Etiquetas QR y NFC (`/t/CODIGO`), panel de plataforma con segundo factor
  exigido también en la base, ajuste masivo de precios todo o nada.
- Lectura de fotos, listas y PDF con Gemini, con el cupo del plan a la vista en
  cada lugar que lo gasta.
- Turnstile en pedidos y reservas.
- **«Aprende»**: videos cortos de cómo usar el panel, desde el balde R2
  `mipuesto-tutoriales`, entregados por partes por la entrada del Worker.
- La portada de cada catálogo se guarda un minuto en la caché de Workers.
- Los correos de invitación y de contraseña llevan la marca
  (`supabase/templates/`).

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

1. **Cerrar la auditoría de seguridad del 2026-11-15** (`SECURITY.md`). La
   base ya está: el registro está cerrado (`test:registro:linked` pasa), las
   dos migraciones están en producción y `test:alta-columnas:ensayo` y
   `test:visitante:ensayo` pasan en ensayo. **Falta el código**: la rama
   `auditoria-seguridad-2026-11-15` no se unió a `main`. `ensayo:estructura`
   sin archivo falla por la herramienta y no por la base: con `--db-url`, el
   pooler no acepta las varias sentencias de `fase2-audit.sql` en una
   consulta; el mismo archivo pasa contra producción con `--linked`.
2. **Fase 14, productos sin precio** (`docs/plan/11-PRODUCTOS-SIN-PRECIO.md`):
   pasos 1 a 6 hechos en la rama `fase-14-productos-sin-precio`, que sale de
   la de la auditoría. Falta aplicar `20261121090000` a producción, después
   el código, y la prueba a mano con el PDF de Ferrovolt (paso 7).
3. **Workers Paid** (5 dólares al mes), antes del piloto. Con el plan gratuito,
   un catálogo que se arma en cada visita pasa los 10 ms de CPU; la portada
   guardada un minuto lo alivia y no lo resuelve.
4. **Lo que se movía con el dominio**: esta auditoría comprobó que
   `mi-puesto.com` responde y que la dirección anterior redirige. No comprobó
   el resto de la lista —las direcciones de Supabase Auth, el permiso de
   Turnstile, el vigilante (`--sitio` y `--catalogo`) y la variable `SITIO_URL`
   de GitHub—.
5. **Alerta de errores 5xx** en Cloudflare, con el plan pago.
6. **Piloto de siete días** con dos o tres negocios reales.
