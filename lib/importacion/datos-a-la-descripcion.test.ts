import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { Atributo } from "../catalogo/atributos";
import { camposDeCategoriaNueva } from "./diseno-de-categoria";
import { LARGO_MAXIMO_DESCRIPCION, datosALaDescripcion } from "./datos-a-la-descripcion";
import { valoresDesdePlanilla } from "./datos-de-planilla";

/* Lo que no entra como campo va a la descripción, y no se pierde. */

describe("los datos sin campo, a la descripción", () => {
  it("se agregan al final, después de lo que ya decía", () => {
    const { descripcion, agregados, sinLugar } = datosALaDescripcion("Para tableros industriales.", [
      { titulo: "Potencia de motor", valor: "5,5 kW." },
      { titulo: "Posiciones", valor: "3" },
    ]);
    expect(descripcion).toBe("Para tableros industriales.\n\nPotencia de motor: 5,5 kW · Posiciones: 3");
    expect(agregados).toBe(2);
    expect(sinLugar).toBe(0);
  });

  it("sin descripción, los datos son la descripción", () => {
    expect(datosALaDescripcion("", [{ titulo: "Cierre", valor: "Con llave" }]).descripcion).toBe(
      "Cierre: Con llave",
    );
  });

  /* La descripción es pública: el costo o el código del dueño no pueden
     terminar a la vista del cliente. */
  it("nunca lleva lo interno: costo, código, proveedor", () => {
    const { descripcion, agregados } = datosALaDescripcion("", [
      { titulo: "Costo", valor: "12" },
      { titulo: "Código", valor: "10-0021" },
      { titulo: "Proveedor", valor: "Importadora X" },
      { titulo: "Función", valor: "Arranque directo" },
    ]);
    expect(descripcion).toBe("Función: Arranque directo");
    expect(agregados).toBe(1);
  });

  it("no repite un dato que ya está escrito, ni uno vacío", () => {
    const { descripcion, agregados } = datosALaDescripcion("Función: Arranque directo", [
      { titulo: "Función", valor: "Arranque directo" },
      { titulo: "Contacto", valor: "  " },
    ]);
    expect(descripcion).toBe("Función: Arranque directo");
    expect(agregados).toBe(0);
  });

  /* Pasar de mil caracteres hace que la ruta rechace el producto entero:
     mejor un dato menos, y avisado, que el producto perdido. */
  it("no pasa del máximo de la descripción, y cuenta lo que quedó afuera", () => {
    const larga = "x".repeat(LARGO_MAXIMO_DESCRIPCION - 30);
    const { descripcion, agregados, sinLugar } = datosALaDescripcion(larga, [
      { titulo: "Marca", valor: "Schneider" },
      { titulo: "Tensión de aislamiento", valor: "690 V" },
    ]);
    expect(descripcion.length).toBeLessThanOrEqual(LARGO_MAXIMO_DESCRIPCION);
    expect(agregados).toBe(1);
    expect(sinLugar).toBe(1);
  });
});

/* El caso que lo motivó, armado con las piezas de verdad: una familia con más
   datos distintos que el tope de campos. Antes, lo que pasaba de diez se
   salteaba en silencio. */
describe("una familia con más datos que campos", () => {
  const titulos = [
    "Marca", "Tipo", "Tipo de rosca", "Contactos", "Fijación", "Modelo", "Corriente nominal",
    "Tipo de montaje", "Corriente ajustable", "Configuración", "Potencia de motor", "Posiciones",
  ];
  const ficha = Object.fromEntries(titulos.map((titulo, i) => [titulo, `valor ${i + 1}`]));

  it("lo que no entra como campo termina en la descripción, sin perder ninguno", () => {
    const campos: Atributo[] = camposDeCategoriaNueva([{ campos: ficha }]).map((campo) => ({
      ...campo,
      clave: campo.nombre.toLowerCase().replace(/ /g, "_"),
      obligatorio: false,
      enResumen: false,
    }));
    expect(campos).toHaveLength(10);

    const { valores, sinCampo } = valoresDesdePlanilla(campos, ficha);
    const { descripcion } = datosALaDescripcion("", sinCampo);
    expect(Object.keys(valores)).toHaveLength(10);
    expect(descripcion).toBe("Potencia de motor: valor 11 · Posiciones: valor 12");
  });
});

/* La revisión es la que crea los productos: si dejara de usar esto, los datos
   volverían a perderse sin que ninguna otra prueba lo note. */
describe("la revisión de productos", () => {
  const revision = readFileSync(
    join(import.meta.dirname, "..", "..", "components", "catalogo", "revision-de-productos.tsx"),
    "utf8",
  );

  it("manda la descripción con los datos sin campo, y avisa cuántos fueron", () => {
    expect(revision).toMatch(/datosALaDescripcion\(producto\.descripcion, deLaPlanilla\.sinCampo\)/);
    expect(revision).toMatch(/descripcion: conDatos\.descripcion \|\| null/);
    expect(revision).toMatch(/se agregaron al final de la descripción/);
  });
});
