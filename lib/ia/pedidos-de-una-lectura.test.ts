import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("../supabase/server", () => ({ crearClienteSupabaseServidor: vi.fn() }));
vi.mock("../supabase/admin", () => ({ crearClienteSupabaseAdmin: vi.fn() }));
vi.mock("../catalogo/servidor", () => ({ obtenerContextoAdminCatalogo: vi.fn() }));

import { INSTRUCCION_LISTA, instruccionDeCategoriasDelNegocio } from "./instrucciones";
import { productosDeLasTandas } from "./lectura-por-tandas";
import { registrarLlamadas } from "./servidor";

/* La lectura de un catálogo largo, contra los dos cortes que la dejaban a medias
 * (2026-11-19, el PDF de Ferrovolt: 181 productos, y llegaban 78 o 59).
 *
 * 1. **El tope de pedidos de Cloudflare.** En el plan gratuito, una visita hace
 *    50 pedidos hacia afuera como mucho. Anotar cada tanda al vuelo era un
 *    pedido más por tanda: treinta tandas, sesenta pedidos, y la lectura se
 *    cortaba siempre cerca de la llamada veinte.
 * 2. **Las categorías del negocio.** Leído desde una tienda de mochilas, el
 *    modelo marcaba como «no es una lista» las páginas de interruptores, y sus
 *    productos se tiraban. Medido con el PDF real: 147 con las categorías, 181
 *    sin ellas. */

const RUTA_LISTA = readFileSync(
  join(import.meta.dirname, "..", "..", "app", "api", "ia", "lista", "route.ts"),
  "utf8",
);

function adminDePrueba(alInsertar: (filas: unknown) => Promise<{ error: { message: string } | null }>) {
  const from = vi.fn(() => ({ insert: alInsertar }));
  return { admin: { from } as never, from };
}

describe("anotar las llamadas de una lectura", () => {
  it("anota todas en un solo pedido", async () => {
    const insertar = vi.fn(async () => ({ error: null }));
    const { admin, from } = adminDePrueba(insertar);
    await registrarLlamadas(admin, "negocio-1", "lista", [
      { tokens: 4200, exito: true },
      { tokens: 0, exito: false },
      { tokens: 2600.4, exito: true },
    ]);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("llamadas_ia");
    expect(insertar).toHaveBeenCalledTimes(1);
    expect(insertar).toHaveBeenCalledWith([
      { negocio_id: "negocio-1", herramienta: "lista", tokens: 4200, exito: true },
      { negocio_id: "negocio-1", herramienta: "lista", tokens: 0, exito: false },
      { negocio_id: "negocio-1", herramienta: "lista", tokens: 2600, exito: true },
    ]);
  });

  it("sin llamadas no hace ningún pedido", async () => {
    const insertar = vi.fn(async () => ({ error: null }));
    const { admin, from } = adminDePrueba(insertar);
    await registrarLlamadas(admin, "negocio-1", "lista", []);
    expect(from).not.toHaveBeenCalled();
  });

  it("si no puede anotar, no tumba la lectura, pero lo escribe en el registro", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { admin } = adminDePrueba(async () => {
      throw new Error("Too many subrequests.");
    });
    await expect(
      registrarLlamadas(admin, "negocio-1", "lista", [{ tokens: 1, exito: true }]),
    ).resolves.toBeUndefined();
    expect(registro).toHaveBeenCalledWith(expect.stringContaining("Too many subrequests"));
    registro.mockRestore();
  });

  it("la ruta de lista anota una sola vez, después de leer todas las tandas", () => {
    expect(RUTA_LISTA).not.toMatch(/registrarLlamada\(/);
    const anotaciones = RUTA_LISTA.match(/await registrarLlamadas\(/g) ?? [];
    expect(anotaciones).toHaveLength(1);
    expect(RUTA_LISTA.indexOf("await registrarLlamadas(")).toBeGreaterThan(
      RUTA_LISTA.indexOf("await leerPorTandas("),
    );
  });
});

describe("los productos de un PDF leído por tandas", () => {
  const tandas = [
    { es_lista_de_productos: true, productos: ["Placa 1P"] },
    /* Páginas de interruptores leídas desde un negocio de mochilas. */
    { es_lista_de_productos: false, productos: ["Térmico 3P 63A"] },
    { es_lista_de_productos: true, productos: undefined },
  ];

  it("no tira una tanda porque el modelo la marcó como «no es una lista»", () => {
    expect(productosDeLasTandas(tandas, true)).toEqual(["Placa 1P", "Térmico 3P 63A"]);
  });

  it("en una foto, la marca sí manda: lo de una estantería no se ofrece", () => {
    expect(productosDeLasTandas(tandas, false)).toEqual(["Placa 1P"]);
  });
});

describe("la instrucción no ata la lista al rubro del negocio", () => {
  it("«es una lista» se decide por el documento, no por lo que vende el negocio", () => {
    expect(INSTRUCCION_LISTA).not.toMatch(/productos que el negocio vende/);
    expect(INSTRUCCION_LISTA).toMatch(/NUNCA por el rubro del negocio/);
  });

  it("un producto que no encaja en ninguna categoría se devuelve igual", () => {
    expect(instruccionDeCategoriasDelNegocio(["Mochilas escolares"])).toMatch(/se devuelve igual/);
  });
});
