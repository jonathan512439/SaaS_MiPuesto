import { describe, expect, it } from "vitest";

import { sembrarRubro } from "./sembrar";

/* Un cliente de mentira, lo más chico posible: `sembrarRubro` solo cuenta
   categorías y escribe filas, así que alcanza con eso. Se usa uno propio en vez
   de tocar la base porque lo que se persigue acá es una **decisión** —sembrar o
   no— y no que Postgres sepa insertar.
 *
 * Guarda todo lo escrito para poder revisarlo después. */
function clienteFalso({ categoriasExistentes = 0 } = {}) {
  const escrito: Record<string, unknown[]> = {};

  const cliente = {
    from(tabla: string) {
      return {
        select(_columnas: string, opciones?: { count?: string; head?: boolean }) {
          if (opciones?.head) {
            return {
              eq: async () => ({ count: categoriasExistentes, error: null }),
            };
          }
          /* El `select` que sigue a un `insert`: devuelve lo que se acaba de
             escribir, con un id inventado pero estable. */
          const filas = (escrito[tabla] ?? []).map((fila, indice) => ({
            ...(fila as Record<string, unknown>),
            id: `${tabla}-${indice}`,
          }));
          return Promise.resolve({ data: filas, error: null });
        },
        insert(filas: unknown[]) {
          escrito[tabla] = [...(escrito[tabla] ?? []), ...filas];
          return {
            select: (columnas: string) => cliente.from(tabla).select(columnas),
            then: (resolver: (valor: { error: null }) => unknown) => resolver({ error: null }),
          };
        },
      };
    },
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return { cliente: cliente as any, escrito };
}

describe("sembrar el catálogo de un rubro", () => {
  it("crea las categorías, sus campos y sus recursos", async () => {
    const { cliente, escrito } = clienteFalso();
    const resultado = await sembrarRubro(cliente, "negocio-1", "veterinaria");

    expect(resultado).toEqual({ sembro: true, categorias: 7, atributos: 7, recursos: 3 });
    expect(escrito.categorias).toHaveLength(7);
    /* Tres categorías de tiempo, tres recursos y tres agendas: el calendario
       cuelga del recurso, así que una categoría de tiempo sin recurso deja al
       cliente mirando un calendario vacío. */
    expect(escrito.recursos).toHaveLength(3);
    expect(escrito.agenda_recurso).toHaveLength(3);
  });

  /* Es la regla que más importa. El caso real es el dueño que vuelve al paso 2
     para releer el aviso del rubro y guarda de nuevo: sembrar ahí le duplicaría
     las categorías y le pisaría los nombres que ya cambió. */
  it("no siembra nada si el negocio ya tiene catálogo", async () => {
    const { cliente, escrito } = clienteFalso({ categoriasExistentes: 3 });
    const resultado = await sembrarRubro(cliente, "negocio-1", "veterinaria");

    expect(resultado).toEqual({ sembro: false, motivo: "ya-tenia-catalogo" });
    expect(escrito.categorias).toBeUndefined();
    expect(escrito.recursos).toBeUndefined();
  });

  /* Cuatro de los diez rubros no tienen siembra, y eso no es un error: se les
     arma cuando llegue el primer cliente de ese rubro. Elegirlos tiene que
     seguir funcionando, con el catálogo en blanco. */
  it("no falla con un rubro sin siembra", async () => {
    const { cliente, escrito } = clienteFalso();
    expect(await sembrarRubro(cliente, "negocio-1", "belleza")).toEqual({
      sembro: false,
      motivo: "sin-siembra",
    });
    expect(escrito.categorias).toBeUndefined();
  });

  it("no le pone agenda a las categorías que venden cosas", async () => {
    const { cliente, escrito } = clienteFalso();
    const resultado = await sembrarRubro(cliente, "negocio-1", "ferreteria");

    expect(resultado).toEqual({ sembro: true, categorias: 6, atributos: 13, recursos: 0 });
    expect(escrito.recursos).toBeUndefined();
    expect(escrito.agenda_recurso).toBeUndefined();
  });

  /* Lo sembrado es del dueño desde el primer segundo, así que va visible y sin
     ninguna marca de «esto lo puso el sistema». */
  it("deja las categorías visibles y numeradas en orden", async () => {
    const { cliente, escrito } = clienteFalso();
    await sembrarRubro(cliente, "negocio-1", "restaurante");

    const categorias = escrito.categorias as Array<{ orden: number; visible: boolean }>;
    expect(categorias.map(({ orden }) => orden)).toEqual([1, 2, 3, 4]);
    expect(categorias.every(({ visible }) => visible)).toBe(true);
  });
});
