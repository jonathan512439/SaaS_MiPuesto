/* El catálogo público, consultado **como lo consulta un visitante**.
 *
 * Existe por una falla real que ninguna otra comprobación atrapó. `negocios` no
 * concede `select` sobre la tabla entera: concede **columna por columna** al rol
 * `anon`, para que el catálogo solo pueda leer lo que sale publicado. Es lo
 * correcto, pero tiene un filo: **una columna nueva no queda concedida sola**, y
 * pedirla en la consulta pública no devuelve la fila sin ella — hace fallar la
 * consulta entera con un error de permisos.
 *
 * Pasó en la fase 7 con `patron_opacidad` y `subnombre`. Desde ese despliegue
 * ningún catálogo público cargó, y **nada avisó**: el compilador no ve permisos,
 * las pruebas corren sin base, y la página seguía devolviendo 200 —con el cuerpo
 * vacío—, así que ni el código de estado lo delataba.
 *
 * Por eso esta prueba no arma una consulta propia: **lee la de verdad**, la que
 * usa el catálogo, del mismo archivo donde vive. Si alguien suma una columna
 * ahí y se olvida del `grant`, esto falla y dice cuál.
 *
 * Uso: npm run test:publico:linked
 */
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveAnonima =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !claveAnonima) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y la clave pública. Corré con --env-file-if-exists=.env.local.",
  );
}

/* Se lee del archivo en vez de importarlo: el módulo arrastra el cliente de
   servidor de Next y toda su cadena, que fuera de Next no levanta. */
const fuente = readFileSync(new URL("../lib/catalogo/negocio-publico.ts", import.meta.url), "utf8");
const encontrado = /const CAMPOS =\s*"([^"]+)"/.exec(fuente);
if (!encontrado) throw new Error("No se encontró CAMPOS en lib/catalogo/negocio-publico.ts.");
const campos = encontrado[1];

const visitante = createClient(url, claveAnonima, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await visitante
  .from("negocios")
  .select(campos)
  .eq("activo", true)
  .limit(1);

if (error) {
  console.error("\nLa consulta del catálogo público falló como la haría un visitante:");
  console.error(`  ${error.message}`);
  if (error.message.includes("permission denied")) {
    console.error(
      "\nProbablemente una columna nueva de la consulta no está concedida al rol `anon`.\n" +
        "Se arregla con una migración:  grant select (la_columna) on public.negocios to anon;",
    );
  }
  process.exit(1);
}

console.log(`Catálogo público: correcto. ${campos.split(",").length} columnas legibles por un visitante.`);
