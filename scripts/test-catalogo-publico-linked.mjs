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

/* Lo mismo con `productos`, que desde el 2026-11-15 también se concede columna
 * por columna (`20261120090000_el_visitante_lee_solo_lo_publicado.sql`): las
 * consultas de verdad del catálogo, con sus filtros y su orden, y las
 * presentaciones embebidas. Y al revés: el rastro de auditoría de los precios
 * **no** se tiene que poder leer.
 */
const columnas = readFileSync(new URL("../lib/catalogo/columnas.ts", import.meta.url), "utf8");
function constante(nombre) {
  const hallada = new RegExp(`const ${nombre} =\\s*"([^"]+)"`).exec(columnas);
  if (!hallada) throw new Error(`No se encontró ${nombre} en lib/catalogo/columnas.ts.`);
  return hallada[1];
}
const publico = constante("COLUMNAS_PRODUCTO_PUBLICO");
const impreso = constante("COLUMNAS_PRODUCTO_IMPRESO");
const presentaciones = constante("PRESENTACIONES_DEL_PRODUCTO");

const consultas = [
  [
    "la página del catálogo",
    visitante
      .from("productos")
      .select(`${publico},categorias(orden),${presentaciones}`, { count: "exact" })
      .eq("visible", true)
      .ilike("texto_busqueda", "%a%")
      .order("orden")
      .order("creado_en")
      .limit(1),
  ],
  ["la ficha de un producto", visitante.from("productos").select(`${publico},${presentaciones}`).eq("codigo", "NO-EXISTE").limit(1)],
  ["la hoja para imprimir", visitante.from("productos").select(impreso).eq("visible", true).order("orden").order("creado_en").limit(1)],
  ["el conteo por categoría", visitante.from("productos").select("id", { count: "exact", head: true }).eq("visible", true)],
];
for (const [nombre, consulta] of consultas) {
  const { error: errorProductos } = await consulta;
  if (errorProductos) {
    console.error(`\nLa consulta de ${nombre} falló como la haría un visitante:`);
    console.error(`  ${errorProductos.message}`);
    console.error(
      "\nProbablemente una columna de la consulta no está concedida al rol `anon`.\n" +
        "Se arregla con una migración:  grant select (la_columna) on public.productos to anon;",
    );
    process.exit(1);
  }
}

const NO_PUBLICAS = ["precio_actualizado_por", "precio_actualizado_en", "precio_anterior"];
const abiertas = [];
for (const columna of NO_PUBLICAS) {
  const { error: errorAuditoria } = await visitante.from("productos").select(columna).limit(1);
  if (errorAuditoria?.code !== "42501") abiertas.push(columna);
}
if (abiertas.length > 0) {
  console.error(
    `\nUn visitante puede leer de \`productos\`: ${abiertas.join(", ")}.\n` +
      "Es el rastro de auditoría de los precios, y no se publica.\n" +
      "Falta aplicar 20261120090000_el_visitante_lee_solo_lo_publicado.sql.",
  );
  process.exit(1);
}

/* Las presentaciones de un producto oculto o en la papelera no se leen: todas
   las que ve el visitante tienen que ser de un producto que también ve. */
const { count: todas } = await visitante.from("variantes_producto").select("id", { count: "exact", head: true });
const { count: deVisibles } = await visitante
  .from("variantes_producto")
  .select("id,productos!inner(id)", { count: "exact", head: true });
if (todas !== deVisibles) {
  console.error(
    `\nUn visitante lee ${todas} presentaciones, y solo ${deVisibles} son de productos a la vista.\n` +
      "Falta aplicar 20261120090000_el_visitante_lee_solo_lo_publicado.sql.",
  );
  process.exit(1);
}

console.log(
  `Catálogo público: correcto. ${campos.split(",").length} columnas del negocio y ` +
    `${publico.split(",").length} del producto legibles por un visitante; el rastro de precios, cerrado.`,
);
