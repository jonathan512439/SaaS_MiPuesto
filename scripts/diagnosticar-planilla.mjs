import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

/* Cuenta qué le pasa a una planilla que el importador no pudo leer.
 *
 * Existe porque el error que ve el dueño —«no encontramos filas»— es el final
 * de una cadena larga, y desde acá no se puede mirar su archivo. Este script
 * corre **el mismo lector que usa la aplicación**, no una copia, y cuenta en
 * qué escalón se cortó. Sin él, arreglar un caso así es adivinar.
 *
 *   npm run planilla:diagnosticar -- "C:/ruta/a/mi lista.xlsx"
 */

/* El intérprete de TypeScript que trae Node exige la extensión en cada import,
   y el proyecto escribe `./valores` sin ella, como hace toda la aplicación. En
   vez de ensuciar el código de la aplicación para que este script ande, el
   enganche prueba agregando `.ts` cuando la resolución falla. Los imports van
   dinámicos porque los estáticos se resuelven antes de que esto corra. */
registerHooks({
  resolve(especificador, contexto, siguiente) {
    try {
      return siguiente(especificador, contexto);
    } catch (error) {
      if (!especificador.startsWith(".")) throw error;
      return siguiente(`${especificador}.ts`, contexto);
    }
  },
});

const { leerXlsx } = await import("../lib/importacion/xlsx.ts");
const { leerArchivoDePlanilla, productosDeLaPlanilla } = await import(
  "../lib/importacion/planilla.ts"
);

const ruta = process.argv[2];
if (!ruta) {
  console.error("Falta la ruta del archivo.");
  console.error('Uso: npm run planilla:diagnosticar -- "C:/ruta/a/mi lista.xlsx"');
  process.exit(1);
}

const bytes = readFileSync(ruta);
const contenido = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

console.log(`Archivo: ${ruta}`);
console.log(`Peso: ${(bytes.length / 1024).toFixed(1)} KB`);

/* Los primeros bytes dicen qué es de verdad, más allá de la extensión. Es lo
   primero que mira el importador y la causa más común de un rechazo temprano:
   un `.xlsx` que en realidad es un `.xls` viejo con el nombre cambiado. */
const firma = [...bytes.subarray(0, 4)].map((byte) => byte.toString(16).padStart(2, "0"));
const tipos = {
  "50 4b 03 04": "ZIP — o sea un .xlsx moderno (o un .docx, o un .odt)",
  "d0 cf 11 e0": "Excel del formato VIEJO (.xls). Hay que guardarlo como .xlsx",
  "25 50 44 46": "PDF, no una planilla",
};
console.log(`Primeros bytes: ${firma.join(" ")} → ${tipos[firma.join(" ")] ?? "texto (se leerá como CSV)"}`);
console.log("");

if (firma.join(" ") === "50 4b 03 04") {
  try {
    const { filas, hojasRevisadas } = await leerXlsx(contenido);
    console.log(`Hojas encontradas en el libro: ${hojasRevisadas}`);
    console.log(`Filas con datos: ${filas.length}`);
    if (filas.length > 0) {
      console.log("Primeras filas tal como las ve el importador:");
      for (const fila of filas.slice(0, 5)) console.log("  ", JSON.stringify(fila));
    } else {
      console.log("");
      console.log("Ninguna hoja del libro tiene filas. Lo que suele pasar:");
      console.log("  - el archivo es un .docx o un .odt con nombre de Excel;");
      console.log("  - la lista está en un libro distinto del que se subió;");
      console.log("  - la hoja tiene los datos en un objeto insertado y no en celdas.");
    }
  } catch (error) {
    console.log(`El lector de Excel cortó con: ${error.message}`);
  }
  console.log("");
}

/* La segunda mitad corre la cadena completa, que es lo que ve el dueño: incluye
   el mensaje exacto que le aparecería en pantalla y el mapeo de columnas que se
   le propondría. */
try {
  const lectura = await leerArchivoDePlanilla(new File([bytes], ruta.split(/[\\/]/).pop()));
  console.log("Columnas que propondría la pantalla:");
  console.log(`  nombre → columna ${lectura.mapeo.nombre}`);
  console.log(`  precio → columna ${lectura.mapeo.precio}`);
  console.log(`  descripción → ${lectura.mapeo.descripcion ?? "ninguna"}`);
  console.log(`  categoría → ${lectura.mapeo.categoria ?? "ninguna"}`);

  const { productos, descartadas } = productosDeLaPlanilla(lectura.filas, lectura.mapeo);
  console.log("");
  console.log(`Entrarían ${productos.length} producto(s), se descartarían ${descartadas} fila(s).`);
  for (const producto of productos.slice(0, 5)) {
    console.log(`   ${producto.nombre} — Bs ${producto.precio}`);
  }
} catch (error) {
  console.log(`Mensaje que vería el dueño en pantalla: «${error.message}»`);
}
