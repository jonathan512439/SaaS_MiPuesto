import { env } from "cloudflare:workers";

import type { BaldeTutoriales } from "./archivos";

/* El balde de R2 de los tutoriales, conectado al Worker en `wrangler.jsonc`
   (`TUTORIALES`). Es lo único que importa `cloudflare:workers`: así el resto se
   prueba sin Cloudflare.

   Puede faltar —una copia local sin el balde conectado—, y entonces la ruta
   responde que no hay archivo en vez de romperse. */
export function baldeTutoriales(): BaldeTutoriales | null {
  return env.TUTORIALES ?? null;
}
