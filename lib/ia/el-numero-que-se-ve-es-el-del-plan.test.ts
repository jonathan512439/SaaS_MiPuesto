import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = join(import.meta.dirname, "..", "..");
const CARPETAS = ["app", "components"];

/* Las dos pantallas que hablan del techo del sistema **a propósito**, y por qué.
 *
 * No son excepciones cómodas: las dos dicen explícitamente que ese número es el
 * límite técnico y no el del cliente. Cualquier otra pantalla que lo muestre le
 * está diciendo al dueño un número que no compró. */
const PUEDEN_NOMBRARLO: ReadonlyArray<{ archivo: string; motivo: string }> = [
  {
    archivo: "app/(legal)/terminos/page.tsx",
    motivo: "declara el techo del sistema como tal, aparte del cupo de cada plan",
  },
  {
    archivo: "components/plataforma/uso-ia.tsx",
    motivo: "es la pantalla de la cuota compartida de Google, que mira la plataforma",
  },
];

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) return archivos(ruta);
    if (![".ts", ".tsx"].includes(extname(entrada.name))) return [];
    return [ruta];
  });
}

/* El número que ve el dueño es el de su plan.
 *
 * Esto se rompió entero y en silencio. Cuando el cupo pasó a salir del plan se
 * actualizaron dos pantallas y quedaron cuatro diciendo «de 200»: el formulario
 * de producto, la herramienta de cargar desde una foto, la tabla de consumo de
 * la plataforma y los términos.
 *
 * El daño no es cosmético. Un dueño del plan Catálogo leía «te quedan 190 de
 * 200» y se chocaba con el tope en la décima, sin entender por qué. Y lo peor:
 * **ninguna de las cuatro fallaba**. Compilaban, pasaban las pruebas, se veían
 * bien, y decían un número que no era el suyo.
 *
 * La regla es simple: fuera de las dos pantallas que hablan del techo técnico a
 * propósito, nadie nombra `TOPE_FOTOS_POR_MES`. El cupo sale de `cupoDelPlan`.
 */
describe("el cupo que se muestra", () => {
  it("ninguna pantalla muestra el techo del sistema como si fuera el del cliente", () => {
    const permitidos = new Set(PUEDEN_NOMBRARLO.map(({ archivo }) => archivo));

    const infractores = CARPETAS.flatMap((carpeta) => archivos(join(RAIZ, carpeta)))
      .map((ruta) => relative(RAIZ, ruta).replaceAll("\\", "/"))
      .filter((ruta) => !ruta.endsWith(".test.ts") && !ruta.endsWith(".test.tsx"))
      .filter((ruta) => !permitidos.has(ruta))
      .filter((ruta) => readFileSync(join(RAIZ, ruta), "utf8").includes("TOPE_FOTOS_POR_MES"));

    expect(
      infractores,
      "usá cupoDelPlan(plan, TOPE_FOTOS_POR_DIA).mensual; si de verdad tiene que decir el techo del sistema, sumalo a PUEDEN_NOMBRARLO con su motivo",
    ).toEqual([]);
  });

  /* Y las dos que sí pueden nombrarlo tienen que seguir existiendo: si alguien
     las renombra, la lista deja de proteger nada y nadie se entera. */
  it("la lista de excepciones no tiene entradas muertas", () => {
    for (const { archivo, motivo } of PUEDEN_NOMBRARLO) {
      const contenido = readFileSync(join(RAIZ, archivo), "utf8");
      expect(contenido, `${archivo} ya no nombra el techo: sacalo de la lista`).toContain(
        "TOPE_FOTOS_POR_MES",
      );
      expect(motivo.length, `${archivo} necesita un motivo escrito`).toBeGreaterThan(20);
    }
  });
});
