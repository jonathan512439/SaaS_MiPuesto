# Plan técnico y de validación — Fase 9

## Alcance acordado

Completar el cierre operativo de MiPuesto sin conectar todavía el dominio
`mipuesto.com`. El dominio queda aplazado por decisión del propietario y no
bloquea la preparación del piloto en la URL actual de Cloudflare.

## Decisiones técnicas

- Mantener Supabase activo mediante una Edge Function propia invocada cada tres
  días por GitHub Actions. El cron es externo a Supabase y consume una fracción
  mínima de los minutos gratuitos del repositorio privado.
- La función acepta únicamente `POST`, compara un secreto independiente y hace
  una lectura mínima. No devuelve filas ni expone claves administrativas.
- La misma ejecución anonimiza nombre y teléfono de pedidos terminados con más
  de seis meses. La operación es idempotente y nunca modifica pedidos
  pendientes, importes, artículos ni datos de auditoría.
- No se añade una suite E2E: `SECURITY.md` la declara prematura. La lógica cara
  se cubre con Vitest y SQL; WhatsApp y el recorrido visual se comprueban en un
  celular real.
- No se agregan dependencias ni se cambia la interfaz durante esta fase.

## Archivos previstos

- `supabase/functions/ping-keepalive/index.ts`
- `supabase/config.toml`
- `.github/workflows/supabase-keepalive.yml`
- `scripts/configurar-keepalive.mjs`
- `supabase/tests/remote/fase9-audit.sql`
- `docs/AUDITORIA-FINAL.md`
- `docs/CONFIGURACION-MANUAL.md`
- `docs/AVANCE.md`

## Riesgos y controles

- **Abuso del endpoint:** secreto aleatorio de 256 bits, comparación mediante
  hash, método POST y respuesta sin datos.
- **Exposición de service role:** solo se usa la variable administrada por el
  runtime de Edge Functions; nunca se copia al workflow ni al cliente.
- **Pérdida de datos personales necesaria para pedidos abiertos:** solo se
  anonimizan estados terminales con antigüedad mayor a seis meses.
- **Falsa sensación de cierre:** el piloto de siete días y WhatsApp en celular
  quedan registrados como una ventana de observación real, no como pruebas
  instantáneas.
- **Cambios locales del usuario:** los archivos ya modificados de autenticación,
  plantillas y UI quedan fuera de todos los commits de esta fase.

## Puerta de salida

La implementación y auditoría técnica quedan listas cuando el keepalive se
ejecuta correctamente desde GitHub, todas las pruebas locales y remotas pasan y
la aplicación publicada conserva HTTPS y sus cabeceras. La Fase 9 solo se cierra
después de que un negocio piloto complete siete días sin intervención manual en
la base y el mensaje de WhatsApp se verifique en un celular real.
