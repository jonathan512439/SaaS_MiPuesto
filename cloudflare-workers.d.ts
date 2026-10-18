/* Los recursos de Cloudflare conectados al Worker (`wrangler.jsonc`), como los
   expone vinext: `import { env } from "cloudflare:workers"`.

   Se declara a mano y solo lo que se usa, en vez de sumar los tipos completos
   de Workers: esos redefinen `Request`, `Response` y compañía, y chocan con los
   del navegador que usa el resto del proyecto. Un recurso nuevo en
   `wrangler.jsonc` se suma también acá. */
/* Propio de Workers: un flujo que exige un largo exacto. R2 lo necesita para
   recibir un archivo sin juntarlo entero en memoria. */
declare class FixedLengthStream extends TransformStream<Uint8Array, Uint8Array> {
  constructor(largo: number | bigint);
}

declare module "cloudflare:workers" {
  export const env: {
    TUTORIALES?: import("@/lib/tutoriales/archivos").BaldeTutoriales;
  };
}
