import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/* «Atención y modalidad», como lo pidió el dueño el 2026-10-13: WhatsApp
 * arriba, después el carrito y al final el catálogo para mostrar. Y este
 * último no habla de WhatsApp: decía «se comunicarán contigo por WhatsApp» y
 * se entendía que tenía un botón para escribir, que no tiene. */

const codigo = readFileSync(join(import.meta.dirname, "formulario-negocio.tsx"), "utf8");
const bloque = (nombre: string) => codigo.slice(codigo.indexOf(`const ${nombre}`), codigo.indexOf("};", codigo.indexOf(`const ${nombre}`)));

describe("las modalidades del formulario", () => {
  it("van en el orden pedido", () => {
    const etiquetas = bloque("ETIQUETAS_MODALIDAD");
    const orden = ["catalogo_cta", "tienda_virtual", "catalogo_estatico"].map((clave) => etiquetas.indexOf(`${clave}:`));
    expect(orden.every((posicion) => posicion > -1)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });

  it("el catálogo para mostrar no menciona WhatsApp", () => {
    const explicaciones = bloque("EXPLICACIONES_MODALIDAD");
    const estatico = explicaciones.slice(explicaciones.indexOf("catalogo_estatico"), explicaciones.indexOf("catalogo_cta"));
    expect(estatico).toContain("descripcion");
    expect(estatico).not.toMatch(/whatsapp/i);
  });
});
