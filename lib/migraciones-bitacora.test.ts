import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* `admin_cambiar_foto_ia` insertó en `actor_user_id`, una columna que no existe:
   la tabla la llama `actor`. Postgres no valida los nombres de columna de un
   `insert` dentro de una función hasta ejecutarla, así que la función se creó
   sin protestar y falló **todas** las veces que se usó. Ni el compilador ni
   `supabase db lint` lo ven; se descubrió con el botón roto en producción.

   Este control compara las columnas de cada `insert` contra las de la tabla,
   leyendo las dos cosas de las migraciones. */
const CARPETA = join(import.meta.dirname, "..", "supabase", "migrations");
const MARCA_FUNCION = "create or replace function public.";
const FIN_FUNCION = "\n$$;";

function todoElSql(): string {
  return readdirSync(CARPETA)
    .filter((nombre) => nombre.endsWith(".sql"))
    .sort()
    .map((nombre) => readFileSync(join(CARPETA, nombre), "utf8"))
    .join("\n");
}

/* Una función arreglada se reescribe en una migración nueva y la vieja queda
   como historia. Comparar contra todas las migraciones marcaría para siempre el
   error ya corregido, así que de cada función se queda la última definición.
   El resto del SQL —inserciones sueltas, disparadores— se conserva entero. */
function sqlVigente(fuente: string): string {
  const ultimaPorNombre = new Map<string, string>();
  const fuera: string[] = [];
  let desde = 0;

  for (;;) {
    const inicio = fuente.indexOf(MARCA_FUNCION, desde);
    if (inicio === -1) {
      fuera.push(fuente.slice(desde));
      break;
    }

    const fin = fuente.indexOf(FIN_FUNCION, inicio);
    if (fin === -1) {
      fuera.push(fuente.slice(desde));
      break;
    }

    fuera.push(fuente.slice(desde, inicio));
    const cuerpo = fuente.slice(inicio, fin + FIN_FUNCION.length);
    const abre = cuerpo.indexOf("(", MARCA_FUNCION.length);
    ultimaPorNombre.set(cuerpo.slice(MARCA_FUNCION.length, abre).trim(), cuerpo);
    desde = fin + FIN_FUNCION.length;
  }

  return [...fuera, ...ultimaPorNombre.values()].join("\n");
}

function columnasDeTabla(fuente: string, tabla: string): Set<string> {
  const inicio = fuente.indexOf(`create table public.${tabla} (`);
  if (inicio === -1) throw new Error(`No se encontró la tabla ${tabla}.`);
  const cuerpo = fuente.slice(fuente.indexOf("(", inicio) + 1, fuente.indexOf("\n);", inicio));
  return new Set(
    cuerpo
      .split("\n")
      .map((linea) => linea.trim().split(/[\s(]/)[0])
      .filter((nombre) => /^[a-z_]+$/.test(nombre)),
  );
}

function columnasDeInserts(fuente: string, tabla: string): string[][] {
  const marca = `insert into public.${tabla} (`;
  const listas: string[][] = [];
  let desde = fuente.indexOf(marca);

  while (desde !== -1) {
    const abre = desde + marca.length;
    const cierra = fuente.indexOf(")", abre);
    listas.push(fuente.slice(abre, cierra).split(",").map((nombre) => nombre.trim()));
    desde = fuente.indexOf(marca, cierra);
  }

  return listas;
}

describe("bitacora_plataforma", () => {
  const vigente = sqlVigente(todoElSql());

  it("todas las inserciones usan columnas que existen", () => {
    const columnas = columnasDeTabla(vigente, "bitacora_plataforma");
    const inserts = columnasDeInserts(vigente, "bitacora_plataforma");

    /* Si el recorte dejara de encontrar inserciones, la prueba pasaría sin
       comprobar nada. Las cuatro que hay son el piso. */
    expect(inserts.length).toBeGreaterThanOrEqual(4);

    for (const lista of inserts) {
      for (const columna of lista) {
        expect(columnas.has(columna), `«${columna}» no existe en bitacora_plataforma`).toBe(true);
      }
    }
  });
});
