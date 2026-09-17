import { describe, expect, it } from "vitest";

import { armarSecciones, posicionDelAnuncio } from "./secciones";
import type { CategoriaPlantilla, ProductoPlantilla } from "./tipos";

/* Las subcategorías del catálogo tienen seis reglas escritas en el plan, y cada
 * una está ahí porque evita algo concreto. Ninguna se ve fallar: el catálogo
 * sigue cargando igual con el subtítulo repetido, con un grupo vacío colgando o
 * con la cuenta mal. Lo que pasa es que el comprador ve un catálogo peor y nadie
 * se entera.
 */
function producto(id: string): ProductoPlantilla {
  return { id, nombre: id, precio: 10 } as ProductoPlantilla;
}

function categoria(cambios: Partial<CategoriaPlantilla> = {}): CategoriaPlantilla {
  return {
    id: "c1",
    nombre: "Bebidas",
    icono: "vaso",
    productos: [],
    ...cambios,
  } as CategoriaPlantilla;
}

describe("las secciones del catálogo", () => {
  it("los sueltos van primero y sin subtítulo", () => {
    /* Una categoría puede tener productos sueltos y agrupados a la vez.
       Inventarles un subtítulo le mostraría al comprador un problema de
       organización que es del dueño. */
    const [seccion] = armarSecciones([
      categoria({
        productos: [producto("suelto")],
        subcategorias: [{ id: "s1", nombre: "Gaseosas", productos: [producto("agrupado")] }],
      }),
    ]);

    expect(seccion.sueltos.map(({ id }) => id)).toEqual(["suelto"]);
    expect(seccion.grupos.map(({ nombre }) => nombre)).toEqual(["Gaseosas"]);
  });

  it("una subcategoría vacía no deja un subtítulo colgando", () => {
    /* Pasa con las que el dueño creó y todavía no llenó. */
    const [seccion] = armarSecciones([
      categoria({
        productos: [producto("uno")],
        subcategorias: [
          { id: "s1", nombre: "Gaseosas", productos: [] },
          { id: "s2", nombre: "Jugos", productos: [producto("dos")] },
        ],
      }),
    ]);

    expect(seccion.grupos.map(({ nombre }) => nombre)).toEqual(["Jugos"]);
  });

  it("la cuenta es la de la categoría entera y no la de cada grupo", () => {
    /* Para el comprador «Bebidas» tiene cuatro productos, no dos grupos. */
    const [seccion] = armarSecciones([
      categoria({
        productos: [producto("uno")],
        subcategorias: [
          { id: "s1", nombre: "Gaseosas", productos: [producto("dos"), producto("tres")] },
          { id: "s2", nombre: "Jugos", productos: [producto("cuatro")] },
        ],
      }),
    ]);

    expect(seccion.total).toBe(4);
  });

  it("una categoría sin nada no se dibuja", () => {
    /* Se filtra acá y no a mitad del dibujo: sin saber cuántas secciones hay de
       verdad, no se puede poner el anuncio «a la mitad». */
    expect(
      armarSecciones([
        categoria({ id: "vacia", productos: [], subcategorias: [] }),
        categoria({ id: "llena", productos: [producto("uno")] }),
      ]).map(({ categoria: c }) => c.id),
    ).toEqual(["llena"]);
  });

  it("una categoría que solo tiene subcategorías sí se dibuja", () => {
    /* El caso del dueño ordenado: todo asignado a alguna subcategoría y nada
       suelto. Contando solo los sueltos, su categoría desaparecía entera. */
    const secciones = armarSecciones([
      categoria({
        productos: [],
        subcategorias: [{ id: "s1", nombre: "Gaseosas", productos: [producto("uno")] }],
      }),
    ]);

    expect(secciones).toHaveLength(1);
    expect(secciones[0].total).toBe(1);
  });

  it("las categorías que el sistema inventa no traen subgrupos", () => {
    /* «Otros» y la carta del día las arma el sistema y no tienen subcategorías.
       No pueden quedar con un subtítulo vacío. */
    const [otros] = armarSecciones([
      categoria({ id: "otros", nombre: "Otros", productos: [producto("uno")] }),
    ]);

    expect(otros.grupos).toEqual([]);
    expect(otros.sueltos).toHaveLength(1);
  });

  it("cada producto sabe en qué categoría y en qué grupo quedó", () => {
    /* Lo usa el mensaje de WhatsApp y la ficha: un producto que no sabe de dónde
       salió obliga a buscarlo de nuevo. */
    const [seccion] = armarSecciones([
      categoria({
        productos: [producto("suelto")],
        subcategorias: [{ id: "s1", nombre: "Gaseosas", productos: [producto("agrupado")] }],
      }),
    ]);

    expect(seccion.sueltos[0]).toMatchObject({ categoria: "Bebidas", subcategoria: null });
    expect(seccion.grupos[0].productos[0]).toMatchObject({
      categoria: "Bebidas",
      subcategoria: "Gaseosas",
    });
  });
});

describe("dónde cae el banner de publicidad", () => {
  /* La prueba que faltaba: el catálogo crece mientras la persona baja, y la
     posición del anuncio no puede cambiar por eso. Antes cambiaba —se contaba
     desde el final— y el banner saltaba de lugar arrastrando las tarjetas. */
  it("no se mueve cuando llegan más secciones al bajar", () => {
    const tandas = [2, 3, 4, 5, 8, 13].map((cantidad) => posicionDelAnuncio(cantidad));
    expect(new Set(tandas).size).toBe(1);
    expect(tandas[0]).toBe(1);
  });

  it("con una sola sección va después de ella, y sin secciones no va", () => {
    expect(posicionDelAnuncio(1)).toBe(0);
    expect(posicionDelAnuncio(0)).toBe(-1);
  });
});
