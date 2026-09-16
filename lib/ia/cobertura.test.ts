import { describe, expect, it } from "vitest";

import {
  informeDeCobertura,
  type CampoDeCategoria,
  type ProductoLeidoConDatos,
} from "./cobertura";

/* «El informe de cobertura cuenta bien los faltantes», dice el plan. Cuenta mal
 * en tres formas distintas, y las tres se ven iguales desde afuera —un número—:
 * contar sobre las categorías equivocadas, contar un valor vacío como completo,
 * y contar productos de una categoría dentro de otra. */

const CAMPOS = new Map<string, CampoDeCategoria[]>([
  [
    "repuestos",
    [
      { clave: "marca", nombre: "Marca" },
      { clave: "modelo", nombre: "Modelo" },
    ],
  ],
  ["bebidas", [{ clave: "volumen", nombre: "Volumen" }]],
]);

function producto(cambios: Partial<ProductoLeidoConDatos> = {}): ProductoLeidoConDatos {
  return { categoria: "Repuestos", precio: 10, descripcion: "", datos: [], ...cambios };
}

describe("el informe de cobertura", () => {
  it("cuenta cuántos productos de cada categoría trajeron cada dato", () => {
    const informe = informeDeCobertura(
      [
        producto({ datos: [{ clave: "marca", valor: "Bosch" }] }),
        producto({ datos: [{ clave: "marca", valor: "NGK" }] }),
        producto({ datos: [] }),
      ],
      CAMPOS,
    );

    const marca = informe.campos.find((campo) => campo.clave === "marca");
    expect(marca).toMatchObject({ categoria: "Repuestos", productos: 3, completos: 2 });
  });

  it("un valor vacío no cuenta como completo", () => {
    /* El modelo devuelve la clave con la cadena vacía cuando no encontró el
       dato. Contarla sería informar una cobertura que no existe, que es peor
       que no informar nada: el dueño confía y no revisa. */
    const informe = informeDeCobertura(
      [
        producto({ datos: [{ clave: "marca", valor: "   " }] }),
        producto({ datos: [{ clave: "marca", valor: "" }] }),
      ],
      CAMPOS,
    );

    expect(informe.campos).toEqual([]);
    expect(informe.vacios.find((campo) => campo.clave === "marca")).toMatchObject({
      productos: 2,
      completos: 0,
    });
  });

  it("separa lo que vino a medias de lo que no vino nunca", () => {
    /* No son el mismo problema. «La marca en 2 de 3» se arregla completando dos
       productos; «el modelo en 0 de 3» quiere decir que esa columna no está en
       la lista, y lo que hay que revisar es la lista, no los productos. */
    const informe = informeDeCobertura(
      [
        producto({ datos: [{ clave: "marca", valor: "Bosch" }] }),
        producto({ datos: [{ clave: "marca", valor: "NGK" }] }),
        producto(),
      ],
      CAMPOS,
    );

    expect(informe.campos.map(({ clave }) => clave)).toEqual(["marca"]);
    expect(informe.vacios.map(({ clave }) => clave)).toEqual(["modelo"]);
  });

  it("no mezcla los productos de una categoría con los de otra", () => {
    const informe = informeDeCobertura(
      [
        producto({ categoria: "Repuestos", datos: [{ clave: "marca", valor: "Bosch" }] }),
        producto({ categoria: "Bebidas", datos: [{ clave: "volumen", valor: "500 ml" }] }),
        producto({ categoria: "Bebidas", datos: [] }),
      ],
      CAMPOS,
    );

    expect(informe.campos.find((campo) => campo.clave === "marca")).toMatchObject({
      productos: 1,
      completos: 1,
    });
    expect(informe.campos.find((campo) => campo.clave === "volumen")).toMatchObject({
      productos: 2,
      completos: 1,
    });
  });

  it("empareja la categoría como lo hace la pantalla de revisión", () => {
    /* La lista escribe «REPUESTOS» y el negocio tiene «Repuestos». Si acá se
       compararan distinto, el informe hablaría de una categoría y la
       importación usaría otra. */
    const informe = informeDeCobertura(
      [producto({ categoria: "  REPUESTOS ", datos: [{ clave: "marca", valor: "Bosch" }] })],
      CAMPOS,
    );

    expect(informe.campos.find((campo) => campo.clave === "marca")?.completos).toBe(1);
  });

  it("no informa sobre categorías que el negocio todavía no tiene", () => {
    /* Se van a crear vacías, sin campos: decir que les falta algo sería
       inventarle al dueño un problema que no existe. */
    const informe = informeDeCobertura([producto({ categoria: "Herramientas" })], CAMPOS);

    expect(informe.campos).toEqual([]);
    expect(informe.vacios).toEqual([]);
    expect(informe.productos).toBe(1);
  });

  it("no informa sobre categorías de las que no se leyó ningún producto", () => {
    const informe = informeDeCobertura(
      [producto({ categoria: "Repuestos", datos: [{ clave: "marca", valor: "Bosch" }] })],
      CAMPOS,
    );

    expect(informe.campos.some(({ clave }) => clave === "volumen")).toBe(false);
    expect(informe.vacios.some(({ clave }) => clave === "volumen")).toBe(false);
  });

  it("pone primero lo que más falta", () => {
    const informe = informeDeCobertura(
      [
        producto({
          datos: [
            { clave: "marca", valor: "Bosch" },
            { clave: "modelo", valor: "X" },
          ],
        }),
        producto({ datos: [{ clave: "marca", valor: "NGK" }] }),
      ],
      CAMPOS,
    );

    expect(informe.campos.map(({ clave }) => clave)).toEqual(["modelo", "marca"]);
  });

  it("cuenta las descripciones, que es lo que más se nota vacío en el catálogo", () => {
    const informe = informeDeCobertura(
      [producto({ descripcion: "Con filtro" }), producto({ descripcion: "" }), producto()],
      CAMPOS,
    );

    expect(informe.productos).toBe(3);
    expect(informe.conDescripcion).toBe(1);
  });

  it("una lista sin títulos de sección no produce informe de campos", () => {
    /* Sin categoría no hay campos que esperar. El informe sigue existiendo para
       contar productos y descripciones. */
    const informe = informeDeCobertura(
      [producto({ categoria: "" }), producto({ categoria: "  " })],
      CAMPOS,
    );

    expect(informe.campos).toEqual([]);
    expect(informe.vacios).toEqual([]);
    expect(informe.productos).toBe(2);
  });
});
