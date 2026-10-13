import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* La revisión semanal de archivos solo lee.
 *
 * Corre con la clave de la base de producción, cada semana y sin nadie
 * mirando: un borrado que se cuele acá borra fotos de clientes. Lo que hay que
 * borrar —archivos sin uso— se borra a mano, después de mirar el informe. La
 * lógica se prueba en ensayo con `npm run test:archivos:ensayo`. */

const RAIZ = join(import.meta.dirname, "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8");

describe("revisión de archivos", () => {
  it("el script no borra ni escribe en la base ni en Storage", () => {
    const script = leer("scripts/revisar-archivos.mjs");
    expect(script).not.toMatch(/\.remove\(|\.delete\(|\.update\(|\.upsert\(|\.insert\(/);
    expect(script).toContain("select * from public.revisar_archivos_storage();");
  });

  it("la función de la base solo lee", () => {
    const sql = leer("supabase/migrations/20261108090000_revisar_archivos_de_storage.sql").replace(/--.*$/gm, "");
    const cuerpo = sql.slice(sql.indexOf("as $$"), sql.lastIndexOf("$$;"));
    expect(cuerpo).not.toMatch(/\b(insert|update|delete|truncate|drop)\b/i);
    expect(sql).toMatch(/\bstable\b/);
  });

  it("corre cada semana contra producción y avisa si falla", () => {
    const flujo = leer(".github/workflows/revisar-archivos.yml");
    expect(flujo).toMatch(/cron: "0 13 \* \* 1"/);
    expect(flujo).toContain("REVISAR_DB_URL: ${{ secrets.SUPABASE_DB_URL }}");
    expect(flujo).toContain("npm run archivos:revisar");
  });
});
