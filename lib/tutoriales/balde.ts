import { env } from "cloudflare:workers";

import type { BaldeTutoriales } from "./archivos";

/* El balde de R2 de los tutoriales, conectado al Worker en `wrangler.jsonc`
   (`TUTORIALES`). Este archivo es lo único que toca lo propio de Workers: así
   el resto se prueba sin Cloudflare.

   Puede faltar —una copia local sin el balde conectado—, y entonces las rutas
   lo dicen en vez de romperse. */
export function baldeTutoriales(): BaldeTutoriales | null {
  return env.TUTORIALES ?? null;
}

/* R2 solo acepta un flujo del que sabe el largo; este además corta si llega
   otra cantidad. */
export const largoFijo = (largo: number) => new FixedLengthStream(largo);
